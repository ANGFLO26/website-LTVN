import { BadRequestException, Inject, Injectable, Logger, Optional, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';
import { isValidUuid } from '../../common/uuid.util.js';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import { users, passwordResetTokens } from '../../database/schema.js';
import { EMAIL_SENDER, type IEmailSender } from '../email/email-sender.interface.js';
import {
  getAdminPublicUrl,
  getLockoutPolicy,
  getPasswordResetTokenTtlMinutes,
  validatePasswordStrength,
} from './auth.config.js';
import type { AdminIdentity } from './auth.types.js';

type Account = typeof users.$inferSelect;

function isActiveAdmin(user: Account | undefined): user is Account {
  return !!user && user.role === 'admin' && user.status === 'active' && !user.deletedAt;
}

function identity(user: Account): AdminIdentity {
  return { id: user.id, email: user.email, fullName: user.fullName, role: 'admin' };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Optional() private readonly configService?: ConfigService,
    @Optional() @Inject(EMAIL_SENDER) private readonly emailSender?: IEmailSender,
  ) {}


  async login(body: unknown) {
    if (!body || typeof body !== 'object' || !('email' in body) || !('password' in body)) {
      throw new UnauthorizedException();
    }
    const { email, password } = body;
    if (typeof email !== 'string' || !email.trim() || email.length > 255 ||
        typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
      throw new UnauthorizedException();
    }
    const user = await this.db.query.users.findFirst({
      where: sql`lower(${users.email}) = ${email.trim().toLowerCase()}`,
    });
    // Existing placeholder hashes are not credentials. Never create/reset one here.
    if (!isActiveAdmin(user) || !/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(user.passwordHash)) {
      throw new UnauthorizedException();
    }

    const now = new Date();

    // 1. Check if account is currently locked (active lockout)
    if (user.lockedUntil !== null && user.lockedUntil > now) {
      throw new UnauthorizedException('Account is temporarily locked due to failed login attempts.');
    }

    // 2. Validate password
    let validPassword = false;
    try {
      validPassword = await compare(password, user.passwordHash);
    } catch {
      validPassword = false;
    }

    // 3. Handle password validation result
    if (!validPassword) {
      const policy = getLockoutPolicy(this.configService);
      const lockUntilDate = new Date(now.getTime() + policy.lockoutDurationMs);
      const nowIso = now.toISOString();
      const lockUntilIso = lockUntilDate.toISOString();

      await this.db
        .update(users)
        .set({
          failedLoginAttempts: sql`CASE
            WHEN ${users.lockedUntil} IS NOT NULL AND ${users.lockedUntil} > ${nowIso}::timestamptz THEN ${users.failedLoginAttempts}
            WHEN ${users.lockedUntil} IS NOT NULL AND ${users.lockedUntil} <= ${nowIso}::timestamptz THEN 1
            ELSE ${users.failedLoginAttempts} + 1
          END`,
          lockedUntil: sql`CASE
            WHEN ${users.lockedUntil} IS NOT NULL AND ${users.lockedUntil} > ${nowIso}::timestamptz THEN ${users.lockedUntil}
            WHEN (CASE WHEN ${users.lockedUntil} IS NOT NULL AND ${users.lockedUntil} <= ${nowIso}::timestamptz THEN 1 ELSE ${users.failedLoginAttempts} + 1 END) >= ${policy.maxFailedAttempts}
              THEN ${lockUntilIso}::timestamptz
            ELSE NULL
          END`,
          updatedAt: sql`${nowIso}::timestamptz`,
        })
        .where(eq(users.id, user.id));

      throw new UnauthorizedException();
    }

    // 4. Successful login: reset attempts and lock state
    if (user.failedLoginAttempts > 0 || user.lockedUntil !== null) {
      await this.db
        .update(users)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));
    } else {
      await this.db
        .update(users)
        .set({
          lastLoginAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));
    }

    const accessToken = await this.jwt.signAsync({ sub: user.id, tokenVersion: user.tokenVersion });
    const { exp } = this.jwt.decode<{ exp: number }>(accessToken);
    return { accessToken, tokenType: 'Bearer', expiresAt: exp * 1000, user: identity(user) };
  }

  async authenticate(token: string): Promise<AdminIdentity> {
    let payload: { sub?: unknown; exp?: unknown; tokenVersion?: unknown };
    try {
      payload = await this.jwt.verifyAsync<{ sub?: unknown; exp?: unknown; tokenVersion?: unknown }>(token);
    } catch {
      throw new UnauthorizedException();
    }
    if (typeof payload.sub !== 'string' || !isValidUuid(payload.sub) ||
        typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) ||
        typeof payload.tokenVersion !== 'number' || !Number.isSafeInteger(payload.tokenVersion) || payload.tokenVersion < 0) {
      throw new UnauthorizedException();
    }
    // Re-check the account so disabling/deleting an admin also rejects existing tokens.
    const user = await this.db.query.users.findFirst({ where: eq(users.id, payload.sub) });
    if (!isActiveAdmin(user) || user.tokenVersion !== payload.tokenVersion) throw new UnauthorizedException();
    return identity(user);
  }

  async changePassword(userId: string, body: unknown): Promise<{ message: string }> {
    if (!userId || typeof userId !== 'string' || !isValidUuid(userId)) {
      throw new UnauthorizedException();
    }
    if (!body || typeof body !== 'object' || !('currentPassword' in body) || !('newPassword' in body)) {
      throw new BadRequestException('Dữ liệu yêu cầu không hợp lệ.');
    }
    const { currentPassword, newPassword } = body as { currentPassword?: unknown; newPassword?: unknown };
    if (typeof currentPassword !== 'string' || !currentPassword || Buffer.byteLength(currentPassword, 'utf8') > 72) {
      throw new BadRequestException('Mật khẩu hiện tại không hợp lệ.');
    }
    if (typeof newPassword !== 'string' || !newPassword) {
      throw new BadRequestException('Mật khẩu mới không hợp lệ.');
    }
    if (newPassword === currentPassword) {
      throw new BadRequestException('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
    }
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      throw new BadRequestException(strength.message);
    }

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!isActiveAdmin(user)) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc không còn hoạt động.');
    }

    let validCurrent = false;
    try {
      validCurrent = await compare(currentPassword, user.passwordHash);
    } catch {
      validCurrent = false;
    }
    if (!validCurrent) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác.');
    }

    const newHash = await hash(newPassword, 10);
    const now = new Date();

    const [changed] = await this.db
      .update(users)
      .set({
        passwordHash: newHash,
        tokenVersion: sql`${users.tokenVersion} + 1`,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: now,
      })
      .where(and(
        eq(users.id, user.id),
        eq(users.passwordHash, user.passwordHash),
        eq(users.tokenVersion, user.tokenVersion),
        eq(users.role, 'admin'),
        eq(users.status, 'active'),
        isNull(users.deletedAt),
      ))
      .returning({ id: users.id });

    if (!changed) {
      throw new UnauthorizedException('Tài khoản đã thay đổi. Vui lòng đăng nhập lại.');
    }

    return { message: 'Đổi mật khẩu thành công.' };
  }

  async forgotPassword(body: unknown): Promise<{ message: string }> {
    const genericResponse = {
      message: 'Nếu tài khoản phù hợp tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi tới địa chỉ đã đăng ký.',
    };

    if (!body || typeof body !== 'object' || !('email' in body)) {
      return genericResponse;
    }

    const { email } = body as { email?: unknown };
    if (typeof email !== 'string' || !email.trim() || email.length > 255) {
      return genericResponse;
    }

    const cleanEmail = email.trim().toLowerCase();

    let user: Account | undefined;
    try {
      user = await this.db.query.users.findFirst({
        where: sql`lower(${users.email}) = ${cleanEmail}`,
      });
    } catch {
      this.logger.error('Database error during forgot-password lookup');
      return genericResponse;
    }

    if (!isActiveAdmin(user)) {
      return genericResponse;
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const ttlMinutes = getPasswordResetTokenTtlMinutes(this.configService);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    try {
      await this.db.transaction(async (tx) => {
        // Invalidate older unconsumed active tokens for this user
        await tx
          .update(passwordResetTokens)
          .set({ consumedAt: now })
          .where(
            and(
              eq(passwordResetTokens.userId, user!.id),
              isNull(passwordResetTokens.consumedAt),
            ),
          );

        // Store one-way token hash only
        await tx.insert(passwordResetTokens).values({
          userId: user!.id,
          tokenHash,
          expiresAt,
        });
      });
    } catch {
      this.logger.error('Failed to store password recovery token');
      return genericResponse;
    }

    let adminUrl: string;
    try {
      adminUrl = getAdminPublicUrl(this.configService);
    } catch {
      this.logger.error('Failed to resolve ADMIN_PUBLIC_URL for recovery link');
      return genericResponse;
    }

    const resetLink = `${adminUrl.replace(/\/+$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;

    try {
      if (this.emailSender) {
        await this.emailSender.send({
          to: user.email,
          subject: '[LT Việt Nam] Hướng dẫn đặt lại mật khẩu quản trị',
          text: `Xin chào ${user.fullName},\n\nBạn hoặc ai đó vừa yêu cầu đặt lại mật khẩu cho tài khoản quản trị LT Việt Nam (${user.email}).\n\nVui lòng truy cập liên kết sau để đặt lại mật khẩu (liên kết có hiệu lực trong ${ttlMinutes} phút):\n${resetLink}\n\nNếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.\n\nTrân trọng,\nBan Quản trị LT Việt Nam`,
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f172a; margin-top: 0;">Đặt lại mật khẩu quản trị LT Việt Nam</h2>
            <p>Xin chào <strong>${escapeHtml(user.fullName)}</strong>,</p>
            <p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản quản trị: <code>${escapeHtml(user.email)}</code>.</p>
            <div style="margin: 28px 0;">
              <a href="${escapeHtml(resetLink)}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Đặt lại mật khẩu</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">Liên kết này có hiệu lực trong vòng <strong>${ttlMinutes} phút</strong> và chỉ sử dụng được một lần duy nhất.</p>
            <p style="color: #64748b; font-size: 14px;">Nếu nút phía trên không hoạt động, vui lòng sao chép và dán liên kết sau vào trình duyệt:</p>
            <p style="word-break: break-all; font-size: 13px; color: #2563eb;"><a href="${escapeHtml(resetLink)}">${escapeHtml(resetLink)}</a></p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; margin-bottom: 0;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này. Mật khẩu hiện tại của bạn vẫn được giữ nguyên và bảo mật.</p>
          </div>`,
        });
      }
    } catch {
      this.logger.error('Gửi email đặt lại mật khẩu thất bại.');
    }

    return genericResponse;
  }

  async resetPassword(body: unknown): Promise<{ message: string }> {
    if (!body || typeof body !== 'object' || !('token' in body) || !('newPassword' in body)) {
      throw new BadRequestException('Dữ liệu yêu cầu không hợp lệ.');
    }

    const { token, newPassword } = body as { token?: unknown; newPassword?: unknown };
    if (typeof token !== 'string' || !token.trim()) {
      throw new BadRequestException('Mã xác thực đặt lại mật khẩu không hợp lệ.');
    }
    if (typeof newPassword !== 'string' || !newPassword) {
      throw new BadRequestException('Mật khẩu mới không hợp lệ.');
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      throw new BadRequestException(strength.message);
    }

    const tokenHash = createHash('sha256').update(token.trim()).digest('hex');
    const now = new Date();
    const newHash = await hash(newPassword, 10);

    return await this.db.transaction(async (tx) => {
      // Atomic consumption with expiry check
      const [consumed] = await tx
        .update(passwordResetTokens)
        .set({ consumedAt: now })
        .where(
          and(
            eq(passwordResetTokens.tokenHash, tokenHash),
            isNull(passwordResetTokens.consumedAt),
            gt(passwordResetTokens.expiresAt, now),
          ),
        )
        .returning({ id: passwordResetTokens.id, userId: passwordResetTokens.userId });

      if (!consumed) {
        throw new BadRequestException('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      }

      const user = await tx.query.users.findFirst({
        where: eq(users.id, consumed.userId),
      });

      if (!isActiveAdmin(user)) {
        throw new BadRequestException('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      }

      const [updated] = await tx
        .update(users)
        .set({
          passwordHash: newHash,
          tokenVersion: sql`${users.tokenVersion} + 1`,
          failedLoginAttempts: 0,
          lockedUntil: null,
          updatedAt: now,
        })
        .where(and(
          eq(users.id, user.id),
          eq(users.passwordHash, user.passwordHash),
          eq(users.tokenVersion, user.tokenVersion),
          eq(users.role, 'admin'),
          eq(users.status, 'active'),
          isNull(users.deletedAt),
        ))
        .returning({ id: users.id });

      if (!updated) {
        throw new BadRequestException('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      }

      return { message: 'Mật khẩu đã được cập nhật thành công. Vui lòng đăng nhập lại.' };
    });
  }
}
