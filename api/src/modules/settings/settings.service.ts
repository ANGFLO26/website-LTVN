import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { eq, like } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../../database/database.module.js';
import * as schema from '../../database/schema.js';
import { EmailConfigService } from '../email/email.config.js';
import {
  EMAIL_SENDER,
  type IEmailSender,
} from '../email/email-sender.interface.js';
import { encrypt } from '../../common/encryption.util.js';
import { classifySmtpFailure } from '../email/smtp-failure.js';
import type {
  EmailSettingsResponseDto,
  UpdateEmailSettingsDto,
} from './dto/email-settings.dto.js';
import type { SendTestEmailResponseDto } from './dto/test-email.dto.js';

type SettingsTransaction = Parameters<
  Parameters<DrizzleDb['transaction']>[0]
>[0];

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly emailConfig: EmailConfigService,
    @Inject(EMAIL_SENDER) private readonly emailSender: IEmailSender,
  ) {}

  /**
   * Helper to upsert a system setting row
   */
  private async upsertSetting(
    tx: SettingsTransaction,
    key: string,
    value: string,
    isEncrypted = false,
    description?: string,
  ): Promise<void> {
    const existing = await tx.query.systemSettings.findFirst({
      where: eq(schema.systemSettings.key, key),
    });

    if (existing) {
      await tx
        .update(schema.systemSettings)
        .set({
          value,
          isEncrypted,
          description: description || existing.description,
          updatedAt: new Date(),
        })
        .where(eq(schema.systemSettings.key, key));
    } else {
      await tx.insert(schema.systemSettings).values({
        key,
        value,
        isEncrypted,
        description,
        updatedAt: new Date(),
        createdAt: new Date(),
      });
    }
  }

  /**
   * GET /api/settings/email
   * Returns current email settings without revealing plaintext passwords
   */
  async getEmailSettings(): Promise<EmailSettingsResponseDto> {
    const dbRows = await this.db.query.systemSettings.findMany({
      where: like(schema.systemSettings.key, 'email.%'),
    });

    const map = new Map<string, string>();
    for (const r of dbRows) {
      map.set(r.key, r.value);
    }

    const envConfig = this.emailConfig.getEnvSmtpConfig();
    const hasDbSettings = dbRows.length > 0;

    const host = map.get('email.smtp_host')?.trim() || envConfig?.host || '';
    const portRaw = map.get('email.smtp_port')?.trim();
    const port = portRaw ? Number(portRaw) : envConfig?.port || 587;
    const secureRaw = map.get('email.smtp_secure');
    const secure =
      secureRaw !== undefined
        ? secureRaw === 'true'
        : (envConfig?.secure ?? port === 465);

    const from =
      map.get('email.smtp_from')?.trim() ||
      envConfig?.from ||
      'no-reply@ltvietnam.com.vn';

    const recipient =
      map.get('email.notification_recipient')?.trim() ||
      envConfig?.to ||
      'contact@ltvietnam.com.vn';

    const username =
      map.get('email.smtp_username')?.trim() || envConfig?.auth?.user || '';

    // Password configured check (does NOT expose plaintext or ciphertext)
    const dbHasPassword = Boolean(map.get('email.smtp_password')?.trim());
    const envHasPassword = Boolean(envConfig?.auth?.pass?.trim());
    const smtpPasswordConfigured = dbHasPassword || envHasPassword;

    let source: EmailSettingsResponseDto['source'] = 'unconfigured';
    if (hasDbSettings && envConfig?.host) {
      source = 'mixed';
    } else if (hasDbSettings) {
      source = 'database';
    } else if (envConfig?.host) {
      source = 'environment';
    }

    return {
      notificationRecipient: recipient,
      smtpFrom: from,
      smtpHost: host,
      smtpPort: port,
      smtpSecure: secure,
      smtpUsername: username,
      smtpPasswordConfigured,
      source,
    };
  }

  /**
   * PUT /api/settings/email
   * Updates email settings and safely encrypts SMTP password if provided
   */
  async updateEmailSettings(
    dto: UpdateEmailSettingsDto,
    _adminUserId?: string,
  ): Promise<EmailSettingsResponseDto> {
    const encryptedSecret =
      dto.clearSmtpPassword === true ||
      typeof dto.smtpPassword !== 'string' ||
      dto.smtpPassword.trim().length === 0
        ? null
        : encrypt(dto.smtpPassword.trim());

    await this.db.transaction(async (tx) => {
      await this.upsertSetting(
        tx,
        'email.notification_recipient',
        dto.notificationRecipient.trim(),
        false,
        'Email tiếp nhận thông báo liên hệ',
      );
      await this.upsertSetting(
        tx,
        'email.smtp_from',
        dto.smtpFrom.trim(),
        false,
        'Địa chỉ email người gửi SMTP',
      );
      await this.upsertSetting(
        tx,
        'email.smtp_host',
        dto.smtpHost.trim(),
        false,
        'Máy chủ gửi thư SMTP Host',
      );
      await this.upsertSetting(
        tx,
        'email.smtp_port',
        String(dto.smtpPort),
        false,
        'Cổng kết nối SMTP Port',
      );
      await this.upsertSetting(
        tx,
        'email.smtp_secure',
        String(dto.smtpSecure),
        false,
        'Kích hoạt SSL/TLS bảo mật SMTP',
      );
      await this.upsertSetting(
        tx,
        'email.smtp_username',
        (dto.smtpUsername || '').trim(),
        false,
        'Tài khoản đăng nhập SMTP',
      );

      // Password update semantics:
      if (dto.clearSmtpPassword === true) {
        await tx
          .delete(schema.systemSettings)
          .where(eq(schema.systemSettings.key, 'email.smtp_password'));
      } else if (encryptedSecret !== null) {
        await this.upsertSetting(
          tx,
          'email.smtp_password',
          encryptedSecret,
          true,
          'Mật khẩu SMTP mã hóa AES-256-GCM',
        );
      }
    });

    if (dto.clearSmtpPassword === true)
      this.logger.log('Đã xóa mật khẩu SMTP theo yêu cầu rõ ràng.');
    else if (encryptedSecret !== null)
      this.logger.log('Đã cập nhật mật khẩu SMTP mã hóa.');
    else this.logger.log('Giữ nguyên mật khẩu SMTP hiện tại.');

    // Only invalidate after commit. Other cluster workers refresh on their cache TTL.
    this.emailConfig.invalidateCache();

    return this.getEmailSettings();
  }

  /**
   * POST /api/settings/email/test
   * Sends a test diagnostic email to notificationRecipient
   */
  async sendTestEmail(
    adminUserEmail?: string,
  ): Promise<SendTestEmailResponseDto> {
    const config = await this.emailConfig.getEffectiveSmtpConfig();

    if (!config || !config.host || !config.to || !config.from) {
      throw new BadRequestException(
        'Cấu hình SMTP chưa hoàn chỉnh. Vui lòng thiết lập đầy đủ SMTP Host, Port, Email người gửi và Email nhận thông báo.',
      );
    }

    const testTimestamp = new Date().toLocaleString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    const messageId = `<test-email-${Date.now()}@ltvietnam.com.vn>`;

    const subject = `[LTVN Test] Kiểm tra kết nối SMTP từ Cổng Quản Trị LTVN`;

    const text = `Kính gửi Quản trị viên LTVN,

Đây là email kiểm tra kết nối được gửi từ Cổng Quản Trị Hệ Thống Thiết Bị L&T Việt Nam.

--------------------------------------------------
THÔNG SỐ KẾT NỐI KIỂM TRA
--------------------------------------------------
- Thời gian gửi: ${testTimestamp}
- Máy chủ SMTP: ${config.host}:${config.port} (Bảo mật: ${config.secure ? 'Có (SSL/TLS)' : 'Không (STARTTLS/Plain)'})
- Tài khoản SMTP: ${config.auth?.user || 'Không xác thực'}
- Email người gửi: ${config.from}
- Email nhận thông báo: ${config.to}
${adminUserEmail ? `- Người kích hoạt: ${adminUserEmail}` : ''}

Nếu bạn nhận được email này, tính năng gửi email qua SMTP của hệ thống đã hoạt động bình thường và sẵn sàng chuyển phát thông báo khách hàng.
`;

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background: #f8fafc; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #0f172a; padding: 20px 24px; color: #ffffff; }
    .header h1 { margin: 0; font-size: 1.15rem; color: #38bdf8; }
    .content { padding: 24px; }
    .badge-success { display: inline-block; padding: 4px 10px; background: #dcfce7; color: #15803d; border-radius: 9999px; font-weight: 700; font-size: 0.75rem; margin-bottom: 16px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 0.88rem; }
    .table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
    .table td.lbl { font-weight: 600; color: #64748b; width: 35%; background: #f8fafc; }
    .footer { background: #f8fafc; padding: 14px 24px; font-size: 0.75rem; color: #94a3b8; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>L&T VIETNAM PORTAL</h1>
      <div style="font-size: 0.82rem; color: #94a3b8; margin-top: 2px;">Kiểm tra cấu hình dịch vụ chuyển phát email SMTP</div>
    </div>
    <div class="content">
      <span class="badge-success">✓ KẾT NỐI SMTP HOẠT ĐỘNG TỐT</span>
      <p style="margin: 0 0 16px; font-size: 0.9rem;">
        Email kiểm tra này xác nhận rằng thông số máy chủ SMTP và tài khoản đã được thiết lập chính xác trên Cổng Quản Trị LTVN.
      </p>
      <table class="table">
        <tr><td class="lbl">Thời gian gửi</td><td>${testTimestamp}</td></tr>
        <tr><td class="lbl">Máy chủ SMTP</td><td><code>${config.host}:${config.port}</code></td></tr>
        <tr><td class="lbl">Phương thức bảo mật</td><td>${config.secure ? 'SSL/TLS (Port 465)' : 'STARTTLS / Standard'}</td></tr>
        <tr><td class="lbl">Tài khoản gửi</td><td>${config.auth?.user || 'Không yêu cầu xác thực'}</td></tr>
        <tr><td class="lbl">Email người gửi</td><td>${config.from}</td></tr>
        <tr><td class="lbl">Email nhận thông báo</td><td><strong>${config.to}</strong></td></tr>
      </table>
    </div>
    <div class="footer">
      Email kiểm tra tự động từ Cổng Quản Trị LTVN (PAC Instruments).
    </div>
  </div>
</body>
</html>`;

    try {
      this.logger.log('Đang gửi email kiểm tra SMTP.');

      const result = await this.emailSender.send({
        to: config.to,
        from: config.from,
        subject,
        text,
        html,
        messageId,
      });

      this.logger.log('Gửi email kiểm tra thành công.');

      return {
        success: true,
        message: `Đã gửi email kiểm tra thành công tới ${config.to}`,
        recipient: config.to,
        messageId: result.messageId,
      };
    } catch (err) {
      const failureCode = classifySmtpFailure(err);
      this.logger.error(`Gửi email kiểm tra thất bại. code=${failureCode}`);
      throw new BadRequestException(
        'Không thể gửi email kiểm tra. Vui lòng kiểm tra cấu hình SMTP và thử lại.',
      );
    }
  }
}
