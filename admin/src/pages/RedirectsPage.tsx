import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import type { Redirect } from '../types';

interface Props {
  redirects: Redirect[];
  onSave: (redirect: Partial<Redirect> & { sourcePath: string; destinationPath: string }) => Promise<void> | void;
  onToggle: (id: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export const RedirectsPage: React.FC<Props> = ({
  redirects,
  onSave,
  onToggle,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRedirect, setEditingRedirect] = useState<Partial<Redirect> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete confirmation modal state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const emptyRedirect: Partial<Redirect> = {
    sourcePath: '',
    destinationPath: '',
    statusCode: 301,
    isActive: true,
    notes: '',
  };

  const handleOpenCreate = () => {
    setEditingRedirect({ ...emptyRedirect });
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (r: Redirect) => {
    setEditingRedirect({ ...r });
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingRedirect) return;
    const source = (editingRedirect.sourcePath || '').trim();
    const destination = (editingRedirect.destinationPath || '').trim();

    if (!source || !destination) {
      setSaveError('Vui lòng nhập đầy đủ đường dẫn nguồn và đường dẫn đích.');
      return;
    }

    setSaveError(null);
    setIsSaving(true);
    try {
      await onSave({
        id: editingRedirect.id,
        sourcePath: source,
        destinationPath: destination,
        isActive: editingRedirect.isActive !== undefined ? editingRedirect.isActive : true,
        notes: editingRedirect.notes || null,
      });
      setIsModalOpen(false);
      setEditingRedirect(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lưu chuyển hướng thất bại. Vui lòng kiểm tra lại.';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingId || isDeleting) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await onDelete(deletingId);
      setDeletingId(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Xóa chuyển hướng thất bại.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = redirects.filter((r) => {
    const matchesSearch =
      r.sourcePath.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.destinationPath.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterStatus === 'active') return r.isActive;
    if (filterStatus === 'inactive') return !r.isActive;
    return true;
  });

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const redirectBeingDeleted = redirects.find((r) => r.id === deletingId);

  return (
    <div>
      <div className="page-top">
        <div className="page-title">
          <h1>Quản Lý Chuyển Hướng 301 (Redirects)</h1>
          <p>Cấu hình chuyển hướng HTTP 301 tự động cho các URL cũ hoặc thay đổi cấu trúc trang web</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>Thêm Chuyển Hướng</span>
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="search-input" style={{ flex: '1 1 280px' }}>
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Tìm theo URL nguồn, URL đích hoặc ghi chú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="form-control"
              style={{ width: 'auto', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang kích hoạt</option>
              <option value="inactive">Đã tạm dừng</option>
            </select>

            <div style={{ color: '#94a3b8', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
              Tổng số: <strong>{redirects.length}</strong> quy tắc
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>URL Nguồn (Cũ)</th>
                <th>URL Đích (Mới)</th>
                <th>Trạng Thái</th>
                <th>Mã HTTP</th>
                <th>Ghi Chú</th>
                <th>Cập Nhật Lần Cuối</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <ArrowRightLeft size={32} strokeWidth={1.5} color="#cbd5e1" />
                      <span>{searchTerm ? 'Không tìm thấy quy tắc chuyển hướng phù hợp.' : 'Chưa có quy tắc chuyển hướng nào được tạo.'}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <code
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#0f172a',
                          padding: '0.2rem 0.45rem',
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontFamily: 'monospace',
                          wordBreak: 'break-all',
                        }}
                      >
                        {r.sourcePath}
                      </code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <ArrowRight size={14} color="#64748b" style={{ flexShrink: 0 }} />
                        <code
                          style={{
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            padding: '0.2rem 0.45rem',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                          }}
                        >
                          {r.destinationPath}
                        </code>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await onToggle(r.id);
                          } catch {
                            // Error handled by App toast
                          }
                        }}
                        className={`badge ${r.isActive ? 'badge-active' : 'badge-inactive'}`}
                        style={{
                          cursor: 'pointer',
                          border: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                        title={r.isActive ? 'Nhấn để tạm dừng' : 'Nhấn để kích hoạt'}
                      >
                        {r.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        <span>{r.isActive ? 'Hoạt động' : 'Tạm dừng'}</span>
                      </button>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '3px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: '#475569',
                        }}
                      >
                        {r.statusCode || 301}
                      </span>
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '200px' }}>
                      {r.notes || '—'}
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {formatDate(r.updatedAt || r.createdAt)}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        className="btn-icon"
                        onClick={() => handleOpenEdit(r)}
                        title="Chỉnh sửa quy tắc"
                        style={{ marginRight: '0.4rem' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => {
                          setDeleteError(null);
                          setDeletingId(r.id);
                        }}
                        title="Xóa quy tắc"
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Redirect */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title={editingRedirect?.id ? 'Chỉnh Sửa Chuyển Hướng 301' : 'Thêm Chuyển Hướng 301 Mới'}
        maxWidth="600px"
      >
        {editingRedirect && (
          <div className="form-modal-content">
            {saveError && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#991b1b',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{saveError}</span>
              </div>
            )}

            <div className="form-group">
              <label>
                URL Nguồn (Đường dẫn cũ) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="/duong-dan-cu-can-chuyen-huong"
                value={editingRedirect.sourcePath || ''}
                onChange={(e) =>
                  setEditingRedirect({ ...editingRedirect, sourcePath: e.target.value })
                }
              />
              <span className="field-hint" style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Đường dẫn nội bộ bắt đầu bằng dấu /, ví dụ: <code>/san-pham/may-chua-nang-cap</code>
              </span>
            </div>

            <div className="form-group">
              <label>
                URL Đích (Đường dẫn mới) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="/pac/san-pham-chinh-thuc-moi"
                value={editingRedirect.destinationPath || ''}
                onChange={(e) =>
                  setEditingRedirect({ ...editingRedirect, destinationPath: e.target.value })
                }
              />
              <span className="field-hint" style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Đường dẫn nội bộ mới trên website, ví dụ: <code>/pac/optidist-2</code>
              </span>
            </div>

            <div className="form-row" style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Mã HTTP Trạng Thái</label>
                <input
                  type="text"
                  className="form-control"
                  value="301 Moved Permanently (Cố định chuẩn SEO)"
                  disabled
                  style={{ backgroundColor: '#f8fafc', color: '#64748b' }}
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>Trạng Thái Áp Dụng</label>
                <select
                  className="form-control"
                  value={editingRedirect.isActive ? 'active' : 'inactive'}
                  onChange={(e) =>
                    setEditingRedirect({
                      ...editingRedirect,
                      isActive: e.target.value === 'active',
                    })
                  }
                >
                  <option value="active">Kích hoạt ngay (Active)</option>
                  <option value="inactive">Tạm dừng (Inactive)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Ghi Chú Vận Hành</label>
              <input
                type="text"
                className="form-control"
                placeholder="Lý do chuyển hướng (ví dụ: Chuyển hướng theo yêu cầu SEO sau khi đổi slug)"
                value={editingRedirect.notes || ''}
                onChange={(e) =>
                  setEditingRedirect({ ...editingRedirect, notes: e.target.value })
                }
              />
            </div>

            <div
              className="modal-actions"
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                marginTop: '1.5rem',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Đang lưu...' : editingRedirect.id ? 'Cập Nhật' : 'Tạo Chuyển Hướng'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingId)}
        onClose={() => {
          if (!isDeleting) {
            setDeleteError(null);
            setDeletingId(null);
          }
        }}
        title="Xác Nhận Xóa Quy Tắc Chuyển Hướng"
        maxWidth="480px"
      >
        <div style={{ padding: '0.5rem 0' }}>
          {deleteError && (
            <div className="modal-error-alert" role="alert" style={{ marginBottom: '1rem' }}>
              <span>{deleteError}</span>
            </div>
          )}
          <p style={{ marginBottom: '1rem', color: '#334155', lineHeight: 1.5 }}>
            Bạn có chắc chắn muốn xóa quy tắc chuyển hướng sau đây không?
          </p>

          {redirectBeingDeleted && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '0.85rem 1rem',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
              }}
            >
              <div style={{ marginBottom: '0.4rem' }}>
                <span style={{ color: '#64748b' }}>Nguồn:</span>{' '}
                <strong>{redirectBeingDeleted.sourcePath}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Đích:</span>{' '}
                <strong>{redirectBeingDeleted.destinationPath}</strong>
              </div>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setDeleteError(null);
                setDeletingId(null);
              }}
              disabled={isDeleting}
            >
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-danger"
              style={{ backgroundColor: '#ef4444', color: '#ffffff', borderColor: '#ef4444' }}
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Đang xóa...' : 'Xác Nhận Xóa'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
