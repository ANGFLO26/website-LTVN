import React, { useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Cpu,
  Award,
  Image as ImageIcon,
  Newspaper,
  Inbox,
  Users,
  Settings,
  ArrowRightLeft,
  LogOut,
  X,
} from 'lucide-react';
import type { AdminView } from '../types';
import type { AdminIdentity } from '../services/auth';

interface Props {
  user: AdminIdentity;
  onLogout: () => void;
  currentView: AdminView;
  onNavigate: (view: AdminView) => void;
  newContactsCount: number;
  smallScreen: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<Props> = ({
  user,
  onLogout,
  currentView,
  onNavigate,
  newContactsCount,
  smallScreen,
  isOpen,
  onClose,
}) => {
  const drawer = useRef<HTMLElement>(null);
  // Only the mobile overlay owns focus/scroll; desktop navigation stays unchanged.
  useEffect(() => {
    if (!smallScreen || !isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawer.current?.querySelector<HTMLButtonElement>('.sidebar-close')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const controls = drawer.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', keydown);
      previousFocus?.focus();
    };
  }, [smallScreen, isOpen, onClose]);
  return (
    <aside ref={drawer} id="admin-navigation" className={`admin-sidebar ${isOpen ? 'is-open' : ''}`}
      inert={smallScreen && !isOpen} role={smallScreen && isOpen ? 'dialog' : undefined}
      aria-modal={smallScreen && isOpen ? true : undefined} aria-label="Menu quản trị">
      <div className="sidebar-brand">
        <div className="brand-icon">LT</div>
        <div className="brand-info">
          <h2>LTVN Portal</h2>
          <span>PAC Instruments</span>
        </div>
        <button type="button" className="btn-icon sidebar-close" onClick={onClose} aria-label="Đóng menu quản trị">
          <X size={22} aria-hidden="true" />
        </button>
      </div>

      <nav className="sidebar-menu">
        <div className="menu-category">Tổng Quan</div>
        <button
          className={`menu-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>

        <div className="menu-category">Sản Phẩm & Kỹ Thuật</div>
        <button
          className={`menu-item ${currentView === 'machines' ? 'active' : ''}`}
          onClick={() => onNavigate('machines')}
        >
          <Cpu size={18} />
          <span>Máy Phân Tích PAC</span>
        </button>
        <button
          className={`menu-item ${currentView === 'standards' ? 'active' : ''}`}
          onClick={() => onNavigate('standards')}
        >
          <Award size={18} />
          <span>Tiêu Chuẩn Quốc Tế</span>
        </button>

        <div className="menu-category">Nội Dung & Media</div>
        <button
          className={`menu-item ${currentView === 'media' ? 'active' : ''}`}
          onClick={() => onNavigate('media')}
        >
          <ImageIcon size={18} />
          <span>Thư Viện Media</span>
        </button>
        <button
          className={`menu-item ${currentView === 'news-events' ? 'active' : ''}`}
          onClick={() => onNavigate('news-events')}
        >
          <Newspaper size={18} />
          <span>Tin Tức & Sự Kiện</span>
        </button>

        <div className="menu-category">Khách Hàng & Vận Hành</div>
        <button
          className={`menu-item ${currentView === 'contacts' ? 'active' : ''}`}
          onClick={() => onNavigate('contacts')}
        >
          <Inbox size={18} />
          <span>Yêu Cầu Liên Hệ</span>
          {newContactsCount > 0 && (
            <span className="menu-badge">{newContactsCount} mới</span>
          )}
        </button>
        <button
          className={`menu-item ${currentView === 'users' ? 'active' : ''}`}
          onClick={() => onNavigate('users')}
        >
          <Users size={18} />
          <span>Tài Khoản Quản Trị</span>
        </button>
        <button
          className={`menu-item ${currentView === 'redirects' ? 'active' : ''}`}
          onClick={() => onNavigate('redirects')}
        >
          <ArrowRightLeft size={18} />
          <span>Điều Hướng 301</span>
        </button>
        <button
          className={`menu-item ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          <Settings size={18} />
          <span>Cấu Hình API</span>
        </button>
      </nav>

      <div className="sidebar-footer">
        <div className="user-avatar">AD</div>
        <div className="user-details">
          <div className="user-name">{user.fullName}</div>
          <div className="user-role">ADMIN</div>
        </div>
        <button type="button" className="btn-icon admin-logout" onClick={onLogout} aria-label="Đăng xuất" title="Đăng xuất">
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
};
