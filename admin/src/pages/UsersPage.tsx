import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { User } from '../types';

interface Props {
  users: User[];
  currentUserId?: string;
  onSave: (user: User) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export const UsersPage: React.FC<Props> = ({ users, currentUserId, onSave, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const emptyUser: User = {
    id: '',
    email: '',
    fullName: '',
    role: 'editor',
    status: 'active',
    lastLoginAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const handleOpenCreate = () => {
    setEditingUser({ ...emptyUser });
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser({ ...u });
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingUser || !editingUser.email.trim() || !editingUser.fullName.trim() || isSaving) return;
    if (currentUserId && editingUser.id === currentUserId) {
      if (editingUser.status !== 'active' || editingUser.role !== 'admin') {
        setSaveError('Không thể tự khóa hoặc hạ quyền tài khoản Quản trị viên đang đăng nhập.');
        return;
      }
    }
    setSaveError(null);
    setIsSaving(true);
    try {
      await onSave(editingUser);
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lưu tài khoản thất bại. Vui lòng kiểm tra lại.';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isEditingSelf = Boolean(currentUserId && editingUser?.id && editingUser.id === currentUserId);

  return (
    <div>
      <div className="page-top">
        <div className="page-title">
          <h1>Quản Lý Tài Khoản Quản Trị</h1>
          <p>Phân quyền truy cập cho Quản trị viên (Admin) và Biên tập viên nội dung (Editor)</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>Thêm Tài Khoản</span>
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="search-input">
            <Search size={16} color="#94a3b8" />
            <input
              type="text"
              placeholder="Tìm theo họ tên, email tài khoản..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
            Tổng số: <strong>{users.length}</strong> tài khoản
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Họ & Tên</th>
                <th>Email Đăng Nhập</th>
                <th>Vai Trò (Role)</th>
                <th>Trạng Thái</th>
                <th>Đăng Nhập Gần Nhất</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isSelf = Boolean(currentUserId && u.id === currentUserId);
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: u.role === 'admin' ? '#4f46e5' : '#0284c7',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {u.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{u.fullName}</span>
                            {isSelf && (
                              <span className="badge" style={{ background: '#1e293b', color: '#38bdf8', fontSize: '0.68rem' }}>
                                Bạn
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: '#38bdf8' }}>{u.email}</td>
                    <td>
                      <StatusBadge status={u.role} />
                    </td>
                    <td>
                      <StatusBadge status={u.status} />
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          className="btn-icon"
                          title="Sửa tài khoản"
                          onClick={() => handleOpenEdit(u)}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-icon"
                          title={isSelf ? 'Không thể tự xóa tài khoản đang đăng nhập' : 'Xóa tài khoản'}
                          disabled={isSelf}
                          style={isSelf ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                          onClick={async () => {
                            if (isSelf) return;
                            if (window.confirm(`Xóa tài khoản "${u.fullName}"?`)) {
                              try {
                                await onDelete(u.id);
                              } catch {
                                // Error handled by App toast
                              }
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

      {isModalOpen && editingUser && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingUser.id ? 'Sửa Tài Khoản' : 'Thêm Tài Khoản Mới'}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : 'Lưu Tài Khoản'}
              </button>
            </>
          }
        >
          {saveError && (
            <div className="modal-error-alert" role="alert">
              <span>{saveError}</span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label>Họ và Tên Đầy Đủ *</label>
              <input
                type="text"
                className="form-control"
                placeholder="VD: Nguyễn Văn A"
                value={editingUser.fullName}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, fullName: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Email Đăng Nhập * (Unique)</label>
              <input
                type="email"
                className="form-control"
                placeholder="user@ltvietnam.com.vn"
                value={editingUser.email}
                onChange={(e) =>
                  setEditingUser({ ...editingUser, email: e.target.value })
                }
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phân Quyền Vai Trò *</label>
                <select
                  className="form-control"
                  value={editingUser.role}
                  disabled={isEditingSelf}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      role: e.target.value as User['role'],
                    })
                  }
                >
                  <option value="admin">Quản trị viên (Admin - Full quyền)</option>
                  <option value="editor">Biên tập viên (Editor - Nội dung)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Trạng Thái Tài Khoản</label>
                <select
                  className="form-control"
                  value={editingUser.status}
                  disabled={isEditingSelf}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      status: e.target.value as User['status'],
                    })
                  }
                >
                  <option value="active">Hoạt động (Active)</option>
                  <option value="inactive">Đã khóa (Inactive)</option>
                </select>
              </div>
            </div>
            {isEditingSelf && (
              <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Lưu ý: Để đảm bảo an toàn, bạn không thể tự hạ quyền hoặc tự khóa tài khoản đang đăng nhập.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
