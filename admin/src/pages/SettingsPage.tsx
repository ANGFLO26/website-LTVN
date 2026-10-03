import React, { useState, type FormEvent } from 'react';
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
} from 'lucide-react';
import { buildApiUrl, getApiBaseUrl, getPublicSiteUrl, getSwaggerUrl } from '../config/urls';
import { ConfiguredExternalLink } from '../components/ConfiguredExternalLink';
import { auth } from '../services/auth';

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
                <span>Đặt Lại Dữ Liệu Demo Mặc Định</span>
              </button>
            </div>
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
