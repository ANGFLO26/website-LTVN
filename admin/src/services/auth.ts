import { buildApiUrl } from '../config/urls';

function apiUrl(endpoint: string): string {
  const url = buildApiUrl(endpoint);
  if (!url) throw new Error('VITE_API_BASE_URL chưa được cấu hình hợp lệ.');
  return url;
}

export interface AdminIdentity {
  id: string;
  email: string;
  fullName: string;
  role: 'admin';
}

interface Session {
  accessToken: string;
  expiresAt: number;
}

interface LoginResponse extends Session {
  user: AdminIdentity;
}

const SESSION_KEY = 'ltvn_admin_session';
export const AUTH_EXPIRED_EVENT = 'ltvn:auth-expired';

function readSession(): Session | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
    if (value && typeof value === 'object' && 'accessToken' in value && 'expiresAt' in value &&
        typeof value.accessToken === 'string' && value.accessToken &&
        typeof value.expiresAt === 'number' && value.expiresAt > Date.now()) {
      return { accessToken: value.accessToken, expiresAt: value.expiresAt };
    }
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // If browser storage is unavailable, login lasts only for this page lifetime.
  }
  return null;
}

let session = readSession();

function clearSession() {
  session = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* Memory is already cleared. */ }
}

function expireSession() {
  clearSession();
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

export async function adminFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const current = session;
  if (!current || current.expiresAt <= Date.now()) {
    expireSession();
    throw new Error('Phiên đăng nhập đã hết hạn.');
  }
  const headers = new Headers(options?.headers);
  headers.set('Authorization', `Bearer ${current.accessToken}`);
  const response = await fetch(apiUrl(endpoint), { ...options, headers });
  // A late response from a previous session must not log out a newer login.
  if (response.status === 401 && session?.accessToken === current.accessToken) {
    expireSession();
  }
  return response;
}

export const auth = {
  getSession: () => session,
  logout: clearSession,
  expire: expireSession,

  async login(email: string, password: string, captchaToken?: string): Promise<AdminIdentity> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (captchaToken) {
      headers['X-Captcha-Token'] = captchaToken;
    }
    const response = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 429) {
      throw new Error('Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau ít phút.');
    }
    if (response.status === 400) {
      const data = await response.json().catch(() => ({}));
      const msg = typeof data?.message === 'string'
        ? data.message
        : Array.isArray(data?.message)
          ? data.message.join(', ')
          : 'Yêu cầu đăng nhập không hợp lệ hoặc thiếu mã bảo vệ.';
      throw new Error(msg);
    }
    if (response.status === 401 || response.status === 403) {
      const data = await response.json().catch(() => ({}));
      const msg = typeof data?.message === 'string'
        ? data.message
        : 'Email hoặc mật khẩu không đúng, hoặc tài khoản không có quyền Admin đang hoạt động.';
      throw new Error(msg);
    }
    if (!response.ok) throw new Error('Không thể đăng nhập lúc này. Vui lòng thử lại.');
    const data = await response.json() as LoginResponse;
    if (!data.accessToken || !Number.isFinite(data.expiresAt) || data.expiresAt <= Date.now() || data.user?.role !== 'admin') {
      throw new Error('Phản hồi đăng nhập không hợp lệ.');
    }
    session = { accessToken: data.accessToken, expiresAt: data.expiresAt };
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* Keep the session in memory. */ }
    return data.user;
  },

  async me(): Promise<AdminIdentity> {
    const response = await adminFetch('/api/auth/me', { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Không thể xác minh phiên đăng nhập. Vui lòng đăng nhập lại.');
    const user = await response.json() as AdminIdentity;
    if (user.role !== 'admin') { expireSession(); throw new Error('Tài khoản không có quyền Admin.'); }
    return user;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await adminFetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const msg = typeof data?.message === 'string'
        ? data.message
        : Array.isArray(data?.message)
          ? data.message.join(', ')
          : 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại.';
      throw new Error(msg);
    }
    return response.json() as Promise<{ message: string }>;
  },

  async forgotPassword(email: string, captchaToken?: string): Promise<{ message: string }> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (captchaToken) {
      headers['X-Captcha-Token'] = captchaToken;
    }
    const response = await fetch(apiUrl('/api/auth/forgot-password'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 429) {
      throw new Error('Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.');
    }
    if (response.status === 400) {
      const data = await response.json().catch(() => ({}));
      const msg = typeof data?.message === 'string'
        ? data.message
        : Array.isArray(data?.message)
          ? data.message.join(', ')
          : 'Yêu cầu không hợp lệ hoặc thiếu mã bảo vệ.';
      throw new Error(msg);
    }
    if (!response.ok) {
      throw new Error('Không thể gửi yêu cầu đặt lại mật khẩu lúc này. Vui lòng thử lại.');
    }
    const data = await response.json().catch(() => ({}));
    return {
      message: typeof data?.message === 'string'
        ? data.message
        : 'Nếu tài khoản phù hợp tồn tại, hướng dẫn đặt lại mật khẩu sẽ được gửi tới địa chỉ đã đăng ký.',
    };
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const response = await fetch(apiUrl('/api/auth/reset-password'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 429) {
      throw new Error('Bạn đã thử đặt lại mật khẩu quá nhiều lần. Vui lòng thử lại sau ít phút.');
    }
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const msg = typeof data?.message === 'string'
        ? data.message
        : Array.isArray(data?.message)
          ? data.message.join(', ')
          : 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.';
      throw new Error(msg);
    }
    return response.json() as Promise<{ message: string }>;
  },
};
