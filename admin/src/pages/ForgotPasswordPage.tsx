import { useState, type FormEvent } from 'react';
import { Mail, ArrowLeft, CheckCircle2, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { auth } from '../services/auth';
import { TurnstileWidget } from '../components/TurnstileWidget';
import '../auth.css';

interface Props {
  onBackToLogin: () => void;
}

export function ForgotPasswordPage({ onBackToLogin }: Props) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const trimmed = email.trim();
    if (!trimmed) {
      setError('Vui lòng nhập địa chỉ email tài khoản.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    try {
      const res = await auth.forgotPassword(trimmed, captchaToken);
      setSuccessMessage(res.message);
    } catch (err) {
      setError(
        err instanceof Error && err.name === 'Error'
          ? err.message
          : 'Không thể kết nối máy chủ. Vui lòng kiểm tra lại kết nối mạng.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="sit-auth-page">
      <div className="sit-auth-canvas" aria-hidden="true" />

      <section className="sit-auth-card-single" aria-labelledby="forgot-title">
        <button
          type="button"
          className="sit-back-btn"
          onClick={onBackToLogin}
          disabled={submitting}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Quay lại trang đăng nhập</span>
        </button>

        <div>
          <div className="sit-access-pill">
            <ShieldCheck size={14} aria-hidden="true" />
            Bảo mật tài khoản
          </div>
          <h1 id="forgot-title" className="sit-form-title" style={{ fontSize: '32px' }}>
            Quên mật khẩu
          </h1>
          <p className="sit-form-desc">
            Nhập địa chỉ email quản trị đã đăng ký để nhận liên kết đặt lại mật khẩu an toàn.
          </p>
        </div>

        {successMessage ? (
          <div className="sit-success-box" role="status">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={20} color="#15803d" aria-hidden="true" />
              <h4>Yêu cầu đã được ghi nhận</h4>
            </div>
            <p>{successMessage}</p>
            <p style={{ color: '#78716c', fontSize: '12px' }}>
              Vui lòng kiểm tra hộp thư đến (và thư mục Spam). Liên kết đặt lại có hiệu lực trong 30 phút.
            </p>
            <button
              type="button"
              className="sit-submit-btn"
              onClick={onBackToLogin}
              style={{ marginTop: '0.75rem' }}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Quay lại đăng nhập</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} aria-busy={submitting}>
            <div className="sit-form-field">
              <label className="sit-field-label" htmlFor="forgot-email">
                Email tài khoản
              </label>
              <div className="sit-input-wrapper">
                <Mail className="sit-input-icon" aria-hidden="true" />
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  autoFocus
                  disabled={submitting}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@ltvietnam.com"
                  className="sit-input"
                />
              </div>
            </div>

            <TurnstileWidget
              action="forgot_password"
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken('')}
            />

            {error && (
              <div className="sit-alert-error" role="alert">
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="sit-submit-btn" disabled={submitting}>
              {submitting ? (
                <Loader2 size={16} className="spin" aria-hidden="true" />
              ) : (
                <Mail size={16} aria-hidden="true" />
              )}
              <span>{submitting ? 'Đang gửi yêu cầu…' : 'Gửi liên kết đặt lại mật khẩu'}</span>
            </button>
          </form>
        )}

        <div className="sit-auth-footer">
          Nếu cần trợ giúp thêm, vui lòng liên hệ trực tiếp với bộ phận kỹ thuật LT Việt Nam.
        </div>
      </section>
    </main>
  );
}
