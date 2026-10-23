import React from 'react';
import { Server, Bell, ExternalLink, Menu, Sun, Moon } from 'lucide-react';
import type { AdminView } from '../types';
import { buildApiUrl, getPublicSiteUrl, getSwaggerUrl } from '../config/urls';
import { ConfiguredExternalLink } from './ConfiguredExternalLink';

interface Props {
  currentView: AdminView;
  backendConnected: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  newContactsCount?: number;
  onNavigate?: (view: AdminView) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Header: React.FC<Props> = ({
  currentView,
  backendConnected,
  sidebarOpen,
  onToggleSidebar,
  newContactsCount = 0,
  onNavigate,
  theme = 'dark',
  onToggleTheme,
}) => {
  const publicSiteUrl = getPublicSiteUrl();
  const titles: Record<AdminView, string> = {
    dashboard: 'Bảng Điều Khiển Tổng Quan',
    machines: 'Quản Lý Máy Phân Tích PAC',
    standards: 'Danh Mục Tiêu Chuẩn Quốc Tế',
    media: 'Thư Viện Hình Ảnh & Media',
    'news-events': 'Quản Lý Tin Tức & Sự Kiện',
    contacts: 'Quản Lý Yêu Cầu Liên Hệ & Leads',
    users: 'Quản Lý Tài Khoản Quản Trị',
    redirects: 'Quản Lý Chuyển Hướng 301',
    settings: 'Cấu Hình Hệ Thống & Kết Nối API',
  };

  return (
    <header className="admin-header">
      <div className="header-left">
        <button type="button" className="btn-icon sidebar-toggle" onClick={onToggleSidebar}
          aria-label="Mở menu quản trị" aria-controls="admin-navigation" aria-expanded={sidebarOpen}>
          <Menu size={22} aria-hidden="true" />
        </button>
        <h1 className="header-title">{titles[currentView] || 'Admin Portal'}</h1>
      </div>

      <div className="header-right">
        <div
          className={`backend-indicator ${
            backendConnected ? 'connected' : 'disconnected'
          }`}
          title={
            backendConnected
              ? `Đang kết nối tới NestJS API (${buildApiUrl('/api')})`
              : 'Không kết nối được tới NestJS API; dữ liệu cần được tải lại từ máy chủ'
          }
        >
          <Server size={14} />
          <span className="status-dot" />
          <span>
            {backendConnected ? 'API Live' : 'API Không Kết Nối'}
          </span>
        </div>

        <ConfiguredExternalLink
          href={publicSiteUrl}
          className="btn btn-secondary btn-sm"
          title="Xem website"
          unavailableReason="Chưa cấu hình VITE_PUBLIC_SITE_URL hợp lệ."
        >
          <span>Xem website</span>
          <ExternalLink size={14} />
        </ConfiguredExternalLink>

        <ConfiguredExternalLink
          href={getSwaggerUrl()}
          className="btn btn-secondary btn-sm"
          title="Mở tài liệu Swagger OpenAPI"
          unavailableReason="Chưa cấu hình VITE_API_BASE_URL hợp lệ."
        >
          <span className="header-secondary-label">Swagger Docs</span>
          <ExternalLink size={14} />
        </ConfiguredExternalLink>

        {onToggleTheme && (
          <button
            type="button"
            className="btn-icon theme-toggle-btn"
            title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            aria-label={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            onClick={onToggleTheme}
          >
            {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#3b82f6" />}
          </button>
        )}

        <button
          type="button"
          className="btn-icon"
          style={{ position: 'relative' }}
          title={
            newContactsCount > 0
              ? `Có ${newContactsCount} thông báo khách hàng mới cần xử lý`
              : 'Thông báo hệ thống'
          }
          aria-label={
            newContactsCount > 0
              ? `Thông báo: ${newContactsCount} khách hàng mới`
              : 'Thông báo hệ thống'
          }
          onClick={() => onNavigate?.('contacts')}
        >
          <Bell size={18} />
          {newContactsCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                minWidth: 16,
                height: 16,
                padding: '0 4px',
                borderRadius: 999,
                background: '#ef4444',
                color: '#fff',
                fontSize: '0.68rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {newContactsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
