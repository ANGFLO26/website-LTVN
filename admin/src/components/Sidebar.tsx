import React from 'react';
import {
  LayoutDashboard,
  Cpu,
  Award,
  Image as ImageIcon,
  Newspaper,
  Inbox,
  Users,
  Settings,
} from 'lucide-react';
import type { AdminView } from '../types';

interface Props {
  currentView: AdminView;
  onNavigate: (view: AdminView) => void;
  newContactsCount: number;
}

export const Sidebar: React.FC<Props> = ({
  currentView,
  onNavigate,
  newContactsCount,
}) => {
  return (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">LT</div>
        <div className="brand-info">
          <h2>LTVN Portal</h2>
          <span>PAC Instruments</span>
        </div>
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
          <div className="user-name">Admin LTVN</div>
          <div className="user-role">Super Administrator</div>
        </div>
      </div>
    </aside>
  );
};
