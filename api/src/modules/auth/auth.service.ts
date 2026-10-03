import { BadRequestException, Inject, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { isValidUuid } from '../../common/uuid.util.js';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import { users } from '../../database/schema.js';
import { getLockoutPolicy, validatePasswordStrength } from './auth.config.js';
import type { AdminIdentity } from './auth.types.js';

type Account = typeof users.$inferSelect;

function isActiveAdmin(user: Account | undefined): user is Account {
  return !!user && user.role === 'admin' && user.status === 'active' && !user.deletedAt;
}

function identity(user: Account): AdminIdentity {
  return { id: user.id, email: user.email, fullName: user.fullName, role: 'admin' };
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Optional() private readonly configService?: ConfigService,
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

    const accessToken = await this.jwt.signAsync({ sub: user.id });
    const { exp } = this.jwt.decode<{ exp: number }>(accessToken);
    return { accessToken, tokenType: 'Bearer', expiresAt: exp * 1000, user: identity(user) };
  }

  async authenticate(token: string): Promise<AdminIdentity> {
    let payload: { sub?: unknown; exp?: unknown };
    try {
      payload = await this.jwt.verifyAsync<{ sub?: unknown; exp?: unknown }>(token);
    } catch {
      throw new UnauthorizedException();
    }
    if (typeof payload.sub !== 'string' || !isValidUuid(payload.sub) ||
        typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
      throw new UnauthorizedException();
    }
    // Re-check the account so disabling/deleting an admin also rejects existing tokens.
    const user = await this.db.query.users.findFirst({ where: eq(users.id, payload.sub) });
    if (!isActiveAdmin(user)) throw new UnauthorizedException();
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

    await this.db
      .update(users)
      .set({
        passwordHash: newHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    return { message: 'Đổi mật khẩu thành công.' };
  }
}

