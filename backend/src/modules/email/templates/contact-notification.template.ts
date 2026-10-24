import type * as schema from '../../../database/schema.js';

export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface ContactNotificationEmail {
  subject: string;
  text: string;
  html: string;
  messageId: string;
}

export function buildContactNotificationEmail(
  contact: schema.Contact,
  outboxId: string,
): ContactNotificationEmail {
  const safeFullName = escapeHtml(contact.fullName);
  const safeCompanyName = escapeHtml(contact.companyName || 'Khách hàng cá nhân');
  const safeEmail = escapeHtml(contact.email);
  const safePhone = escapeHtml(contact.phone || 'Chưa cung cấp');
  const safeSubject = escapeHtml(contact.subject || 'Liên hệ chung');
  const safeMessage = escapeHtml(contact.message).replace(/\n/g, '<br />');
  const createdAtFormatted = new Date(contact.createdAt).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });

  const subject = `[LTVN Lead] Yêu cầu liên hệ: ${contact.subject || 'Liên hệ chung'} - ${contact.fullName}`;

  const text = `Kính gửi Ban Tiếp nhận & Quản lý Khách hàng LTVN,

Hệ thống website vừa ghi nhận một yêu cầu liên hệ / báo giá mới từ khách hàng:

--------------------------------------------------
THÔNG TIN LIÊN HỆ CHI TIẾT
--------------------------------------------------
- Mã yêu cầu: ${contact.id}
- Thời gian gửi: ${createdAtFormatted}
- Họ và tên khách hàng: ${contact.fullName}
- Đơn vị / Công ty: ${contact.companyName || 'Khách hàng cá nhân'}
- Địa chỉ Email: ${contact.email}
- Số điện thoại: ${contact.phone || 'Chưa cung cấp'}
- Chủ đề quan tâm: ${contact.subject || 'Liên hệ chung'}

--------------------------------------------------
NỘI DUNG YÊU CẦU:
--------------------------------------------------
${contact.message}

--------------------------------------------------
* Email này được gửi tự động từ Cổng thông tin Công ty Cổ phần Thiết Bị L&T Việt Nam (PAC Instruments).
* Vui lòng truy cập Portal Quản trị để cập nhật trạng thái xử lý cho yêu cầu này.
`;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 20px; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 24px; color: #ffffff; text-align: left; }
    .header h1 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #38bdf8; }
    .header p { margin: 4px 0 0; font-size: 0.85rem; color: #94a3b8; }
    .content { padding: 24px; }
    .badge { display: inline-block; padding: 4px 10px; font-size: 0.75rem; font-weight: 700; background: #e0f2fe; color: #0369a1; border-radius: 9999px; margin-bottom: 16px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .info-table td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 0.9rem; }
    .info-table td.label { font-weight: 600; color: #64748b; width: 35%; background: #f8fafc; }
    .info-table td.value { color: #0f172a; font-weight: 500; }
    .message-box { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #0284c7; padding: 14px 16px; border-radius: 4px; margin-top: 12px; font-size: 0.92rem; color: #1e293b; }
    .footer { background: #f8fafc; padding: 16px 24px; font-size: 0.78rem; color: #94a3b8; border-top: 1px solid #e2e8f0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>L&T VIETNAM PORTAL</h1>
      <p>Hệ thống Thông Báo Tiếp Nhận Yêu Cầu Liên Hệ & Báo Giá PAC</p>
    </div>
    <div class="content">
      <span class="badge">YÊU CẦU MỚI TỪ WEBSITE</span>
      <table class="info-table">
        <tr>
          <td class="label">Mã Yêu Cầu</td>
          <td class="value"><code>${escapeHtml(contact.id)}</code></td>
        </tr>
        <tr>
          <td class="label">Thời Gian Gửi</td>
          <td class="value">${createdAtFormatted}</td>
        </tr>
        <tr>
          <td class="label">Họ và Tên</td>
          <td class="value"><strong>${safeFullName}</strong></td>
        </tr>
        <tr>
          <td class="label">Công Ty / Đơn Vị</td>
          <td class="value">${safeCompanyName}</td>
        </tr>
        <tr>
          <td class="label">Địa Chỉ Email</td>
          <td class="value"><a href="mailto:${safeEmail}" style="color: #0284c7; text-decoration: none;">${safeEmail}</a></td>
        </tr>
        <tr>
          <td class="label">Số Điện Thoại</td>
          <td class="value"><a href="tel:${safePhone}" style="color: #0284c7; text-decoration: none;">${safePhone}</a></td>
        </tr>
        <tr>
          <td class="label">Chủ Đề Quan Tâm</td>
          <td class="value">${safeSubject}</td>
        </tr>
      </table>

      <div style="font-weight: 600; font-size: 0.88rem; color: #475569; margin-top: 16px;">NỘI DUNG YÊU CẦU CHI TIẾT:</div>
      <div class="message-box">
        ${safeMessage}
      </div>
    </div>
    <div class="footer">
      Email tự động được gửi từ Cổng thông tin Thiết Bị L&T Việt Nam.<br />
      Vui lòng không trả lời trực tiếp email này.
    </div>
  </div>
</body>
</html>`;

  return {
    subject,
    text,
    html,
    messageId: `<contact-outbox-${outboxId}@ltvietnam.com.vn>`,
  };
}
