import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, ExternalLink, PlusCircle, Layers } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { Machine, Standard, MediaAsset } from '../types';

interface Props {
  machines: Machine[];
  standards: Standard[];
  media: MediaAsset[];
  onSave: (machine: Machine) => void;
  onDelete: (id: string) => void;
}

export const MachinesPage: React.FC<Props> = ({
  machines,
  standards,
  media,
  onSave,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'apps' | 'highlights' | 'specs' | 'standards'>('info');

  const emptyMachine: Machine = {
    id: '',
    name: '',
    slug: '',
    model: '',
    shortDescription: '',
    description: '',
    mainImageId: media[0]?.id || '',
    status: 'draft',
    sortOrder: machines.length + 1,
    publishedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    applications: [],
    highlights: [],
    specs: [],
    standards: [],
  };

  const handleOpenCreate = () => {
    setEditingMachine({ ...emptyMachine });
    setActiveTab('info');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: Machine) => {
    setEditingMachine(JSON.parse(JSON.stringify(m)));
    setActiveTab('info');
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingMachine || !editingMachine.name.trim()) return;
    if (!editingMachine.slug) {
      editingMachine.slug = editingMachine.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
    onSave(editingMachine);
    setIsModalOpen(false);
    setEditingMachine(null);
  };

  const filteredMachines = machines.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.model && m.model.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="page-top">
        <div className="page-title">
          <h1>Danh Sách Máy Phân Tích PAC</h1>
          <p>Quản lý danh mục thiết bị, thông số kỹ thuật, ứng dụng và tiêu chuẩn quốc tế</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>Thêm Máy Mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div className="filter-bar">
            <div className="search-input">
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Tìm theo tên máy, model..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="tab-pill-group">
              {(['all', 'published', 'draft', 'archived'] as const).map((st) => (
                <button
                  key={st}
                  className={`tab-pill ${statusFilter === st ? 'active' : ''}`}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === 'all'
                    ? 'Tất cả'
                    : st === 'published'
                    ? 'Đã xuất bản'
                    : st === 'draft'
                    ? 'Bản nháp'
                    : 'Lưu trữ'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Ảnh</th>
                <th>Tên máy & Model</th>
                <th>Đường dẫn (Slug)</th>
                <th>Ứng dụng / Specs</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredMachines.map((m) => {
                const img = media.find((asset) => asset.id === m.mainImageId);
                return (
                  <tr key={m.id}>
                    <td>
                      <img
                        src={img?.publicUrl || 'https://via.placeholder.com/60'}
                        alt={m.name}
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          objectFit: 'cover',
                          background: '#000',
                        }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{m.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>
                        {m.model || 'Standard Model'}
                      </div>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                      /{m.slug}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className="badge" style={{ background: '#1e293b', color: '#94a3b8' }}>
                          <Layers size={11} />
                          {m.specs?.length || 0} specs
                        </span>
                        <span className="badge" style={{ background: '#1e293b', color: '#94a3b8' }}>
                          {m.applications?.length || 0} apps
                        </span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={m.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          className="btn-icon"
                          title="Sửa máy"
                          onClick={() => handleOpenEdit(m)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-icon"
                          title="Xóa máy"
                          onClick={() => {
                            if (window.confirm(`Xóa máy "${m.name}"?`)) {
                              onDelete(m.id);
                            }
                          }}
                        >
                          <Trash2 size={16} color="#f87171" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Create Machine Modal */}
      {isModalOpen && editingMachine && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingMachine.id ? 'Chỉnh Sửa Máy PAC' : 'Thêm Máy PAC Mới'}
          maxWidth="750px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Hủy bỏ
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Lưu Thay Đổi
              </button>
            </>
          }
        >
          {/* Sub Navigation Tabs */}
          <div className="sub-tabs">
            <button
              className={`sub-tab-btn ${activeTab === 'info' ? 'active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              1. Thông Tin Chung
            </button>
            <button
              className={`sub-tab-btn ${activeTab === 'apps' ? 'active' : ''}`}
              onClick={() => setActiveTab('apps')}
            >
              2. Ứng Dụng ({editingMachine.applications?.length || 0})
            </button>
            <button
              className={`sub-tab-btn ${activeTab === 'highlights' ? 'active' : ''}`}
              onClick={() => setActiveTab('highlights')}
            >
              3. Điểm Nổi Bật ({editingMachine.highlights?.length || 0})
            </button>
            <button
              className={`sub-tab-btn ${activeTab === 'specs' ? 'active' : ''}`}
              onClick={() => setActiveTab('specs')}
            >
              4. Thông Số Kỹ Thuật ({editingMachine.specs?.length || 0})
            </button>
          </div>

          {/* Tab 1: Info */}
          {activeTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-row">
                <div className="form-group">
                  <label>Tên Thiết Bị *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: AC NGA GPA 2286 Extended..."
                    value={editingMachine.name}
                    onChange={(e) =>
                      setEditingMachine({ ...editingMachine, name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Model</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: AC NGA C14+"
                    value={editingMachine.model || ''}
                    onChange={(e) =>
                      setEditingMachine({ ...editingMachine, model: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Đường dẫn tĩnh (Slug)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ac-nga-gpa-2286"
                    value={editingMachine.slug}
                    onChange={(e) =>
                      setEditingMachine({ ...editingMachine, slug: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Trạng Thái Xuất Bản</label>
                  <select
                    className="form-control"
                    value={editingMachine.status}
                    onChange={(e) =>
                      setEditingMachine({
                        ...editingMachine,
                        status: e.target.value as Machine['status'],
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
                <label>Ảnh Đại Diện Chính (Media Asset)</label>
                <select
                  className="form-control"
                  value={editingMachine.mainImageId || ''}
                  onChange={(e) =>
                    setEditingMachine({ ...editingMachine, mainImageId: e.target.value })
                  }
                >
                  <option value="">-- Chưa chọn ảnh --</option>
                  {media.map((img) => (
                    <option key={img.id} value={img.id}>
                      {img.fileName} ({img.mimeType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Mô Tả Ngắn (Hiển thị ngoài card sản phẩm)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Tóm tắt đặc tính và mục tiêu phân tích..."
                  value={editingMachine.shortDescription || ''}
                  onChange={(e) =>
                    setEditingMachine({
                      ...editingMachine,
                      shortDescription: e.target.value,
                    })
                  }
                />
              </div>

              <div className="form-group">
                <label>Mô Tả Chi Tiết (Trang chi tiết máy)</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Giới thiệu đầy đủ hệ thống, giải pháp của PAC..."
                  value={editingMachine.description || ''}
                  onChange={(e) =>
                    setEditingMachine({
                      ...editingMachine,
                      description: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}

          {/* Tab 2: Applications */}
          {activeTab === 'apps' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Danh sách ứng dụng phân tích mẫu của máy
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const apps = editingMachine.applications || [];
                    apps.push({
                      id: crypto.randomUUID(),
                      machineId: editingMachine.id,
                      title: '',
                      description: '',
                      sortOrder: apps.length + 1,
                    });
                    setEditingMachine({ ...editingMachine, applications: [...apps] });
                  }}
                >
                  <PlusCircle size={14} />
                  <span>Thêm Ứng Dụng</span>
                </button>
              </div>

              {(editingMachine.applications || []).map((app, idx) => (
                <div
                  key={app.id || idx}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    background: '#1e293b',
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <input
                    type="text"
                    className="form-control"
                    style={{ flex: 1 }}
                    placeholder="Tiêu đề ứng dụng (VD: LNG Analysis)"
                    value={app.title}
                    onChange={(e) => {
                      const apps = [...(editingMachine.applications || [])];
                      apps[idx].title = e.target.value;
                      setEditingMachine({ ...editingMachine, applications: apps });
                    }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    style={{ flex: 2 }}
                    placeholder="Mô tả chi tiết ứng dụng..."
                    value={app.description || ''}
                    onChange={(e) => {
                      const apps = [...(editingMachine.applications || [])];
                      apps[idx].description = e.target.value;
                      setEditingMachine({ ...editingMachine, applications: apps });
                    }}
                  />
                  <button
                    className="btn-icon"
                    onClick={() => {
                      const apps = (editingMachine.applications || []).filter((_, i) => i !== idx);
                      setEditingMachine({ ...editingMachine, applications: apps });
                    }}
                  >
                    <Trash2 size={16} color="#f87171" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Highlights */}
          {activeTab === 'highlights' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Các tính năng nổi bật vượt trội của máy
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const hls = editingMachine.highlights || [];
                    hls.push({
                      id: crypto.randomUUID(),
                      machineId: editingMachine.id,
                      title: '',
                      description: '',
                      icon: 'Zap',
                      sortOrder: hls.length + 1,
                    });
                    setEditingMachine({ ...editingMachine, highlights: [...hls] });
                  }}
                >
                  <PlusCircle size={14} />
                  <span>Thêm Điểm Nổi Bật</span>
                </button>
              </div>

              {(editingMachine.highlights || []).map((hl, idx) => (
                <div
                  key={hl.id || idx}
                  style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    background: '#1e293b',
                    padding: 12,
                    borderRadius: 8,
                  }}
                >
                  <input
                    type="text"
                    className="form-control"
                    style={{ flex: 1 }}
                    placeholder="Tiêu đề (VD: Analysis time ≤30 min)"
                    value={hl.title}
                    onChange={(e) => {
                      const hls = [...(editingMachine.highlights || [])];
                      hls[idx].title = e.target.value;
                      setEditingMachine({ ...editingMachine, highlights: hls });
                    }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    style={{ flex: 2 }}
                    placeholder="Mô tả tóm tắt..."
                    value={hl.description || ''}
                    onChange={(e) => {
                      const hls = [...(editingMachine.highlights || [])];
                      hls[idx].description = e.target.value;
                      setEditingMachine({ ...editingMachine, highlights: hls });
                    }}
                  />
                  <button
                    className="btn-icon"
                    onClick={() => {
                      const hls = (editingMachine.highlights || []).filter((_, i) => i !== idx);
                      setEditingMachine({ ...editingMachine, highlights: hls });
                    }}
                  >
                    <Trash2 size={16} color="#f87171" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tab 4: Specs */}
          {activeTab === 'specs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                  Thông số kỹ thuật phân theo nhóm (Performance, Sample, Environment,...)
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const specs = editingMachine.specs || [];
                    specs.push({
                      id: crypto.randomUUID(),
                      machineId: editingMachine.id,
                      groupName: 'Performance',
                      specName: '',
                      specValue: '',
                      unit: '',
                      sortOrder: specs.length + 1,
                    });
                    setEditingMachine({ ...editingMachine, specs: [...specs] });
                  }}
                >
                  <PlusCircle size={14} />
                  <span>Thêm Thông Số</span>
                </button>
              </div>

              {(editingMachine.specs || []).map((sp, idx) => (
                <div
                  key={sp.id || idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1.5fr 1.5fr 0.8fr auto',
                    gap: 8,
                    alignItems: 'center',
                    background: '#1e293b',
                    padding: 10,
                    borderRadius: 8,
                  }}
                >
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nhóm (Group)"
                    value={sp.groupName}
                    onChange={(e) => {
                      const specs = [...(editingMachine.specs || [])];
                      specs[idx].groupName = e.target.value;
                      setEditingMachine({ ...editingMachine, specs });
                    }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tên thông số"
                    value={sp.specName}
                    onChange={(e) => {
                      const specs = [...(editingMachine.specs || [])];
                      specs[idx].specName = e.target.value;
                      setEditingMachine({ ...editingMachine, specs });
                    }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Giá trị (TEXT)"
                    value={sp.specValue}
                    onChange={(e) => {
                      const specs = [...(editingMachine.specs || [])];
                      specs[idx].specValue = e.target.value;
                      setEditingMachine({ ...editingMachine, specs });
                    }}
                  />
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Đơn vị"
                    value={sp.unit || ''}
                    onChange={(e) => {
                      const specs = [...(editingMachine.specs || [])];
                      specs[idx].unit = e.target.value;
                      setEditingMachine({ ...editingMachine, specs });
                    }}
                  />
                  <button
                    className="btn-icon"
                    onClick={() => {
                      const specs = (editingMachine.specs || []).filter((_, i) => i !== idx);
                      setEditingMachine({ ...editingMachine, specs });
                    }}
                  >
                    <Trash2 size={16} color="#f87171" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};
