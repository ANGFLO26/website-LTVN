import { useState, type FormEvent } from 'react';
import { LockKeyhole } from 'lucide-react';
import { auth, type AdminIdentity } from '../services/auth';
import '../auth.css';

interface Props {
  onAuthenticated: (user: AdminIdentity) => void;
  message?: string;
}

export function LoginPage({ onAuthenticated, message }: Props) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    setError('');
    try {
      const user = await auth.login(String(data.get('email') ?? ''), String(data.get('password') ?? ''));
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof Error && err.name === 'Error'
        ? err.message : 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="brand-icon" aria-hidden="true">LT</div>
        <p className="auth-brand">LT VIỆT NAM · ADMIN</p>
        <h1 id="login-title">Đăng nhập quản trị</h1>
        <p className="auth-description">Sử dụng tài khoản Admin để quản lý nội dung website.</p>
        <form onSubmit={handleSubmit} aria-busy={submitting}>
          <label htmlFor="login-email">Email</label>
          <input id="login-email" name="email" type="email" autoComplete="username" required autoFocus disabled={submitting} />
          <label htmlFor="login-password">Mật khẩu</label>
          <input id="login-password" name="password" type="password" autoComplete="current-password" required disabled={submitting} />
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
