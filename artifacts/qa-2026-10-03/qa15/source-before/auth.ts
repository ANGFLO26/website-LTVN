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
  const response = await fetch(endpoint, { ...options, headers });
  // A late response from a previous session must not log out a newer login.
  if ((response.status === 401 || response.status === 403) && session?.accessToken === current.accessToken) {
    expireSession();
  }
  return response;
}

export const auth = {
  getSession: () => session,
  logout: clearSession,
  expire: expireSession,

  async login(email: string, password: string): Promise<AdminIdentity> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 401 || response.status === 403) {
      throw new Error('Email hoặc mật khẩu không đúng, hoặc tài khoản không có quyền Admin đang hoạt động.');
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
};
