import React from 'react';
import { Cpu, Inbox, Newspaper, Image as ImageIcon, ArrowUpRight, Check, Eye } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import type { Machine, Contact, NewsEvent, MediaAsset, AdminView } from '../types';

interface Props {
  machines: Machine[];
  contacts: Contact[];
  news: NewsEvent[];
  media: MediaAsset[];
  onNavigate: (view: AdminView) => void;
  onUpdateContactStatus: (id: string, status: Contact['status']) => void;
}

export const DashboardPage: React.FC<Props> = ({
  machines,
  contacts,
  news,
  media,
  onNavigate,
  onUpdateContactStatus,
}) => {
  const publishedMachines = machines.filter((m) => m.status === 'published').length;
  const newContacts = contacts.filter((c) => c.status === 'new').length;
  const totalStorageKb = Math.round(media.reduce((acc, m) => acc + m.sizeBytes, 0) / 1024);

  return (
    <div>
      {/* Top Banner */}
      <div className="page-top">
        <div className="page-title">
          <h1>Tổng Quan Hệ Thống</h1>
          <p>Báo cáo hoạt động website và danh sách thiết bị phân tích PAC</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => onNavigate('media')}>
            <ImageIcon size={16} />
            <span>Thư Viện Ảnh</span>
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('machines')}>
            <Cpu size={16} />
            <span>Quản Lý Máy PAC</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid">
        <StatCard
          label="Máy PAC Đã Đăng"
          value={`${publishedMachines} / ${machines.length}`}
          icon={Cpu}
          colorBg="rgba(59, 130, 246, 0.15)"
          colorIcon="#3b82f6"
        />
        <StatCard
          label="Yêu Cầu Liên Hệ Mới"
          value={newContacts}
          icon={Inbox}
          colorBg="rgba(245, 158, 11, 0.15)"
          colorIcon="#f59e0b"
        />
        <StatCard
          label="Tin Tức & Sự Kiện"
          value={news.length}
          icon={Newspaper}
          colorBg="rgba(16, 185, 129, 0.15)"
          colorIcon="#10b981"
        />
        <StatCard
          label="Tài Nguyên Media"
          value={`${media.length} tệp (${totalStorageKb} KB)`}
          icon={ImageIcon}
          colorBg="rgba(139, 92, 246, 0.15)"
          colorIcon="#8b5cf6"
        />
      </div>

      {/* Grid Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Urgent Contacts */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Yêu Cầu Liên Hệ & Báo Giá Cần Xử Lý</div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('contacts')}
            >
              <span>Xem tất cả</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Công ty / Đơn vị</th>
                  <th>Chủ đề</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {contacts.slice(0, 4).map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {c.phone || c.email}
                      </div>
                    </td>
                    <td>{c.companyName || '—'}</td>
                    <td style={{ maxWidth: 220 }}>
                      <div
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {c.subject || c.message}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {c.status === 'new' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Đánh dấu đang xử lý"
                            onClick={() => onUpdateContactStatus(c.id, 'processing')}
                          >
                            <Check size={14} />
                            <span>Xử lý</span>
                          </button>
                        )}
                        <button
                          className="btn-icon"
                          title="Xem chi tiết"
                          onClick={() => onNavigate('contacts')}
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Machine Status Breakdown */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div className="card-title">Phân Bổ Danh Mục Máy PAC</div>
          </div>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.82rem' }}>
                <span style={{ color: '#34d399', fontWeight: 600 }}>Đã Xuất Bản (Published)</span>
                <span style={{ fontWeight: 700 }}>
                  {machines.filter((m) => m.status === 'published').length}
                </span>
              </div>
              <div style={{ height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    background: '#10b981',
                    width: `${(machines.filter((m) => m.status === 'published').length / (machines.length || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.82rem' }}>
                <span style={{ color: '#94a3b8', fontWeight: 600 }}>Bản Nháp (Draft)</span>
                <span style={{ fontWeight: 700 }}>
                  {machines.filter((m) => m.status === 'draft').length}
                </span>
              </div>
              <div style={{ height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    background: '#64748b',
                    width: `${(machines.filter((m) => m.status === 'draft').length / (machines.length || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #1e293b' }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => onNavigate('machines')}
              >
                <span>Mở Danh Sách Máy PAC</span>
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
