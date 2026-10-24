import React, { useMemo } from 'react';
import {
  Cpu,
  Inbox,
  Newspaper,
  Image as ImageIcon,
  ArrowUpRight,
  Check,
  Eye,
  Award,
  Sparkles,
  Plus,
  Building2,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { buildPublicUrl } from '../config/urls';
import { ConfiguredExternalLink } from '../components/ConfiguredExternalLink';
import type { Machine, Contact, NewsEvent, MediaAsset, Standard, AdminView } from '../types';

interface Props {
  machines: Machine[];
  contacts: Contact[];
  news: NewsEvent[];
  media: MediaAsset[];
  standards?: Standard[];
  onNavigate: (view: AdminView) => void;
  onUpdateContactStatus: (id: string, status: Contact['status']) => void;
}

export const DashboardPage: React.FC<Props> = ({
  machines,
  contacts,
  news,
  media,
  standards = [],
  onNavigate,
  onUpdateContactStatus,
}) => {
  // --- Computed Metrics ---
  const publishedMachines = useMemo(
    () => machines.filter((m) => m.status === 'published').length,
    [machines]
  );
  const draftMachines = useMemo(
    () => machines.filter((m) => m.status === 'draft').length,
    [machines]
  );
  const newContacts = useMemo(
    () => contacts.filter((c) => c.status === 'new').length,
    [contacts]
  );
  const bilingualNewsCount = useMemo(
    () => news.filter((n) => Boolean(n.translations?.en?.title?.trim())).length,
    [news]
  );
  const machinesWithStandardsCount = useMemo(
    () => machines.filter((m) => (m.standards?.length || 0) > 0).length,
    [machines]
  );

  // --- Spotlight Machine Resolution ---
  const spotlightMachine = useMemo(() => {
    const published = machines.filter((m) => m.status === 'published');
    // Prefer published machine with a valid main image
    const withImage = published.find(
      (m) => m.mainImageId && media.some((img) => img.id === m.mainImageId)
    );
    if (withImage) return withImage;
    if (published.length > 0) return published[0];
    return machines[0] || null;
  }, [machines, media]);

  const spotlightImage = useMemo(() => {
    if (!spotlightMachine?.mainImageId) return null;
    return media.find((img) => img.id === spotlightMachine.mainImageId) || null;
  }, [spotlightMachine, media]);

  // Resolve standards linked to spotlight machine
  const spotlightStandards = useMemo(() => {
    if (!spotlightMachine?.standards || spotlightMachine.standards.length === 0) return [];
    return spotlightMachine.standards
      .map((ms) => {
        if (ms.standard) return ms.standard;
        return standards.find((s) => s.id === ms.standardId);
      })
      .filter((s): s is Standard => Boolean(s))
      .slice(0, 3);
  }, [spotlightMachine, standards]);

  // --- Top ASTM / ISO Standards Matrix ---
  const topStandards = useMemo(() => {
    const usageMap = new Map<string, number>();
    for (const m of machines) {
      if (m.standards && Array.isArray(m.standards)) {
        for (const ms of m.standards) {
          const key = ms.standardId || ms.standard?.id;
          if (key) {
            usageMap.set(key, (usageMap.get(key) || 0) + 1);
          }
        }
      }
    }

    return standards
      .map((s) => ({
        ...s,
        count: usageMap.get(s.id) || 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [machines, standards]);

  // --- Recent Contacts Prioritizing 'new' ---
  const prioritizedContacts = useMemo(() => {
    return [...contacts]
      .sort((a, b) => {
        if (a.status === 'new' && b.status !== 'new') return -1;
        if (a.status !== 'new' && b.status === 'new') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 5);
  }, [contacts]);

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${hours}:${mins} ${day}/${month}`;
    } catch {
      return '—';
    }
  };

  return (
    <div>
      {/* Top Banner with Telemetry Status */}
      <div className="page-top">
        <div className="page-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0 }}>Trung Tâm Điều Hành</h1>
            <span className="live-pulse-badge">
              <span className="live-pulse-dot" />
              <span>Hệ Thống Trực Tuyến</span>
            </span>
          </div>
          <p style={{ marginTop: 4 }}>
            Tổng quan danh mục máy phân tích PAC, van Masoneilan và luồng xử lý báo giá kỹ thuật
          </p>
        </div>

        <div className="page-actions" style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => onNavigate('media')}>
            <ImageIcon size={16} />
            <span>Thư Viện Ảnh</span>
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('standards')}>
            <Award size={16} />
            <span>Chuẩn ASTM</span>
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('machines')}>
            <Plus size={16} />
            <span>Thêm Máy PAC</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="stat-grid">
        {/* RFQ / Contacts */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('contacts')}>
          <div
            className="stat-icon"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}
          >
            <Inbox size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{newContacts} Yêu Cầu Mới</div>
            <div className="stat-label">Báo Giá & Tư Vấn Cần Xử Lý</div>
            <div className="stat-subtext">
              {newContacts > 0 ? (
                <span className="stat-subtext-badge stat-subtext-badge-amber">
                  Cần phản hồi sớm ({contacts.length} tổng)
                </span>
              ) : (
                <span className="stat-subtext-badge stat-subtext-badge-emerald">
                  Đã giải quyết tất cả ({contacts.length} tổng)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* PAC Fleet */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('machines')}>
          <div
            className="stat-icon"
            style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}
          >
            <Cpu size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">
              {publishedMachines} / {machines.length}
            </div>
            <div className="stat-label">Thiết Bị PAC Đã Xuất Bản</div>
            <div className="stat-subtext">
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>{draftMachines} bản nháp</span>
              <span>đang hoàn thiện catalog</span>
            </div>
          </div>
        </div>

        {/* ASTM Standards Coverage */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('standards')}>
          <div
            className="stat-icon"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}
          >
            <Award size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{standards.length} Tiêu Chuẩn</div>
            <div className="stat-label">Quy Chuẩn Quốc Tế ASTM / ISO</div>
            <div className="stat-subtext">
              <span>Độ phủ trên</span>
              <strong style={{ color: '#34d399' }}>{machinesWithStandardsCount} dòng máy</strong>
            </div>
          </div>
        </div>

        {/* Technical Articles & Events */}
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onNavigate('news-events')}>
          <div
            className="stat-icon"
            style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}
          >
            <Newspaper size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{news.length} Bài Viết</div>
            <div className="stat-label">Tin Chuyển Giao & Sự Kiện</div>
            <div className="stat-subtext">
              <span>Song ngữ:</span>
              <strong style={{ color: '#a78bfa' }}>{bilingualNewsCount} bản tiếng Anh</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Bento Grid */}
      <div className="dashboard-grid">
        {/* Left Column (60%): RFQ Command Dispatcher */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="card-title">Trung Tâm Tiếp Nhận RFQ & Báo Giá</div>
              {newContacts > 0 && (
                <span className="badge badge-new" style={{ fontSize: '0.72rem' }}>
                  {newContacts} mới
                </span>
              )}
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('contacts')}
              title="Mở toàn bộ danh sách liên hệ"
            >
              <span>Xem tất cả ({contacts.length})</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="table-responsive" style={{ flex: 1 }}>
            {prioritizedContacts.length === 0 ? (
              <div className="empty-state-box">
                <CheckCircle2 size={36} style={{ color: '#10b981' }} />
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  Không có yêu cầu liên hệ nào tồn đọng
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  Mọi yêu cầu tư vấn và báo giá từ khách hàng đều đã được tiếp nhận và xử lý.
                </div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Khách hàng & Thời gian</th>
                    <th>Đơn vị / Đơn hàng</th>
                    <th>Nội dung quan tâm</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {prioritizedContacts.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.fullName}</div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            marginTop: 2,
                          }}
                        >
                          <Clock size={12} style={{ color: 'var(--text-faint)' }} />
                          <span>{formatDate(c.createdAt)}</span>
                          {c.phone && <span>• {c.phone}</span>}
                        </div>
                      </td>

                      <td>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            color: 'var(--text-main)',
                            fontSize: '0.85rem',
                          }}
                        >
                          <Building2 size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 500 }}>{c.companyName || 'Khách hàng cá nhân'}</span>
                        </div>
                      </td>

                      <td style={{ maxWidth: 220 }}>
                        <div
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontSize: '0.84rem',
                            color: 'var(--text-main)',
                          }}
                          title={c.subject || c.message}
                        >
                          {c.subject || c.message}
                        </div>
                        {c.subject && c.message && (
                          <div
                            style={{
                              fontSize: '0.73rem',
                              color: 'var(--text-faint)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginTop: 2,
                            }}
                          >
                            {c.message}
                          </div>
                        )}
                      </td>

                      <td>
                        <StatusBadge status={c.status} />
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          {c.status === 'new' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Chuyển sang trạng thái đang xử lý báo giá"
                              onClick={async () => {
                                try {
                                  await onUpdateContactStatus(c.id, 'processing');
                                } catch {
                                  // Handled by App notification
                                }
                              }}
                            >
                              <Check size={14} />
                              <span>Xử lý</span>
                            </button>
                          )}
                          <button
                            className="btn-icon"
                            title="Xem chi tiết nội dung liên hệ"
                            onClick={() => onNavigate('contacts')}
                          >
                            <Eye size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Quick Action Footer Strip */}
          <div className="quick-action-strip">
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginRight: 4 }}>
              TÁC VỤ NHANH:
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('machines')}>
              <Plus size={14} />
              <span>Thêm Máy PAC</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('standards')}>
              <Award size={14} />
              <span>Gán Chuẩn ASTM</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('news-events')}>
              <Newspaper size={14} />
              <span>Đăng Tin Kỹ Thuật</span>
            </button>
          </div>
        </div>

        {/* Right Column (40%): Equipment Spotlight & ASTM Standards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Featured Spotlight Card */}
          <div className="card spotlight-card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={16} style={{ color: '#f59e0b' }} />
                <div className="card-title" style={{ fontSize: '0.95rem' }}>
                  Tiêu Điểm Thiết Bị PAC
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate('machines')}
                title="Quản lý toàn bộ danh mục máy"
              >
                <span>Tất cả máy</span>
                <ArrowUpRight size={14} />
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {spotlightMachine ? (
                <>
                  <div className="spotlight-img-wrap">
                    <img
                      src={
                        spotlightImage?.publicUrl ||
                        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='200' viewBox='0 0 400 200'><rect fill='%230f172a' width='400' height='200'/><text fill='%2338bdf8' font-family='sans-serif' font-size='16' font-weight='bold' x='50%' y='50%' text-anchor='middle'>PAC PETROLEUM ANALYZER</text></svg>"
                      }
                      alt={spotlightMachine.name}
                      className="spotlight-img"
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span className="model-tag">{spotlightMachine.model || 'PAC Analytical'}</span>
                      <StatusBadge status={spotlightMachine.status} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', lineHeight: 1.35 }}>
                      {spotlightMachine.name}
                    </div>
                    {spotlightMachine.shortDescription && (
                      <p
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--text-muted)',
                          margin: '6px 0 0 0',
                          lineHeight: 1.45,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {spotlightMachine.shortDescription}
                      </p>
                    )}
                  </div>

                  {spotlightStandards.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 600 }}>
                        TIÊU CHUẨN:
                      </span>
                      {spotlightStandards.map((std) => (
                        <span
                          key={std.id}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#34d399',
                            borderRadius: 4,
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                          }}
                        >
                          {std.code}
                        </span>
                      ))}
                    </div>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginTop: 4,
                      paddingTop: 12,
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <ConfiguredExternalLink
                      href={buildPublicUrl(`/san-pham/${spotlightMachine.slug}`)}
                      className="btn btn-secondary btn-sm"
                      title="Xem trang sản phẩm trên website"
                      unavailableReason="Chưa cấu hình URL website công khai."
                    >
                      <span>Xem trên Web</span>
                      <ArrowUpRight size={13} />
                    </ConfiguredExternalLink>

                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => onNavigate('machines')}
                    >
                      <Cpu size={14} />
                      <span>Cập Nhật Thông Số</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-state-box">
                  <Cpu size={32} style={{ color: 'var(--text-faint)' }} />
                  <div>Chưa có thiết bị nào trong hệ thống</div>
                </div>
              )}
            </div>
          </div>

          {/* ASTM & ISO Standards Frequency Matrix */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={16} style={{ color: '#10b981' }} />
                <div className="card-title" style={{ fontSize: '0.95rem' }}>
                  Ma Trận Tiêu Chuẩn Phân Tích
                </div>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate('standards')}
                title="Quản lý toàn bộ thư viện tiêu chuẩn"
              >
                <span>Xem tất cả</span>
                <ArrowUpRight size={14} />
              </button>
            </div>

            <div style={{ padding: 20 }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                Phương pháp thử nghiệm ASTM / ISO được áp dụng nhiều nhất:
              </div>

              {topStandards.length === 0 ? (
                <div style={{ color: 'var(--text-faint)', fontSize: '0.85rem' }}>
                  Chưa có tiêu chuẩn nào được tạo.
                </div>
              ) : (
                <div className="standards-chip-grid">
                  {topStandards.map((std) => (
                    <div
                      key={std.id}
                      className="standard-chip"
                      onClick={() => onNavigate('standards')}
                      title={`${std.code} (${std.organization}) - ${std.title || 'Tiêu chuẩn thử nghiệm'}`}
                    >
                      <span>{std.code}</span>
                      <span className="standard-chip-count">{std.count} máy</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Catalog Health Progress */}
              <div
                style={{
                  marginTop: 20,
                  paddingTop: 16,
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem' }}>
                  <span style={{ color: '#34d399', fontWeight: 600 }}>Đã Xuất Bản</span>
                  <span style={{ fontWeight: 700 }}>
                    {publishedMachines} / {machines.length || 1} máy (
                    {Math.round((publishedMachines / (machines.length || 1)) * 100)}%)
                  </span>
                </div>
                <div
                  style={{
                    height: 7,
                    background: 'var(--border-subtle)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      background: '#10b981',
                      borderRadius: 4,
                      width: `${(publishedMachines / (machines.length || 1)) * 100}%`,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
