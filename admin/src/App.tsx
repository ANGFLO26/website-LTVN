import React, { useState, useEffect } from 'react';
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
import { api } from './services/api';
import type {
  AdminView,
  Machine,
  Standard,
  MediaAsset,
  NewsEvent,
  Contact,
  User,
} from './types';
import './admin.css';

export function App() {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [backendConnected, setBackendConnected] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // App Data State
  const [machines, setMachines] = useState<Machine[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [news, setNews] = useState<NewsEvent[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Show toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
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
    await api.saveMachine(m);
    setMachines(await api.getMachines());
    showToast('Đã lưu thông tin Máy PAC thành công!');
  };

  const handleDeleteMachine = async (id: string) => {
    await api.deleteMachine(id);
    setMachines(await api.getMachines());
    showToast('Đã xóa máy PAC khỏi danh mục!');
  };

  // Handlers for Standards
  const handleSaveStandard = async (s: Standard) => {
    await api.saveStandard(s);
    setStandards(await api.getStandards());
    showToast('Đã lưu tiêu chuẩn quốc tế thành công!');
  };

  const handleDeleteStandard = async (id: string) => {
    await api.deleteStandard(id);
    setStandards(await api.getStandards());
    showToast('Đã xóa tiêu chuẩn!');
  };

  // Handlers for Media
  const handleSaveMedia = async (asset: MediaAsset) => {
    await api.saveMedia(asset);
    setMedia(await api.getMedia());
    showToast('Đã thêm tệp vào thư viện Media!');
  };

  const handleDeleteMedia = async (id: string) => {
    await api.deleteMedia(id);
    setMedia(await api.getMedia());
    showToast('Đã xóa tệp media!');
  };

  // Handlers for News
  const handleSaveNews = async (item: NewsEvent) => {
    await api.saveNewsEvent(item);
    setNews(await api.getNewsEvents());
    showToast('Đã cập nhật bài viết tin tức / sự kiện!');
  };

  const handleDeleteNews = async (id: string) => {
    await api.deleteNewsEvent(id);
    setNews(await api.getNewsEvents());
    showToast('Đã xóa bài viết!');
  };

  // Handlers for Contacts
  const handleUpdateContactStatus = async (id: string, status: Contact['status'], note?: string) => {
    await api.updateContactStatus(id, status, note);
    setContacts(await api.getContacts());
    showToast('Đã cập nhật trạng thái liên hệ!');
  };

  const handleDeleteContact = async (id: string) => {
    await api.deleteContact(id);
    setContacts(await api.getContacts());
    showToast('Đã xóa yêu cầu liên hệ!');
  };

  // Handlers for Users
  const handleSaveUser = async (u: User) => {
    await api.saveUser(u);
    setUsers(await api.getUsers());
    showToast('Đã lưu tài khoản quản trị!');
  };

  const handleDeleteUser = async (id: string) => {
    await api.deleteUser(id);
    setUsers(await api.getUsers());
    showToast('Đã xóa tài khoản!');
  };

  const handleResetData = async () => {
    localStorage.clear();
    await loadData();
    showToast('Đã khôi phục dữ liệu mẫu gốc!');
  };

  const newContactsCount = contacts.filter((c) => c.status === 'new').length;

  return (
    <div className="admin-shell">
      {/* Left Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        newContactsCount={newContactsCount}
      />

      {/* Main Panel */}
      <div className="admin-main">
        <Header currentView={currentView} backendConnected={backendConnected} />

        <main className="admin-content">
          {currentView === 'dashboard' && (
            <DashboardPage
              machines={machines}
              contacts={contacts}
              news={news}
              media={media}
              onNavigate={setCurrentView}
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
            />
          )}
        </main>
      </div>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast">
            <span style={{ color: '#34d399' }}>✓</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
