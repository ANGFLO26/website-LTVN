import React, { useState } from 'react';
import { Search, Eye, Trash2, Phone, Mail, Building2 } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { Contact, User } from '../types';

interface Props {
  contacts: Contact[];
  users?: User[];
  onUpdateStatus: (
    id: string,
    status: Contact['status'],
    note?: string,
    assignedTo?: string | null,
  ) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

export const ContactsPage: React.FC<Props> = ({ contacts, users = [], onUpdateStatus, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'processing' | 'resolved' | 'spam'>('all');
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [assignedToInput, setAssignedToInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleOpenDetail = (contact: Contact) => {
    setViewingContact(contact);
    setAdminNoteInput(contact.adminNote || '');
    setAssignedToInput(contact.assignedTo || '');
    setSaveError(null);
  };

  const handleSaveDetail = async () => {
    if (!viewingContact || isSaving) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      const nextAssignedTo = assignedToInput ? assignedToInput : null;
      const assignedChanged = nextAssignedTo !== (viewingContact.assignedTo || null);
      await onUpdateStatus(
        viewingContact.id,
        viewingContact.status,
        adminNoteInput,
        assignedChanged ? nextAssignedTo : undefined,
      );
      setViewingContact(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cập nhật trạng thái liên hệ thất bại. Vui lòng thử lại.';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.companyName && c.companyName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm));
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="page-top">
        <div className="page-title">
          <h1>Yêu Cầu Liên Hệ & Báo Giá (Leads)</h1>
          <p>Quản lý và tiếp nhận thông tin từ form liên hệ khách hàng trên website</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filter-bar">
            <div className="search-input">
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Tìm khách hàng, công ty, email, số điện thoại..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="tab-pill-group">
              <button
                className={`tab-pill ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                Tất cả ({contacts.length})
              </button>
              <button
                className={`tab-pill ${statusFilter === 'new' ? 'active' : ''}`}
                onClick={() => setStatusFilter('new')}
              >
                Mới nhận ({contacts.filter((c) => c.status === 'new').length})
              </button>
              <button
                className={`tab-pill ${statusFilter === 'processing' ? 'active' : ''}`}
                onClick={() => setStatusFilter('processing')}
              >
                Đang xử lý ({contacts.filter((c) => c.status === 'processing').length})
              </button>
              <button
                className={`tab-pill ${statusFilter === 'resolved' ? 'active' : ''}`}
                onClick={() => setStatusFilter('resolved')}
              >
                Đã giải quyết ({contacts.filter((c) => c.status === 'resolved').length})
              </button>
              <button
                className={`tab-pill ${statusFilter === 'spam' ? 'active' : ''}`}
                onClick={() => setStatusFilter('spam')}
              >
                Spam ({contacts.filter((c) => c.status === 'spam').length})
              </button>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Khách Hàng</th>
                <th>Công Ty & Đơn Vị</th>
                <th>Tiêu Đề Yêu Cầu</th>
                <th>Thời Gian Gửi</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    {contacts.length === 0 ? 'Chưa có yêu cầu liên hệ nào.' : 'Không có yêu cầu liên hệ phù hợp.'}
                  </td>
                </tr>
              )}
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{c.fullName}</div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      {c.phone || c.email}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Building2 size={14} color="#64748b" />
                      <span>{c.companyName || 'Khách hàng cá nhân'}</span>
                    </div>
                  </td>
                  <td style={{ maxWidth: 260 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.subject || 'Liên hệ chung'}</div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: '#94a3b8',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {c.message}
                    </div>
                  </td>
                  <td style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                    {new Date(c.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td>
                    <StatusBadge status={c.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenDetail(c)}
                      >
                        <Eye size={14} />
                        <span>Xem & Xử lý</span>
                      </button>
                      <button
                        className="btn-icon"
                        title="Xóa liên hệ"
                        onClick={async () => {
                          if (window.confirm(`Xóa yêu cầu từ "${c.fullName}"?`)) {
                            try {
                              await onDelete(c.id);
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal View Contact Details & Processing */}
      {viewingContact && (
        <Modal
          isOpen={Boolean(viewingContact)}
          onClose={() => setViewingContact(null)}
          title="Chi Tiết Yêu Cầu Khách Hàng"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setViewingContact(null)} disabled={isSaving}>
                Đóng
              </button>
              <button className="btn btn-primary" onClick={handleSaveDetail} disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : 'Lưu Trạng Thái & Ghi Chú'}
              </button>
            </>
          }
        >
          {saveError && (
            <div className="modal-error-alert" role="alert">
              <span>{saveError}</span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Customer info card */}
            <div
              className="contact-info-grid"
              style={{
                background: '#1e293b',
                padding: 16,
                borderRadius: 10,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                  Khách Hàng
                </span>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{viewingContact.fullName}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                  Công Ty
                </span>
                <div style={{ fontWeight: 600 }}>{viewingContact.companyName || '—'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={14} color="#38bdf8" />
                <a href={`mailto:${viewingContact.email}`} style={{ color: '#38bdf8', fontSize: '0.85rem' }}>
                  {viewingContact.email}
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={14} color="#34d399" />
                <a href={`tel:${viewingContact.phone}`} style={{ color: '#34d399', fontSize: '0.85rem' }}>
                  {viewingContact.phone || 'Chưa để lại SĐT'}
                </a>
              </div>
            </div>

            {/* Subject and Full Message */}
            <div className="form-group">
              <label>Chủ Đề Yêu Cầu</label>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f8fafc' }}>
                {viewingContact.subject || 'Không có tiêu đề'}
              </div>
            </div>

            <div className="form-group">
              <label>Nội Dung Tin Nhắn</label>
              <div
                style={{
                  background: '#090d16',
                  border: '1px solid #334155',
                  borderRadius: 8,
                  padding: 14,
                  fontSize: '0.88rem',
                  lineHeight: 1.6,
                  color: '#e2e8f0',
                }}
              >
                {viewingContact.message}
              </div>
            </div>

            {/* Workflow status transition */}
            <div className="form-row">
              <div className="form-group">
                <label>Quy Trình Xử Lý Trạng Thái</label>
                <select
                  className="form-control"
                  value={viewingContact.status}
                  onChange={(e) =>
                    setViewingContact({
                      ...viewingContact,
                      status: e.target.value as Contact['status'],
                    })
                  }
                >
                  <option value="new">Mới nhận (New)</option>
                  <option value="processing">Đang xử lý (Processing)</option>
                  <option value="resolved">Đã giải quyết / Đã tư vấn (Resolved)</option>
                  <option value="spam">Đánh dấu Spam</option>
                </select>
              </div>

              <div className="form-group">
                <label>Người Phụ Trách Xử Lý</label>
                <select
                  className="form-control"
                  value={assignedToInput}
                  onChange={(e) => setAssignedToInput(e.target.value)}
                >
                  <option value="">-- Chưa phân công --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Thời điểm nhận: <strong>{new Date(viewingContact.createdAt).toLocaleString('vi-VN')}</strong>
            </div>

            {/* Internal Admin Note */}
            <div className="form-group">
              <label>Ghi Chú Nội Bộ Của Kỹ Sư / Quản Trị Viên (Admin Note)</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="VD: Đã phân công kỹ sư Tuấn Anh phụ trách báo giá máy PAC..."
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
