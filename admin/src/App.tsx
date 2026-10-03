import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { MachinesPage } from './pages/MachinesPage';
import { StandardsPage } from './pages/StandardsPage';
import { MediaPage } from './pages/MediaPage';
import { NewsEventsPage } from './pages/NewsEventsPage';
import { ContactsPage } from './pages/ContactsPage';
import { UsersPage } from './pages/UsersPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { auth, AUTH_EXPIRED_EVENT, type AdminIdentity } from './services/auth';
import { api } from './services/api';
import type {
  AdminView,
  Machine,
  Standard,
  MediaAsset,
  MediaCreateInput,
  NewsEvent,
  Contact,
  User,
} from './types';
import './admin.css';

function AdminDashboard({ user, onLogout }: { user: AdminIdentity; onLogout: (message?: string) => void }) {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [smallScreen, setSmallScreen] = useState(() => window.matchMedia('(max-width: 1023px)').matches);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const [backendConnected, setBackendConnected] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // App Data State
  const [machines, setMachines] = useState<Machine[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Show toast helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getErrorMessage = (err: unknown, fallback: string): string => {
    if (err instanceof Error && err.message) {
      return err.message;
    }
    return fallback;
  };

  // Load initial data
  const loadData = async () => {
    try {
      const [m, s, med, n, c, u] = await Promise.all([
        api.getMachines(),
        api.getStandards(),
        api.getMedia(),
        api.getNewsEvents(),
        api.getContacts(),
        api.getUsers(),
      ]);
      setMachines(m);
      setStandards(s);
      setMedia(med);
      setNews(n);
      setContacts(c);
      setUsers(u);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  useEffect(() => {
    loadData();

    // Check backend connection
    api.checkBackend().then((online) => setBackendConnected(online));
    const interval = setInterval(() => {
      api.checkBackend().then((online) => setBackendConnected(online));
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Handlers for Machines
  const handleSaveMachine = async (m: Machine) => {
    try {
      await api.saveMachine(m);
      setMachines(await api.getMachines());
      showToast('Đã lưu thông tin Máy PAC thành công!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Lưu thông tin Máy PAC thất bại.'), 'error');
      throw err;
    }
  };

  const handleDeleteMachine = async (id: string) => {
    try {
      await api.deleteMachine(id);
      setMachines(await api.getMachines());
      showToast('Đã xóa máy PAC khỏi danh mục!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Xóa máy PAC thất bại.'), 'error');
      throw err;
    }
  };

  // Handlers for Standards
  const handleSaveStandard = async (s: Standard) => {
    try {
      await api.saveStandard(s);
      setStandards(await api.getStandards());
      showToast('Đã lưu tiêu chuẩn quốc tế thành công!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Lưu tiêu chuẩn thất bại.'), 'error');
      throw err;
    }
  };

  const handleDeleteStandard = async (id: string) => {
    try {
      await api.deleteStandard(id);
      setStandards(await api.getStandards());
      showToast('Đã xóa tiêu chuẩn!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Xóa tiêu chuẩn thất bại.'), 'error');
      throw err;
    }
  };

  // Handlers for Media
  const handleSaveMedia = async (asset: MediaCreateInput) => {
    try {
      await api.saveMedia(asset);
      setMedia(await api.getMedia());
      showToast('Đã thêm tệp vào thư viện Media!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Thêm tệp media thất bại.'), 'error');
      throw err;
    }
  };

  const handleDeleteMedia = async (id: string) => {
    try {
      await api.deleteMedia(id);
      setMedia(await api.getMedia());
      showToast('Đã xóa tệp media!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Xóa tệp media thất bại.'), 'error');
      throw err;
    }
  };

  // Handlers for News
  const handleSaveNews = async (item: NewsEvent) => {
    try {
      await api.saveNewsEvent(item);
      setNews(await api.getNewsEvents());
      showToast('Đã cập nhật bài viết tin tức / sự kiện!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Lưu bài viết thất bại.'), 'error');
      throw err;
    }
  };

  const handleDeleteNews = async (id: string) => {
    try {
      await api.deleteNewsEvent(id);
      setNews(await api.getNewsEvents());
      showToast('Đã xóa bài viết!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Xóa bài viết thất bại.'), 'error');
      throw err;
    }
  };

  // Handlers for Contacts
  const handleUpdateContactStatus = async (id: string, status: Contact['status'], note?: string) => {
    try {
      await api.updateContactStatus(id, status, note);
      setContacts(await api.getContacts());
      showToast('Đã cập nhật trạng thái liên hệ!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Cập nhật trạng thái liên hệ thất bại.'), 'error');
      throw err;
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      await api.deleteContact(id);
      setContacts(await api.getContacts());
      showToast('Đã xóa yêu cầu liên hệ!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Xóa yêu cầu liên hệ thất bại.'), 'error');
      throw err;
    }
  };

  // Handlers for Users
  const handleSaveUser = async (u: User) => {
    try {
      await api.saveUser(u);
      setUsers(await api.getUsers());
      showToast('Đã lưu tài khoản quản trị!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Lưu tài khoản quản trị thất bại.'), 'error');
      throw err;
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await api.deleteUser(id);
      setUsers(await api.getUsers());
      showToast('Đã xóa tài khoản!', 'success');
    } catch (err) {
      showToast(getErrorMessage(err, 'Xóa tài khoản thất bại.'), 'error');
      throw err;
    }
  };

  const handleResetData = async () => {
    localStorage.clear();
    await loadData();
    showToast('Đã khôi phục dữ liệu mẫu gốc!', 'success');
  };

  const newContactsCount = contacts.filter((c) => c.status === 'new').length;

  useEffect(() => {
    const breakpoint = window.matchMedia('(max-width: 1023px)');
    const update = () => { setSmallScreen(breakpoint.matches); setSidebarOpen(false); };
    breakpoint.addEventListener('change', update);
    return () => breakpoint.removeEventListener('change', update);
  }, []);

  const navigate = (view: AdminView) => { setCurrentView(view); setSidebarOpen(false); };

  return (
    <div className="admin-shell">
      {/* Left Sidebar */}
      <Sidebar
        smallScreen={smallScreen}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        user={user}
        onLogout={() => onLogout()}
        currentView={currentView}
        onNavigate={navigate}
        newContactsCount={newContactsCount}
      />
      {smallScreen && sidebarOpen && (
        <button className="sidebar-backdrop" aria-label="Đóng menu quản trị bằng nền" tabIndex={-1}
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Panel */}
      <div className="admin-main" inert={smallScreen && sidebarOpen}>
        <Header currentView={currentView} backendConnected={backendConnected}
          sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(open => !open)} />

        <main className="admin-content">
          {currentView === 'dashboard' && (
            <DashboardPage
              machines={machines}
              contacts={contacts}
              news={news}
              media={media}
              onNavigate={navigate}
              onUpdateContactStatus={handleUpdateContactStatus}
            />
          )}

          {currentView === 'machines' && (
            <MachinesPage
              machines={machines}
              standards={standards}
              media={media}
              onSave={handleSaveMachine}
              onDelete={handleDeleteMachine}
            />
          )}

          {currentView === 'standards' && (
            <StandardsPage
              standards={standards}
              onSave={handleSaveStandard}
              onDelete={handleDeleteStandard}
            />
          )}

          {currentView === 'media' && (
            <MediaPage
              media={media}
              onSave={handleSaveMedia}
              onDelete={handleDeleteMedia}
            />
          )}

          {currentView === 'news-events' && (
            <NewsEventsPage
              news={news}
              media={media}
              onSave={handleSaveNews}
              onDelete={handleDeleteNews}
            />
          )}

          {currentView === 'contacts' && (
            <ContactsPage
              contacts={contacts}
              onUpdateStatus={handleUpdateContactStatus}
              onDelete={handleDeleteContact}
            />
          )}

          {currentView === 'users' && (
            <UsersPage
              users={users}
              onSave={handleSaveUser}
              onDelete={handleDeleteUser}
            />
          )}

          {currentView === 'settings' && (
            <SettingsPage
              backendConnected={backendConnected}
              onRefreshData={handleResetData}
              onPasswordChanged={() => onLogout('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.')}
            />
          )}
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            <span style={{ color: toast.type === 'success' ? '#34d399' : '#f87171', fontWeight: 'bold' }}>
              {toast.type === 'success' ? '✓' : '✗'}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function App() {
  const [user, setUser] = useState<AdminIdentity | null>(null);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    const handleExpired = () => {
      setUser(null);
      setChecking(false);
      setMessage('Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.');
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    if (!auth.getSession()) {
      setChecking(false);
    } else {
      auth.me().then((identity) => {
        if (!cancelled && auth.getSession()) setUser(identity);
      }).catch(() => {
        if (!cancelled) {
          auth.logout();
          setMessage('Không thể xác minh phiên đăng nhập. Vui lòng đăng nhập lại.');
        }
      }).finally(() => { if (!cancelled) setChecking(false); });
    }
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    };
  }, []);

  useEffect(() => {
    const session = auth.getSession();
    if (!user || !session) return;
    const timer = window.setTimeout(auth.expire, Math.max(0, session.expiresAt - Date.now()));
    return () => window.clearTimeout(timer);
  }, [user]);

  function logout(customMessage?: unknown) {
    auth.logout();
    setUser(null);
    setMessage(typeof customMessage === 'string' ? customMessage : '');
  }

  if (checking) return <main className="auth-screen auth-loading" role="status">Đang xác minh phiên đăng nhập…</main>;
  if (!user) return <LoginPage message={message} onAuthenticated={(identity) => { setMessage(''); setUser(identity); }} />;
  return <AdminDashboard user={user} onLogout={logout} />;
}

export default App;
