import React from 'react';

interface Props {
  status: string;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const normalized = status.toLowerCase();
  
  const labels: Record<string, string> = {
    published: 'Đã xuất bản',
    draft: 'Bản nháp',
    archived: 'Lưu trữ',
    new: 'Mới nhận',
    processing: 'Đang xử lý',
    resolved: 'Đã giải quyết',
    spam: 'Spam',
    active: 'Hoạt động',
    inactive: 'Đã khóa',
    admin: 'Quản trị viên',
    editor: 'Biên tập viên',
    news: 'Tin tức',
    event: 'Sự kiện',
  };

  return (
    <span className={`badge badge-${normalized}`}>
      <span className="status-dot" style={{ width: 6, height: 6 }} />
      {labels[normalized] || status}
    </span>
  );
};
