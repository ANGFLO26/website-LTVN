import { useState, type FormEvent } from 'react';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
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
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="forgot-title">
        <div className="brand-icon" aria-hidden="true">LT</div>
        <p className="auth-brand">LT VIỆT NAM · ADMIN</p>
        <h1 id="forgot-title">Quên mật khẩu</h1>
        <p className="auth-description">
          Nhập địa chỉ email quản trị đã đăng ký để nhận liên kết đặt lại mật khẩu an toàn.
        </p>

        {successMessage ? (
          <div className="auth-success-box" role="status">
            <CheckCircle2 size={24} color="#34d399" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontWeight: 600, marginBottom: 6, color: '#34d399' }}>Yêu cầu đã được ghi nhận</p>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
                {successMessage}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Vui lòng kiểm tra hộp thư đến (và thư mục rác/spam). Liên kết đặt lại có hiệu lực trong 30 phút.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onBackToLogin}
              style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Quay lại trang đăng nhập</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} aria-busy={submitting}>
            <label htmlFor="forgot-email">Email tài khoản</label>
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
              placeholder="admin@ltvietnam.com.vn"
            />

            <TurnstileWidget
              action="forgot_password"
              onVerify={setCaptchaToken}
              onExpire={() => setCaptchaToken('')}
            />

            {error && <p className="auth-error" role="alert">{error}</p>}

            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Mail size={17} aria-hidden="true" />
              <span>{submitting ? 'Đang gửi yêu cầu…' : 'Gửi liên kết đặt lại mật khẩu'}</span>
            </button>

            <button
              type="button"
              className="btn btn-link auth-back-link"
              onClick={onBackToLogin}
              disabled={submitting}
            >
              <ArrowLeft size={15} aria-hidden="true" />
              <span>Quay lại đăng nhập</span>
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
