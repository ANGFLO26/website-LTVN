import React from 'react';
import { Server, Database, FileCode, RefreshCw, CheckCircle2 } from 'lucide-react';

interface Props {
  backendConnected: boolean;
  onRefreshData: () => void;
}

export const SettingsPage: React.FC<Props> = ({ backendConnected, onRefreshData }) => {
  return (
    <div>
      <div className="page-top">
        <div className="page-title">
          <h1>Cấu Hình Hệ Thống & Kết Nối API</h1>
          <p>Thông tin môi trường phát triển, trạng thái cơ sở dữ liệu PostgreSQL và tài liệu API</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Backend API Info */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Server size={18} color="#3b82f6" />
              <div className="card-title">NestJS Backend API</div>
            </div>
            <span
              className={`badge ${
                backendConnected ? 'badge-published' : 'badge-processing'
              }`}
            >
              {backendConnected ? 'Online (Cổng 3000)' : 'Chưa kết nối'}
            </span>
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: '0.88rem' }}>
              <strong>Endpoint Gốc:</strong>{' '}
              <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>
                http://localhost:3000/api
              </code>
            </div>
            <div style={{ fontSize: '0.88rem' }}>
              <strong>Vite Dev Server (Admin):</strong>{' '}
              <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>
                http://localhost:5174
              </code>
            </div>
            <div style={{ fontSize: '0.88rem' }}>
              <strong>Reverse Proxy:</strong> Tự động chuyển tiếp các request <code>/api/*</code> sang cổng 3000.
            </div>
            <div style={{ marginTop: 12 }}>
              <a
                href="http://localhost:3000/api/docs"
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
              >
                <FileCode size={14} />
                <span>Mở Swagger OpenAPI UI (/api/docs)</span>
              </a>
            </div>
          </div>
        </div>

        {/* Database Status */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Database size={18} color="#10b981" />
              <div className="card-title">PostgreSQL Database (Drizzle ORM)</div>
            </div>
            <span className="badge badge-published">
              <CheckCircle2 size={12} />
              <span>11 Bảng Sẵn Sàng</span>
            </span>
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: '0.88rem' }}>
              <strong>Cloud Provider:</strong> Neon Serverless PostgreSQL
            </div>
            <div style={{ fontSize: '0.88rem' }}>
              <strong>Driver:</strong> <code>postgres.js</code> (Native ESM, connection pooling)
            </div>
            <div style={{ fontSize: '0.88rem' }}>
              <strong>Migration Tool:</strong> Drizzle Kit (<code>npm run db:push</code> / <code>db:generate</code>)
            </div>
            <div style={{ fontSize: '0.88rem' }}>
              <strong>Danh mục 11 bảng:</strong> users, media_assets, machines, machine_images, machine_applications, machine_highlights, machine_specs, standards, machine_standards, news_events, contacts.
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={onRefreshData}>
                <RefreshCw size={14} />
                <span>Đặt Lại Dữ Liệu Demo Mặc Định</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
