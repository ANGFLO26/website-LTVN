import React, { useState } from 'react';
import { Plus, Search, Trash2, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { Modal } from '../components/Modal';
import type { MediaAsset } from '../types';

interface Props {
  media: MediaAsset[];
  onSave: (asset: MediaAsset) => void;
  onDelete: (id: string) => void;
}

export const MediaPage: React.FC<Props> = ({ media, onSave, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [newAsset, setNewAsset] = useState<Partial<MediaAsset>>({
    fileName: '',
    publicUrl: '',
    altText: '',
    mimeType: 'image/jpeg',
    sizeBytes: 150000,
    width: 1200,
    height: 800,
  });

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = () => {
    if (!newAsset.fileName || !newAsset.publicUrl) return;
    const asset: MediaAsset = {
      id: crypto.randomUUID(),
      fileName: newAsset.fileName,
      storageKey: `uploads/${newAsset.fileName}`,
      publicUrl: newAsset.publicUrl,
      altText: newAsset.altText || null,
      mimeType: newAsset.mimeType || 'image/jpeg',
      sizeBytes: Number(newAsset.sizeBytes) || 120000,
      width: Number(newAsset.width) || 1200,
      height: Number(newAsset.height) || 800,
      createdAt: new Date().toISOString(),
    };
    onSave(asset);
    setIsModalOpen(false);
    setNewAsset({
      fileName: '',
      publicUrl: '',
      altText: '',
      mimeType: 'image/jpeg',
      sizeBytes: 150000,
      width: 1200,
      height: 800,
    });
  };

  const filtered = media.filter(
    (m) =>
      m.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.altText && m.altText.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      <div className="page-top">
        <div className="page-title">
          <h1>Thư Viện Hình Ảnh & Media</h1>
          <p>Quản lý kho tài nguyên hình ảnh tập trung dùng chung cho Máy PAC, Tin tức và Bài viết</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>Thêm Tệp Mới</span>
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="search-input">
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên file, alt text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
            Tổng cộng: <strong>{media.length}</strong> hình ảnh
          </div>
        </div>
      </div>

      {/* Grid of Media Assets */}
      <div className="media-grid">
        {filtered.map((item) => (
          <div key={item.id} className="media-item">
            <img
              src={item.publicUrl}
              alt={item.altText || item.fileName}
              className="media-preview"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.dataset.fallback) {
                  target.dataset.fallback = 'true';
                  target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect fill='%231e293b' width='400' height='300'/><text fill='%2364748b' font-family='sans-serif' font-size='14' dy='5' font-weight='bold' x='50%' y='50%' text-anchor='middle'>Image Unavailable</text></svg>";
                }
              }}
            />
            <div className="media-meta">
              <div className="media-filename" title={item.fileName}>
                {item.fileName}
              </div>
              <div className="media-subtext">
                {item.width && item.height ? `${item.width}×${item.height}px • ` : ''}
                {Math.round(item.sizeBytes / 1024)} KB
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 8,
                  paddingTop: 8,
                  borderTop: '1px solid #1e293b',
                }}
              >
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleCopy(item.id, item.publicUrl)}
                  title="Sao chép URL công khai"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check size={13} color="#34d399" />
                      <span style={{ color: '#34d399' }}>Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>URL</span>
                    </>
                  )}
                </button>

                <button
                  className="btn-icon"
                  title="Xóa tệp media"
                  onClick={() => {
                    if (window.confirm(`Xóa tệp "${item.fileName}"?`)) {
                      onDelete(item.id);
                    }
                  }}
                >
                  <Trash2 size={16} color="#f87171" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Media Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Thêm Tệp Hình Ảnh Vào Thư Viện"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={handleCreate}>
                Lưu Vào Thư Viện
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label>Tên Tệp Tin *</label>
              <input
                type="text"
                className="form-control"
                placeholder="VD: ac-nga-gpa-2286.jpg"
                value={newAsset.fileName}
                onChange={(e) => setNewAsset({ ...newAsset, fileName: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Đường Dẫn Public URL *</label>
              <input
                type="text"
                className="form-control"
                placeholder="https://... hoặc /assets/..."
                value={newAsset.publicUrl}
                onChange={(e) => setNewAsset({ ...newAsset, publicUrl: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Alt Text (SEO & Accessibility)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Mô tả hình ảnh cho công cụ tìm kiếm..."
                value={newAsset.altText || ''}
                onChange={(e) => setNewAsset({ ...newAsset, altText: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Chiều Rộng (Width px)</label>
                <input
                  type="number"
                  className="form-control"
                  value={newAsset.width || 1200}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, width: parseInt(e.target.value, 10) })
                  }
                />
              </div>
              <div className="form-group">
                <label>Chiều Cao (Height px)</label>
                <input
                  type="number"
                  className="form-control"
                  value={newAsset.height || 800}
                  onChange={(e) =>
                    setNewAsset({ ...newAsset, height: parseInt(e.target.value, 10) })
                  }
                />
              </div>
            </div>

            {newAsset.publicUrl && (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: 6 }}>
                  Xem trước ảnh:
                </label>
                <img
                  src={newAsset.publicUrl}
                  alt="Preview"
                  style={{
                    width: '100%',
                    height: 180,
                    objectFit: 'cover',
                    borderRadius: 8,
                    border: '1px solid #334155',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=80';
                  }}
                />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
