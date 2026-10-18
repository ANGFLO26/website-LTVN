import React, { useState, useEffect, type FormEvent } from 'react';
import {
  Server,
  Database,
  FileCode,
  RefreshCw,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Mail,
  Send,
  Save,
} from 'lucide-react';
import { buildApiUrl, getApiBaseUrl, getPublicSiteUrl, getSwaggerUrl } from '../config/urls';
import { ConfiguredExternalLink } from '../components/ConfiguredExternalLink';
import { auth } from '../services/auth';
import { api } from '../services/api';

interface Props {
  backendConnected: boolean;
  onRefreshData: () => void;
  onPasswordChanged?: () => void;
}

export const SettingsPage: React.FC<Props> = ({
  backendConnected,
  onRefreshData,
  onPasswordChanged,
}) => {
  // Email Settings state
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);

  const [notificationRecipient, setNotificationRecipient] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState<number | string>(587);
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpPasswordConfigured, setSmtpPasswordConfigured] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchEmailSettings() {
      setEmailLoading(true);
      try {
        const data = await api.getEmailSettings();
        if (active) {
          setNotificationRecipient(data.notificationRecipient || '');
          setSmtpFrom(data.smtpFrom || '');
          setSmtpHost(data.smtpHost || '');
          setSmtpPort(data.smtpPort || 587);
          setSmtpSecure(Boolean(data.smtpSecure));
          setSmtpUsername(data.smtpUsername || '');
          setSmtpPasswordConfigured(Boolean(data.smtpPasswordConfigured));
          setSmtpPassword(''); // Never prefill secret
        }
      } catch {
        // Fallback / uninitialized
      } finally {
        if (active) setEmailLoading(false);
      }
    }
    fetchEmailSettings();
    return () => {
      active = false;
    };
  }, []);

  async function handleSaveEmailSettings(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');
    setTestResult(null);

    if (!notificationRecipient.trim()) {
      setEmailError('Vui lòng nhập Email nhận thông báo.');
      return;
    }
    if (!smtpFrom.trim()) {
      setEmailError('Vui lòng nhập Email người gửi.');
      return;
    }
    if (!smtpHost.trim()) {
      setEmailError('Vui lòng nhập SMTP Host.');
      return;
    }
    const portNum = Number(smtpPort);
    if (!portNum || isNaN(portNum) || portNum < 1 || portNum > 65535) {
      setEmailError('SMTP Port phải là số nguyên từ 1 đến 65535.');
      return;
    }

    setEmailSaving(true);
    try {
      const payload: {
        notificationRecipient: string;
        smtpFrom: string;
        smtpHost: string;
        smtpPort: number;
        smtpSecure: boolean;
        smtpUsername: string;
        smtpPassword?: string;
      } = {
        notificationRecipient: notificationRecipient.trim(),
        smtpFrom: smtpFrom.trim(),
        smtpHost: smtpHost.trim(),
        smtpPort: portNum,
        smtpSecure,
        smtpUsername: smtpUsername.trim(),
      };
      if (smtpPassword) {
        payload.smtpPassword = smtpPassword;
      }

      const res = await api.updateEmailSettings(payload);
      setSmtpPasswordConfigured(Boolean(res.smtpPasswordConfigured));
      setSmtpPassword(''); // Reset input to blank
      setEmailSuccess('Cấu hình email và SMTP đã được lưu thành công.');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Lỗi khi lưu cấu hình email.');
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleSendTestEmail() {
    setEmailError('');
    setTestResult(null);
    setTestSending(true);

    try {
      const res = await api.sendTestEmail();
      setTestResult({
        success: true,
        message: res.message || `Đã gửi email kiểm tra thành công tới ${res.recipient}.`,
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Không thể gửi email kiểm tra.',
      });
    } finally {
      setTestSending(false);
    }
  }

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Password rule checks
  const ruleLength = newPassword.length >= 12;
  const ruleUpper = /[A-Z]/.test(newPassword);
  const ruleLower = /[a-z]/.test(newPassword);
  const ruleDigit = /[0-9]/.test(newPassword);
  const ruleSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const ruleDiffCurrent = newPassword !== '' && currentPassword !== '' && newPassword !== currentPassword;
  const ruleMatchConfirm = newPassword !== '' && confirmPassword !== '' && newPassword === confirmPassword;

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!currentPassword) {
      setError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!ruleLength || !ruleUpper || !ruleLower || !ruleDigit || !ruleSpecial) {
      setError('Mật khẩu mới chưa đáp ứng đầy đủ tiêu chí bảo mật (tối thiểu 12 ký tự, hoa, thường, số, ký tự đặc biệt).');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Mật khẩu mới không được trùng với mật khẩu hiện tại.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await auth.changePassword(currentPassword, newPassword);
      setSuccessMsg(res.message || 'Đổi mật khẩu thành công.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      if (onPasswordChanged) {
        setTimeout(() => {
          onPasswordChanged();
        }, 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-top">
        <div className="page-title">
          <h1>Cấu Hình Hệ Thống & Bảo Mật</h1>
          <p>Thông tin môi trường, trạng thái cơ sở dữ liệu và quản lý mật khẩu quản trị</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Backend API Info */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Server size={18} color="#3b82f6" />
              <div className="card-title">NestJS Backend API</div>
            </div>
            <span
              className={`badge ${
                backendConnected ? 'badge-published' : 'badge-processing'
              }`}
            >
              {backendConnected ? 'Online' : 'Chưa kết nối'}
            </span>
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: '0.88rem' }}>
              <strong>Endpoint Gốc:</strong>{' '}
              <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>
                {buildApiUrl('/api') || 'Chưa cấu hình VITE_API_BASE_URL hợp lệ'}
              </code>
            </div>
            <div style={{ fontSize: '0.88rem' }}>
              <strong>Website:</strong>{' '}
              <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>
                {getPublicSiteUrl() || 'Chưa cấu hình VITE_PUBLIC_SITE_URL hợp lệ'}
              </code>
            </div>
            <div style={{ fontSize: '0.88rem' }}>
              <strong>Kết nối API:</strong> {getApiBaseUrl() === '/api'
                ? 'Sử dụng /api trên cùng origin của Admin qua reverse proxy.'
                : 'Sử dụng API base đã cấu hình.'}
            </div>
            <div style={{ marginTop: 12 }}>
              <ConfiguredExternalLink
                href={getSwaggerUrl()}
                className="btn btn-secondary btn-sm"
                title="Mở Swagger OpenAPI UI"
                unavailableReason="Chưa cấu hình VITE_API_BASE_URL hợp lệ."
              >
                <FileCode size={14} />
                <span>Mở Swagger OpenAPI UI (/api/docs)</span>
              </ConfiguredExternalLink>
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={18} color="#10b981" />
              <div className="card-title">PostgreSQL Database (Drizzle ORM)</div>
            </div>
            <span className="badge badge-published">
              <CheckCircle2 size={12} />
              <span>11 Bảng Sẵn Sàng</span>
            </span>
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: '0.88rem' }}>
              <strong>Cloud Provider:</strong> Neon Serverless PostgreSQL
            </div>
            <div style={{ fontSize: '0.88rem' }}>
              <strong>Driver:</strong> <code>postgres.js</code> (Native ESM, connection pooling)
            </div>
            <div style={{ fontSize: '0.88rem' }}>
              <strong>Migration Tool:</strong> Drizzle Kit (<code>npm run db:migrate</code> / <code>0002</code>)
            </div>
            <div style={{ fontSize: '0.88rem' }}>
              <strong>Danh mục 11 bảng:</strong> users, media_assets, machines, machine_images, machine_applications, machine_highlights, machine_specs, standards, machine_standards, news_events, contacts.
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={onRefreshData}>
                <RefreshCw size={14} />
                <span>Tải Lại Dữ Liệu Từ Máy Chủ</span>
              </button>
            </div>
          </div>
        </div>

        {/* Email & SMTP Configuration Card */}
        <div className="card" style={{ gridColumn: '1 / -1' }} id="email-settings-card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={18} color="#3b82f6" />
              <div className="card-title">Cấu Hình Email & SMTP</div>
            </div>
            <span className={`badge ${smtpPasswordConfigured ? 'badge-published' : 'badge-draft'}`}>
              <ShieldCheck size={12} />
              <span>{smtpPasswordConfigured ? 'Mật khẩu đã cấu hình' : 'Chưa cấu hình mật khẩu'}</span>
            </span>
          </div>
          <div style={{ padding: 24, maxWidth: 800 }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Cấu hình máy chủ SMTP để gửi thông báo liên hệ từ khách hàng và các email hệ thống.
              Cấu hình trong cơ sở dữ liệu sẽ được ưu tiên cao hơn biến môi trường.
            </p>

            {emailLoading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Đang tải cấu hình email...
              </div>
            ) : (
              <form onSubmit={handleSaveEmailSettings} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {/* Email nhận thông báo */}
                  <div className="form-group">
                    <label htmlFor="settings-notification-recipient">Email nhận thông báo *</label>
                    <input
                      id="settings-notification-recipient"
                      type="email"
                      className="form-control"
                      placeholder="contact@ltvietnam.com.vn"
                      value={notificationRecipient}
                      onChange={(e) => setNotificationRecipient(e.target.value)}
                      disabled={emailSaving || testSending}
                      required
                    />
                    <small style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>
                      Địa chỉ nhận thông báo khi có khách hàng gửi liên hệ mới
                    </small>
                  </div>

                  {/* Email người gửi */}
                  <div className="form-group">
                    <label htmlFor="settings-smtp-from">Email người gửi (From) *</label>
                    <input
                      id="settings-smtp-from"
                      type="text"
                      className="form-control"
                      placeholder="Công ty LT Việt Nam <no-reply@ltvietnam.com.vn>"
                      value={smtpFrom}
                      onChange={(e) => setSmtpFrom(e.target.value)}
                      disabled={emailSaving || testSending}
                      required
                    />
                    <small style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>
                      Định dạng: &quot;Tên hiển thị &lt;email@domain.com&gt;&quot; hoặc &quot;email@domain.com&quot;
                    </small>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  {/* SMTP Host */}
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="settings-smtp-host">SMTP Host *</label>
                    <input
                      id="settings-smtp-host"
                      type="text"
                      className="form-control"
                      placeholder="smtp.gmail.com"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      disabled={emailSaving || testSending}
                      required
                    />
                  </div>

                  {/* SMTP Port */}
                  <div className="form-group">
                    <label htmlFor="settings-smtp-port">SMTP Port *</label>
                    <input
                      id="settings-smtp-port"
                      type="number"
                      className="form-control"
                      placeholder="587"
                      min={1}
                      max={65535}
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      disabled={emailSaving || testSending}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                  {/* SMTP Username */}
                  <div className="form-group">
                    <label htmlFor="settings-smtp-username">SMTP Username</label>
                    <input
                      id="settings-smtp-username"
                      type="text"
                      className="form-control"
                      placeholder="username hoặc email đăng nhập SMTP"
                      value={smtpUsername}
                      onChange={(e) => setSmtpUsername(e.target.value)}
                      disabled={emailSaving || testSending}
                      autoComplete="username"
                    />
                  </div>

                  {/* SMTP Password */}
                  <div className="form-group">
                    <label htmlFor="settings-smtp-password">SMTP Password</label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        id="settings-smtp-password"
                        type={showSmtpPassword ? 'text' : 'password'}
                        className="form-control"
                        style={{ width: '100%', paddingRight: 40 }}
                        placeholder={smtpPasswordConfigured ? 'Đã cấu hình — để trống để giữ nguyên' : 'Nhập mật khẩu SMTP...'}
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        disabled={emailSaving || testSending}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                        style={{
                          position: 'absolute',
                          right: 10,
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 4,
                        }}
                        aria-label={showSmtpPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showSmtpPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <small style={{ color: 'var(--text-faint)', fontSize: '0.75rem' }}>
                      Mật khẩu được mã hóa an toàn (AES-256-GCM). Để trống để giữ nguyên mật khẩu cũ.
                    </small>
                  </div>
                </div>

                {/* SMTP Secure checkbox */}
                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                  <input
                    id="settings-smtp-secure"
                    type="checkbox"
                    checked={smtpSecure}
                    onChange={(e) => setSmtpSecure(e.target.checked)}
                    disabled={emailSaving || testSending}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />
                  <label htmlFor="settings-smtp-secure" style={{ cursor: 'pointer', margin: 0, userSelect: 'none' }}>
                    Bảo mật SMTP: Sử dụng SSL/TLS trực tiếp (thường dùng cho port 465, tắt cho 587/STARTTLS)
                  </label>
                </div>

                {/* Save Feedback Alerts */}
                {emailError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#f87171',
                      fontSize: '0.88rem',
                      background: 'rgba(239, 68, 68, 0.1)',
                      padding: '8px 12px',
                      borderRadius: 4,
                    }}
                    role="alert"
                  >
                    <AlertCircle size={16} />
                    <span>{emailError}</span>
                  </div>
                )}

                {emailSuccess && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: '#34d399',
                      fontSize: '0.88rem',
                      background: 'rgba(16, 185, 129, 0.1)',
                      padding: '8px 12px',
                      borderRadius: 4,
                    }}
                    role="status"
                  >
                    <CheckCircle2 size={16} />
                    <span>{emailSuccess}</span>
                  </div>
                )}

                {/* Test Email Result */}
                {testResult && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      color: testResult.success ? '#34d399' : '#f87171',
                      fontSize: '0.88rem',
                      background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      padding: '8px 12px',
                      borderRadius: 4,
                    }}
                    role={testResult.success ? 'status' : 'alert'}
                  >
                    {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    <span>{testResult.message}</span>
                  </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
                  <button
                    type="submit"
                    id="btn-save-email-settings"
                    className="btn btn-primary"
                    disabled={emailSaving || testSending}
                    style={{ minWidth: 160 }}
                  >
                    <Save size={15} />
                    <span>{emailSaving ? 'Đang lưu…' : 'Lưu Cấu Hình'}</span>
                  </button>

                  <button
                    type="button"
                    id="btn-send-test-email"
                    className="btn btn-secondary"
                    onClick={handleSendTestEmail}
                    disabled={emailSaving || testSending}
                    style={{ minWidth: 180 }}
                  >
                    <Send size={15} />
                    <span>{testSending ? 'Đang gửi kiểm tra…' : 'Gửi Email Kiểm Tra'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Change Password Card */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={18} color="#f59e0b" />
              <div className="card-title">Đổi Mật Khẩu Quản Trị</div>
            </div>
            <span className="badge badge-published">
              <ShieldCheck size={12} />
              <span>Bảo mật tài khoản</span>
            </span>
          </div>
          <div style={{ padding: 24, maxWidth: 640 }}>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 20 }}>
              Cập nhật mật khẩu quản trị. Sau khi đổi mật khẩu thành công, phiên đăng nhập hiện tại sẽ kết thúc và bạn cần đăng nhập lại.
            </p>

            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Current Password */}
              <div className="form-group">
                <label htmlFor="settings-current-password">Mật khẩu hiện tại *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="settings-current-password"
                    type={showCurrent ? 'text' : 'password'}
                    className="form-control"
                    style={{ width: '100%', paddingRight: 40 }}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 4,
                    }}
                    aria-label={showCurrent ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="form-group">
                <label htmlFor="settings-new-password">Mật khẩu mới * (tối thiểu 12 ký tự)</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="settings-new-password"
                    type={showNew ? 'text' : 'password'}
                    className="form-control"
                    style={{ width: '100%', paddingRight: 40 }}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 4,
                    }}
                    aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="form-group">
                <label htmlFor="settings-confirm-password">Nhập lại mật khẩu mới *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    id="settings-confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    className="form-control"
                    style={{ width: '100%', paddingRight: 40 }}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 4,
                    }}
                    aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              {newPassword && (
                <div
                  style={{
                    background: 'var(--bg-card-subtle, #1e293b)',
                    padding: 12,
                    borderRadius: 'var(--radius-sm, 6px)',
                    fontSize: '0.8rem',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 6,
                  }}
                >
                  <span style={{ color: ruleLength ? '#34d399' : 'var(--text-muted)' }}>
                    {ruleLength ? '✓' : '○'} Tối thiểu 12 ký tự
                  </span>
                  <span style={{ color: ruleUpper ? '#34d399' : 'var(--text-muted)' }}>
                    {ruleUpper ? '✓' : '○'} Có chữ hoa (A-Z)
                  </span>
                  <span style={{ color: ruleLower ? '#34d399' : 'var(--text-muted)' }}>
                    {ruleLower ? '✓' : '○'} Có chữ thường (a-z)
                  </span>
                  <span style={{ color: ruleDigit ? '#34d399' : 'var(--text-muted)' }}>
                    {ruleDigit ? '✓' : '○'} Có chữ số (0-9)
                  </span>
                  <span style={{ color: ruleSpecial ? '#34d399' : 'var(--text-muted)' }}>
                    {ruleSpecial ? '✓' : '○'} Có ký tự đặc biệt (!@#...)
                  </span>
                  {confirmPassword && (
                    <span style={{ color: ruleMatchConfirm ? '#34d399' : '#f87171' }}>
                      {ruleMatchConfirm ? '✓' : '✗'} Khớp mật khẩu xác nhận
                    </span>
                  )}
                  {currentPassword && newPassword && (
                    <span style={{ color: ruleDiffCurrent ? '#34d399' : '#f87171' }}>
                      {ruleDiffCurrent ? '✓' : '✗'} Khác mật khẩu hiện tại
                    </span>
                  )}
                </div>
              )}

              {/* Feedback messages */}
              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#f87171',
                    fontSize: '0.88rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    padding: '8px 12px',
                    borderRadius: 4,
                  }}
                  role="alert"
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    color: '#34d399',
                    fontSize: '0.88rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    padding: '8px 12px',
                    borderRadius: 4,
                  }}
                  role="status"
                >
                  <CheckCircle2 size={16} />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Submit button */}
              <div style={{ marginTop: 8 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ minWidth: 160 }}
                >
                  <Lock size={15} />
                  <span>{submitting ? 'Đang cập nhật…' : 'Đổi Mật Khẩu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
