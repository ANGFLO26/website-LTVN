import React from 'react';
import { Server, Bell, ExternalLink } from 'lucide-react';
import type { AdminView } from '../types';
import { buildApiUrl, getPublicSiteUrl, getSwaggerUrl } from '../config/urls';
import { ConfiguredExternalLink } from './ConfiguredExternalLink';

interface Props {
  currentView: AdminView;
  backendConnected: boolean;
}

export const Header: React.FC<Props> = ({ currentView, backendConnected }) => {
  const publicSiteUrl = getPublicSiteUrl();
  const titles: Record<AdminView, string> = {
    dashboard: 'Bảng Điều Khiển Tổng Quan',
    machines: 'Quản Lý Máy Phân Tích PAC',
    standards: 'Danh Mục Tiêu Chuẩn Quốc Tế',
    media: 'Thư Viện Hình Ảnh & Media',
    'news-events': 'Quản Lý Tin Tức & Sự Kiện',
    contacts: 'Quản Lý Yêu Cầu Liên Hệ & Leads',
    users: 'Quản Lý Tài Khoản Quản Trị',
    settings: 'Cấu Hình Hệ Thống & Kết Nối API',
  };

  return (
    <header className="admin-header">
      <div className="header-left">
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
              : 'Backend offline, đang sử dụng Local Storage cache'
          }
        >
          <Server size={14} />
          <span className="status-dot" />
          <span>
            {backendConnected ? 'API Live' : 'Local Storage Mode'}
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
          <span>Swagger Docs</span>
          <ExternalLink size={14} />
        </ConfiguredExternalLink>

        <button className="btn-icon" title="Thông báo hệ thống">
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
};
