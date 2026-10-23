import { useState, type FormEvent } from 'react';
import { LockKeyhole, Sun, Moon } from 'lucide-react';
import { auth, type AdminIdentity } from '../services/auth';
import { TurnstileWidget } from '../components/TurnstileWidget';
import '../auth.css';

interface Props {
  onAuthenticated: (user: AdminIdentity) => void;
  onForgotPassword?: () => void;
  message?: string;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export function LoginPage({ onAuthenticated, onForgotPassword, message, theme = 'dark', onToggleTheme }: Props) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError('');
    try {
      const user = await auth.login(
        String(data.get('email') ?? ''),
        String(data.get('password') ?? ''),
        captchaToken
      );
      onAuthenticated(user);
    } catch (err) {
      setError(
        err instanceof Error && err.name === 'Error'
          ? err.message
          : 'Không thể kết nối máy chủ. Vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-screen" style={{ position: 'relative' }}>
      {onToggleTheme && (
        <button
          type="button"
          className="btn-icon theme-toggle-btn"
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-full)',
            width: 42,
            height: 42,
            cursor: 'pointer',
          }}
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          aria-label={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
        >
          {theme === 'dark' ? <Sun size={19} color="#f59e0b" /> : <Moon size={19} color="#3b82f6" />}
        </button>
      )}
      <section className="auth-card" aria-labelledby="login-title">
        <div className="brand-icon" aria-hidden="true">LT</div>
        <p className="auth-brand">LT VIỆT NAM · ADMIN</p>
        <h1 id="login-title">Đăng nhập quản trị</h1>
        <p className="auth-description">Sử dụng tài khoản Admin để quản lý nội dung website.</p>
        <form onSubmit={handleSubmit} aria-busy={submitting}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
            disabled={submitting}
          />
          <label htmlFor="login-password">Mật khẩu</label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={submitting}
          />

          {onForgotPassword && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4, marginBottom: 8 }}>
              <button
                type="button"
                className="auth-link-btn"
                onClick={onForgotPassword}
                disabled={submitting}
              >
                Quên mật khẩu?
              </button>
            </div>
          )}

          <TurnstileWidget
            action="login"
            onVerify={setCaptchaToken}
            onExpire={() => setCaptchaToken('')}
          />

          {(error || message) && <p className="auth-error" role="alert">{error || message}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            <LockKeyhole size={17} aria-hidden="true" />
            {submitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
      </section>
    </main>
  );
}
