import { useState, type FormEvent } from 'react';
import { Lock, Eye, EyeOff, AlertTriangle, ArrowLeft, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
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
      setNewPassword('');
      setConfirmPassword('');
      onResetSuccess(res.message || 'Mật khẩu đã được cập nhật thành công. Vui lòng đăng nhập lại.');
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'Error'
          ? err.message
          : 'Không thể cập nhật mật khẩu. Vui lòng kiểm tra lại liên kết hoặc thử lại.';
      setError(msg);
      if (msg.includes('hết hạn') || msg.includes('không hợp lệ') || msg.includes('đã qua sử dụng')) {
        setIsTokenInvalid(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (isTokenInvalid) {
    return (
      <main className="sit-auth-page">
        <div className="sit-auth-canvas" aria-hidden="true" />
        <section className="sit-auth-card-single" aria-labelledby="invalid-token-title">
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <AlertTriangle size={48} color="#f59e0b" aria-hidden="true" style={{ margin: '0 auto 1rem' }} />
            <h1 id="invalid-token-title" className="sit-form-title" style={{ fontSize: '28px' }}>
              Liên kết không hợp lệ
            </h1>
            <p className="sit-form-desc">
              Liên kết đặt lại mật khẩu này đã hết hạn (sau 30 phút), đã được sử dụng hoặc không hợp lệ.
            </p>
            <button
              type="button"
              className="sit-submit-btn"
              onClick={onRequestNewLink}
            >
              <span>Yêu cầu liên kết mới</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="sit-auth-page">
      <div className="sit-auth-canvas" aria-hidden="true" />

      <section className="sit-auth-card-single" aria-labelledby="reset-title">
        <button
          type="button"
          className="sit-back-btn"
          onClick={onRequestNewLink}
          disabled={submitting}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Quay lại trang đăng nhập</span>
        </button>

        <div>
          <div className="sit-access-pill">
            <ShieldCheck size={14} aria-hidden="true" />
            Cập nhật bảo mật
          </div>
          <h1 id="reset-title" className="sit-form-title" style={{ fontSize: '32px' }}>
            Đặt lại mật khẩu
          </h1>
          <p className="sit-form-desc">
            Tạo mật khẩu mới cho tài khoản quản trị của bạn theo tiêu chuẩn an toàn.
          </p>
        </div>

        <form onSubmit={handleSubmit} aria-busy={submitting}>
          {/* New password field */}
          <div className="sit-form-field">
            <label className="sit-field-label" htmlFor="reset-new-password">
              Mật khẩu mới *
            </label>
            <div className="sit-input-wrapper">
              <Lock className="sit-input-icon" aria-hidden="true" />
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
                placeholder="Nhập mật khẩu mới…"
                className="sit-input has-eye"
              />
              <button
                type="button"
                className="sit-eye-btn"
                onClick={() => setShowNew(!showNew)}
                aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                tabIndex={-1}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm password field */}
          <div className="sit-form-field">
            <label className="sit-field-label" htmlFor="reset-confirm-password">
              Xác nhận mật khẩu mới *
            </label>
            <div className="sit-input-wrapper">
              <Lock className="sit-input-icon" aria-hidden="true" />
              <input
                id="reset-confirm-password"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                required
                disabled={submitting}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới…"
                className="sit-input has-eye"
              />
              <button
                type="button"
                className="sit-eye-btn"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Password criteria checklist */}
          {newPassword && (
            <div className="sit-criteria-grid" role="status">
              <span className={`sit-criteria-item ${ruleLength ? 'valid' : ''}`}>
                {ruleLength ? '✓' : '○'} Tối thiểu 12 ký tự
              </span>
              <span className={`sit-criteria-item ${ruleUpper ? 'valid' : ''}`}>
                {ruleUpper ? '✓' : '○'} Chữ in hoa (A-Z)
              </span>
              <span className={`sit-criteria-item ${ruleLower ? 'valid' : ''}`}>
                {ruleLower ? '✓' : '○'} Chữ thường (a-z)
              </span>
              <span className={`sit-criteria-item ${ruleDigit ? 'valid' : ''}`}>
                {ruleDigit ? '✓' : '○'} Chữ số (0-9)
              </span>
              <span className={`sit-criteria-item ${ruleSpecial ? 'valid' : ''}`}>
                {ruleSpecial ? '✓' : '○'} Ký tự đặc biệt (!@#)
              </span>
              {confirmPassword && (
                <span className={`sit-criteria-item ${ruleMatchConfirm ? 'valid' : ''}`} style={{ color: ruleMatchConfirm ? '#15803d' : '#b91c1c' }}>
                  {ruleMatchConfirm ? '✓ Mật khẩu khớp nhau' : '✕ Chưa khớp nhau'}
                </span>
              )}
            </div>
          )}

          {error && (
            <div className="sit-alert-error" role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="sit-submit-btn"
            disabled={submitting || (newPassword !== '' && !isPolicyValid)}
          >
            {submitting ? (
              <Loader2 size={16} className="spin" aria-hidden="true" />
            ) : (
              <Lock size={16} aria-hidden="true" />
            )}
            <span>{submitting ? 'Đang cập nhật mật khẩu…' : 'Cập nhật mật khẩu mới'}</span>
          </button>
        </form>

        <div className="sit-auth-footer">
          Nếu cần trợ giúp thêm, vui lòng liên hệ trực tiếp với quản trị viên LT Việt Nam.
        </div>
      </section>
    </main>
  );
}
