import { useState, type FormEvent } from 'react';
import { Lock, Eye, EyeOff, AlertTriangle, ArrowLeft } from 'lucide-react';
import { auth } from '../services/auth';
import '../auth.css';

interface Props {
  token: string;
  onResetSuccess: (message: string) => void;
  onRequestNewLink: () => void;
}

export function ResetPasswordPage({ token, onResetSuccess, onRequestNewLink }: Props) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isTokenInvalid, setIsTokenInvalid] = useState(!token || !token.trim());

  // Password rule checks matching PR-10A
  const ruleLength = newPassword.length >= 12 && newPassword.length <= 72;
  const ruleUpper = /[A-Z]/.test(newPassword);
  const ruleLower = /[a-z]/.test(newPassword);
  const ruleDigit = /[0-9]/.test(newPassword);
  const ruleSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const ruleMatchConfirm = newPassword !== '' && confirmPassword !== '' && newPassword === confirmPassword;
  const isPolicyValid = ruleLength && ruleUpper && ruleLower && ruleDigit && ruleSpecial;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setError('');

    if (!token || !token.trim()) {
      setIsTokenInvalid(true);
      setError('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
      return;
    }

    if (!isPolicyValid) {
      setError('Mật khẩu mới chưa đáp ứng đầy đủ tiêu chí bảo mật (tối thiểu 12 ký tự, hoa, thường, số, ký tự đặc biệt).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await auth.resetPassword(token.trim(), newPassword);
      // Clear sensitive fields in memory immediately
      setNewPassword('');
      setConfirmPassword('');
      onResetSuccess(res.message || 'Mật khẩu đã được cập nhật thành công. Vui lòng đăng nhập lại.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.';
      setError(msg);
      if (msg.includes('không hợp lệ') || msg.includes('hết hạn')) {
        setIsTokenInvalid(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (isTokenInvalid) {
    return (
      <main className="auth-screen">
        <section className="auth-card" aria-labelledby="reset-invalid-title">
          <div className="brand-icon" aria-hidden="true">LT</div>
          <p className="auth-brand">LT VIỆT NAM · ADMIN</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
            <AlertTriangle size={24} color="#f87171" aria-hidden="true" />
            <h1 id="reset-invalid-title" style={{ fontSize: '1.35rem', margin: 0 }}>
              Liên kết không hợp lệ
            </h1>
          </div>
          <p className="auth-description" style={{ marginBottom: 20 }}>
            Liên kết đặt lại mật khẩu không hợp lệ, đã hết hạn hoặc đã được sử dụng trước đó.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onRequestNewLink}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <span>Yêu cầu liên kết mới</span>
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="reset-title">
        <div className="brand-icon" aria-hidden="true">LT</div>
        <p className="auth-brand">LT VIỆT NAM · ADMIN</p>
        <h1 id="reset-title">Đặt lại mật khẩu</h1>
        <p className="auth-description">
          Tạo mật khẩu mới cho tài khoản quản trị của bạn theo chuẩn bảo mật an toàn.
        </p>

        <form onSubmit={handleSubmit} aria-busy={submitting}>
          {/* New password field */}
          <label htmlFor="reset-new-password">Mật khẩu mới *</label>
          <div className="auth-input-group">
            <input
              id="reset-new-password"
              name="newPassword"
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              required
              autoFocus
              disabled={submitting}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nhập mật khẩu mới..."
            />
            <button
              type="button"
              className="auth-eye-btn"
              onClick={() => setShowNew(!showNew)}
              aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              tabIndex={-1}
            >
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Confirm password field */}
          <label htmlFor="reset-confirm-password">Xác nhận mật khẩu mới *</label>
          <div className="auth-input-group">
            <input
              id="reset-confirm-password"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              required
              disabled={submitting}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới..."
            />
            <button
              type="button"
              className="auth-eye-btn"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              tabIndex={-1}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Password criteria checklist matching PR-10A */}
          {newPassword && (
            <div className="auth-password-criteria" role="status">
              <span style={{ color: ruleLength ? '#34d399' : 'var(--text-muted)' }}>
                {ruleLength ? '✓' : '○'} Tối thiểu 12 ký tự
              </span>
              <span style={{ color: ruleUpper ? '#34d399' : 'var(--text-muted)' }}>
                {ruleUpper ? '✓' : '○'} Có chữ in hoa (A-Z)
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
                  {ruleMatchConfirm ? '✓ Mật khẩu khớp nhau' : '✕ Chưa khớp nhau'}
                </span>
              )}
            </div>
          )}

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || (newPassword !== '' && !isPolicyValid)}
          >
            <Lock size={17} aria-hidden="true" />
            <span>{submitting ? 'Đang cập nhật mật khẩu…' : 'Cập nhật mật khẩu mới'}</span>
          </button>

          <button
            type="button"
            className="btn btn-link auth-back-link"
            onClick={onRequestNewLink}
            disabled={submitting}
          >
            <ArrowLeft size={15} aria-hidden="true" />
            <span>Quay lại trang đăng nhập</span>
          </button>
        </form>
      </section>
    </main>
  );
}
