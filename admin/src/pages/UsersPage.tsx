import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, ShieldCheck, UserCheck } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { User } from '../types';

interface Props {
  users: User[];
  onSave: (user: User) => void;
  onDelete: (id: string) => void;
}

export const UsersPage: React.FC<Props> = ({ users, onSave, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

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
    setIsModalOpen(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser({ ...u });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingUser || !editingUser.email.trim() || !editingUser.fullName.trim()) return;
    onSave(editingUser);
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const filtered = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              {filtered.map((u) => (
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
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{u.fullName}</div>
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
                        title="Xóa tài khoản"
                        onClick={() => {
                          if (window.confirm(`Xóa tài khoản "${u.fullName}"?`)) {
                            onDelete(u.id);
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

      {isModalOpen && editingUser && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingUser.id ? 'Sửa Tài Khoản' : 'Thêm Tài Khoản Mới'}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                Lưu Tài Khoản
              </button>
            </>
          }
        >
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
          </div>
        </Modal>
      )}
    </div>
  );
};
