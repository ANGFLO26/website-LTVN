import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Calendar, MapPin } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { NewsEvent, MediaAsset } from '../types';

interface Props {
  news: NewsEvent[];
  media: MediaAsset[];
  onSave: (item: NewsEvent) => void;
  onDelete: (id: string) => void;
}

export const NewsEventsPage: React.FC<Props> = ({ news, media, onSave, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'news' | 'event'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<NewsEvent | null>(null);

  const emptyItem: NewsEvent = {
    id: '',
    type: 'news',
    title: '',
    slug: '',
    shortDescription: '',
    thumbnailImageId: media[0]?.id || '',
    status: 'draft',
    publishedAt: new Date().toISOString(),
    eventStartAt: null,
    eventEndAt: null,
    location: '',
    content: {
      version: 1,
      blocks: [
        {
          type: 'heading',
          data: { level: 2, text: 'Tiêu đề bài viết' },
        },
        {
          type: 'paragraph',
          data: { text: 'Nội dung chi tiết giới thiệu sự kiện hoặc công nghệ mới của PAC...' },
        },
      ],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handleOpenCreate = () => {
    setEditingItem({ ...emptyItem });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: NewsEvent) => {
    setEditingItem(JSON.parse(JSON.stringify(item)));
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingItem || !editingItem.title.trim()) return;
    if (!editingItem.slug) {
      editingItem.slug = editingItem.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    onSave(editingItem);
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const filtered = news.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.location && n.location.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || n.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div>
      <div className="page-top">
        <div className="page-title">
          <h1>Quản Lý Tin Tức & Sự Kiện</h1>
          <p>Xuất bản bài viết tin ngành, thông báo công nghệ và lịch sự kiện hội thảo</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>Tạo Bài Mới</span>
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="filter-bar">
            <div className="search-input">
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Tìm tiêu đề bài viết, sự kiện..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="tab-pill-group">
              <button
                className={`tab-pill ${typeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTypeFilter('all')}
              >
                Tất cả
              </button>
              <button
                className={`tab-pill ${typeFilter === 'news' ? 'active' : ''}`}
                onClick={() => setTypeFilter('news')}
              >
                Tin tức (News)
              </button>
              <button
                className={`tab-pill ${typeFilter === 'event' ? 'active' : ''}`}
                onClick={() => setTypeFilter('event')}
              >
                Sự kiện (Events)
              </button>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Phân loại</th>
                <th>Tiêu đề bài viết</th>
                <th>Thời gian / Địa điểm</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <StatusBadge status={item.type} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{item.title}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 3 }}>
                      {item.shortDescription}
                    </div>
                  </td>
                  <td>
                    {item.type === 'event' ? (
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f59e0b' }}>
                          <Calendar size={13} />
                          <span>
                            {item.eventStartAt ? new Date(item.eventStartAt).toLocaleDateString('vi-VN') : 'Sắp diễn ra'}
                          </span>
                        </div>
                        {item.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <MapPin size={13} />
                            <span>{item.location}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('vi-VN') : 'Chưa đăng'}
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        className="btn-icon"
                        title="Sửa bài"
                        onClick={() => handleOpenEdit(item)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon"
                        title="Xóa bài"
                        onClick={() => {
                          if (window.confirm(`Xóa bài "${item.title}"?`)) {
                            onDelete(item.id);
                          }
                        }}
                      >
                        <Trash2 size={16} color="#f87171" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add/Edit */}
      {isModalOpen && editingItem && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingItem.id ? 'Chỉnh Sửa Tin Tức / Sự Kiện' : 'Tạo Bài Mới'}
          maxWidth="720px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Lưu Xuất Bản
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-row">
              <div className="form-group">
                <label>Phân Loại *</label>
                <select
                  className="form-control"
                  value={editingItem.type}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      type: e.target.value as NewsEvent['type'],
                    })
                  }
                >
                  <option value="news">Tin tức (News)</option>
                  <option value="event">Sự kiện (Event)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Trạng Thái</label>
                <select
                  className="form-control"
                  value={editingItem.status}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      status: e.target.value as NewsEvent['status'],
                    })
                  }
                >
                  <option value="draft">Bản nháp (Draft)</option>
                  <option value="published">Đã xuất bản (Published)</option>
                  <option value="archived">Lưu trữ (Archived)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Tiêu Đề Bài Viết *</label>
              <input
                type="text"
                className="form-control"
                placeholder="VD: Hội thảo kỹ thuật phân tích LNG 2026..."
                value={editingItem.title}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, title: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Đường Dẫn Tĩnh (Slug)</label>
              <input
                type="text"
                className="form-control"
                placeholder="hoi-thao-ky-thuat-lng-2026"
                value={editingItem.slug}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, slug: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Ảnh Thumbnail (Chọn từ Media)</label>
              <select
                className="form-control"
                value={editingItem.thumbnailImageId || ''}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, thumbnailImageId: e.target.value })
                }
              >
                <option value="">-- Chưa chọn thumbnail --</option>
                {media.map((img) => (
                  <option key={img.id} value={img.id}>
                    {img.fileName}
                  </option>
                ))}
              </select>
            </div>

            {editingItem.type === 'event' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Thời Gian Diễn Ra</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={
                      editingItem.eventStartAt
                        ? new Date(editingItem.eventStartAt).toISOString().slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        eventStartAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Địa Điểm Tổ Chức</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: Trung tâm Hội nghị White Palace, TP.HCM"
                    value={editingItem.location || ''}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, location: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Mô Tả Tóm Tắt (Short Description)</label>
              <textarea
                className="form-control"
                rows={2}
                value={editingItem.shortDescription || ''}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, shortDescription: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Nội Dung JSONB Blocks (Format Version 1)</label>
              <textarea
                className="form-control"
                rows={5}
                style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                value={JSON.stringify(editingItem.content, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setEditingItem({ ...editingItem, content: parsed });
                  } catch {
                    // keep raw while user edits
                  }
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Cấu trúc chuẩn gồm blocks: heading, paragraph, image, bullet_list, quote...
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
