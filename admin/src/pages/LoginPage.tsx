import { useState, type FormEvent } from 'react';
import {
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  ShieldCheck,
  AlertCircle,
  Sun,
  Moon,
} from 'lucide-react';
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

export function LoginPage({
  onAuthenticated,
  onForgotPassword,
  message,
  theme = 'light',
  onToggleTheme,
}: Props) {
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="sit-auth-page">
      {/* Ambient background glows matching SIT Dashboard */}
      <div className="sit-auth-canvas" aria-hidden="true" />

      {/* Theme Toggle Button */}
      {onToggleTheme && (
        <button
          type="button"
          className="sit-theme-toggle"
          onClick={onToggleTheme}
          title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          aria-label={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
        >
          {theme === 'dark' ? <Sun size={18} color="#38bdf8" /> : <Moon size={18} color="#0284c7" />}
        </button>
      )}

      {/* Master Dual-Panel Card */}
      <div className="sit-auth-card">
        {/* Left Side: Brand & Identity Showcase */}
        <aside className="sit-auth-aside">
          {/* Geometric ambient circles */}
          <div className="sit-auth-circle-1" aria-hidden="true" />
          <div className="sit-auth-circle-2" aria-hidden="true" />
          <div className="sit-auth-circle-3" aria-hidden="true" />

          {/* Top: Brand info */}
          <div className="sit-brand-row">
            <div className="sit-brand-logo-box">
              <img
                src="/images/brand/ltv-logo.png"
                alt="LT Việt Nam"
                className="sit-brand-logo-img"
              />
            </div>
            <div>
              <p className="sit-brand-tagline">LT VIỆT NAM · B2B</p>
              <p className="sit-brand-title">Command Center & Điều hành</p>
            </div>
          </div>

          {/* Middle: Editorial statement */}
          <div className="sit-hero-content">
            <div className="sit-hero-tag">
              <span className="sit-hero-line" />
              Không gian quản trị
            </div>
            <h1 className="sit-hero-title">Điều phối hệ thống LT.</h1>
            <p className="sit-hero-desc">
              Quản lý danh mục thiết bị PAC, dự án Quatest, tin tức chuyên ngành và dữ liệu vận hành B2B trong một hệ thống tập trung.
            </p>
          </div>

          {/* Bottom: 3-column stats box */}
          <div className="sit-hero-stats">
            {[
              ['B2B', 'Hệ thống'],
              ['PAC', 'Thiết bị'],
              ['2026', 'Vận hành'],
            ].map(([val, label]) => (
              <div key={label} className="sit-hero-stat-cell">
                <p className="sit-stat-value">{val}</p>
                <p className="sit-stat-label">{label}</p>
              </div>
            ))}
          </div>
        </aside>

        {/* Right Side: Login Form Section */}
        <section className="sit-auth-main" aria-labelledby="login-heading">
          <div className="sit-auth-inner">
            {/* Mobile Brand Row (visible on mobile / tablet) */}
            <div className="sit-mobile-brand">
              <div className="sit-mobile-brand-box">
                <img
                  src="/images/brand/ltv-logo.png"
                  alt="LT Việt Nam"
                  className="sit-mobile-brand-img"
                />
              </div>
              <div>
                <p className="sit-brand-tagline">LT VIỆT NAM ADMIN</p>
                <p className="sit-brand-title">B2B Command Center</p>
              </div>
            </div>

            {/* Form Header */}
            <div>
              <div className="sit-access-pill">
                <ShieldCheck size={14} aria-hidden="true" />
                Quyền truy cập nội bộ
              </div>
              <h2 id="login-heading" className="sit-form-title">
                Đăng nhập quản trị
              </h2>
              <p className="sit-form-desc">
                Sử dụng tài khoản được cấp để tiếp tục vào dashboard LT Việt Nam.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} aria-busy={submitting}>
              {/* Email */}
              <div className="sit-form-field">
                <label className="sit-field-label" htmlFor="login-email">
                  Email
                </label>
                <div className="sit-input-wrapper">
                  <Mail className="sit-input-icon" aria-hidden="true" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    placeholder="name@ltvietnam.com"
                    autoComplete="username"
                    required
                    autoFocus
                    disabled={submitting}
                    className="sit-input"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="sit-form-field">
                <div className="sit-field-header">
                  <label className="sit-field-label" htmlFor="login-password">
                    Mật khẩu
                  </label>
                  {onForgotPassword && (
                    <button
                      type="button"
                      className="sit-forgot-link"
                      onClick={onForgotPassword}
                      disabled={submitting}
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
                <div className="sit-input-wrapper">
                  <LockKeyhole className="sit-input-icon" aria-hidden="true" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                    disabled={submitting}
                    className="sit-input has-eye"
                  />
                  <button
                    type="button"
                    className="sit-eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Turnstile Widget */}
              <TurnstileWidget
                action="login"
                onVerify={setCaptchaToken}
                onExpire={() => setCaptchaToken('')}
              />

              {/* Alert Error / Notice */}
              {(error || message) && (
                <div className="sit-alert-error" role="alert">
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                  <span>{error || message}</span>
                </div>
              )}

              {/* Submit Button */}
              <button type="submit" className="sit-submit-btn" disabled={submitting}>
                {submitting ? (
                  <Loader2 size={16} className="spin" aria-hidden="true" />
                ) : (
                  <ArrowRight size={16} aria-hidden="true" />
                )}
                <span>{submitting ? 'Đang xác thực…' : 'Vào dashboard'}</span>
              </button>
            </form>

            {/* Bottom Support Text */}
            <div className="sit-auth-footer">
              Nếu không truy cập được, vui lòng liên hệ quản trị viên để kiểm tra quyền tài khoản.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
