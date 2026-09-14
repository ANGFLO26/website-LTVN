import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Award } from 'lucide-react';
import { Modal } from '../components/Modal';
import type { Standard } from '../types';

interface Props {
  standards: Standard[];
  onSave: (std: Standard) => void;
  onDelete: (id: string) => void;
}

export const StandardsPage: React.FC<Props> = ({ standards, onSave, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStd, setEditingStd] = useState<Standard | null>(null);

  const emptyStandard: Standard = {
    id: '',
    code: '',
    organization: 'ASTM',
    year: new Date().getFullYear(),
    title: '',
    description: '',
    createdAt: new Date().toISOString(),
  };

  const handleOpenCreate = () => {
    setEditingStd({ ...emptyStandard });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (std: Standard) => {
    setEditingStd({ ...std });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingStd || !editingStd.code.trim()) return;
    onSave(editingStd);
    setIsModalOpen(false);
    setEditingStd(null);
  };

  const filtered = standards.filter(
    (s) =>
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.title && s.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.organization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="page-top">
        <div className="page-title">
          <h1>Danh Mục Tiêu Chuẩn Quốc Tế</h1>
          <p>Quản lý các tiêu chuẩn ASTM, ISO, GPA, EN được viện dẫn trong phương pháp thử của PAC</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>Thêm Tiêu Chuẩn</span>
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-input">
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Tìm theo mã tiêu chuẩn (VD: ASTM D3588, ISO 6976)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
            Tổng số: <strong>{standards.length}</strong> tiêu chuẩn
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 140 }}>Mã Tiêu Chuẩn</th>
                <th style={{ width: 100 }}>Tổ Chức</th>
                <th style={{ width: 80 }}>Năm</th>
                <th>Tiêu Đề & Nội Dung Phương Pháp</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((std) => (
                <tr key={std.id}>
                  <td>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontWeight: 700,
                        color: '#38bdf8',
                      }}
                    >
                      <Award size={16} />
                      <span>{std.code}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{ background: '#1e293b', color: '#cbd5e1' }}>
                      {std.organization}
                    </span>
                  </td>
                  <td style={{ color: '#94a3b8' }}>{std.year || '—'}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                      {std.title || 'Chưa cập nhật tiêu đề'}
                    </div>
                    {std.description && (
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 3 }}>
                        {std.description}
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        className="btn-icon"
                        title="Sửa tiêu chuẩn"
                        onClick={() => handleOpenEdit(std)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon"
                        title="Xóa tiêu chuẩn"
                        onClick={() => {
                          if (window.confirm(`Xóa tiêu chuẩn "${std.code}"?`)) {
                            onDelete(std.id);
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

      {isModalOpen && editingStd && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingStd.id ? 'Sửa Tiêu Chuẩn' : 'Thêm Tiêu Chuẩn Mới'}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Lưu Tiêu Chuẩn
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-row">
              <div className="form-group">
                <label>Mã Tiêu Chuẩn * (Unique)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: ASTM D3588"
                  value={editingStd.code}
                  onChange={(e) => setEditingStd({ ...editingStd, code: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Tổ Chức Ban Hành *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ASTM, ISO, GPA, EN..."
                  value={editingStd.organization}
                  onChange={(e) => setEditingStd({ ...editingStd, organization: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Năm Ban Hành</label>
              <input
                type="number"
                className="form-control"
                placeholder="2020"
                value={editingStd.year || ''}
                onChange={(e) =>
                  setEditingStd({
                    ...editingStd,
                    year: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Tiêu Đề Đầy Đủ</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Standard Practice for Calculating..."
                value={editingStd.title || ''}
                onChange={(e) => setEditingStd({ ...editingStd, title: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Mô Tả Ứng Dụng</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Mô tả phạm vi áp dụng của tiêu chuẩn..."
                value={editingStd.description || ''}
                onChange={(e) => setEditingStd({ ...editingStd, description: e.target.value })}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
