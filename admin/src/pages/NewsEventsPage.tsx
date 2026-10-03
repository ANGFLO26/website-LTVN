import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Calendar, MapPin, ExternalLink } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { NewsEvent, MediaAsset, ContentJsonb, NewsEventTranslation } from '../types';
import { buildPublicUrl } from '../config/urls';
import { ConfiguredExternalLink } from '../components/ConfiguredExternalLink';

interface Props {
  news: NewsEvent[];
  media: MediaAsset[];
  onSave: (item: NewsEvent) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

interface LocalizedFormState {
  title: string;
  slug: string;
  shortDescription: string;
  location: string;
  contentRaw: string;
  seoTitle: string;
  seoDescription: string;
}

interface CommonFormState {
  id: string;
  type: NewsEvent['type'];
  status: NewsEvent['status'];
  thumbnailImageId: string | null;
  eventStartAt: string | null;
  eventEndAt: string | null;
}

const defaultContentJson: ContentJsonb = {
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
};

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

export const NewsEventsPage: React.FC<Props> = ({ news, media, onSave, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'news' | 'event'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeLangTab, setActiveLangTab] = useState<'vi' | 'en'>('vi');
  const [originalItem, setOriginalItem] = useState<NewsEvent | null>(null);

  const [commonForm, setCommonForm] = useState<CommonFormState>({
    id: '',
    type: 'news',
    status: 'draft',
    thumbnailImageId: null,
    eventStartAt: null,
    eventEndAt: null,
  });

  const [viForm, setViForm] = useState<LocalizedFormState>({
    title: '',
    slug: '',
    shortDescription: '',
    location: '',
    contentRaw: JSON.stringify(defaultContentJson, null, 2),
    seoTitle: '',
    seoDescription: '',
  });

  const [enForm, setEnForm] = useState<LocalizedFormState>({
    title: '',
    slug: '',
    shortDescription: '',
    location: '',
    contentRaw: '',
    seoTitle: '',
    seoDescription: '',
  });

  const handleOpenCreate = () => {
    setOriginalItem(null);
    setCommonForm({
      id: '',
      type: 'news',
      status: 'draft',
      thumbnailImageId: media[0]?.id || null,
      eventStartAt: null,
      eventEndAt: null,
    });
    setViForm({
      title: '',
      slug: '',
      shortDescription: '',
      location: '',
      contentRaw: JSON.stringify(defaultContentJson, null, 2),
      seoTitle: '',
      seoDescription: '',
    });
    setEnForm({
      title: '',
      slug: '',
      shortDescription: '',
      location: '',
      contentRaw: '',
      seoTitle: '',
      seoDescription: '',
    });
    setActiveLangTab('vi');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: NewsEvent) => {
    setOriginalItem(item);
    setCommonForm({
      id: item.id,
      type: item.type,
      status: item.status,
      thumbnailImageId: item.thumbnailImageId || null,
      eventStartAt: item.eventStartAt || null,
      eventEndAt: item.eventEndAt || null,
    });

    // Hydrate VI from translations.vi if present, else fallback to legacy top-level fields
    const viTrans = item.translations?.vi;
    const viTitle = viTrans ? viTrans.title : (item.title || '');
    const viSlug = viTrans ? viTrans.slug : (item.slug || '');
    const viShortDesc = viTrans ? (viTrans.shortDescription || '') : (item.shortDescription || '');
    const viLoc = viTrans ? (viTrans.location || '') : (item.location || '');
    const viContentObj = viTrans ? viTrans.content : item.content;
    const viSeoTitle = viTrans?.seoTitle || '';
    const viSeoDesc = viTrans?.seoDescription || '';

    setViForm({
      title: viTitle,
      slug: viSlug,
      shortDescription: viShortDesc,
      location: viLoc,
      contentRaw: viContentObj ? JSON.stringify(viContentObj, null, 2) : '',
      seoTitle: viSeoTitle,
      seoDescription: viSeoDesc,
    });

    // Hydrate EN from translations.en if present and valid; otherwise keep completely blank
    const enTrans = item.translations?.en;
    if (enTrans && enTrans.title && enTrans.title.trim().length > 0) {
      setEnForm({
        title: enTrans.title || '',
        slug: enTrans.slug || '',
        shortDescription: enTrans.shortDescription || '',
        location: enTrans.location || '',
        contentRaw: enTrans.content ? JSON.stringify(enTrans.content, null, 2) : '',
        seoTitle: enTrans.seoTitle || '',
        seoDescription: enTrans.seoDescription || '',
      });
    } else {
      setEnForm({
        title: '',
        slug: '',
        shortDescription: '',
        location: '',
        contentRaw: '',
        seoTitle: '',
        seoDescription: '',
      });
    }

    setActiveLangTab('vi');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (isSaving) return;
    setSaveError(null);

    // 1. Validate Vietnamese (required)
    const viTitle = viForm.title.trim();
    if (!viTitle) {
      setSaveError('Tiêu đề Tiếng Việt là bắt buộc.');
      setActiveLangTab('vi');
      return;
    }

    let viSlug = viForm.slug.trim();
    if (!viSlug) {
      viSlug = slugify(viTitle);
    }
    if (!viSlug) {
      setSaveError('Đường dẫn tĩnh (Slug) Tiếng Việt không được để trống.');
      setActiveLangTab('vi');
      return;
    }

    let parsedViContent: ContentJsonb | null = null;
    if (viForm.contentRaw.trim()) {
      try {
        parsedViContent = JSON.parse(viForm.contentRaw);
      } catch {
        setSaveError('Nội dung Tiếng Việt (JSON) không hợp lệ. Vui lòng kiểm tra cú pháp JSON.');
        setActiveLangTab('vi');
        return;
      }
    } else {
      parsedViContent = defaultContentJson;
    }

    // 2. Validate English (optional, but validated if provided or was previously authored)
    const enTitle = enForm.title.trim();
    const hasAnyEnField = Boolean(
      enTitle ||
      enForm.slug.trim() ||
      enForm.shortDescription.trim() ||
      enForm.location.trim() ||
      enForm.contentRaw.trim() ||
      enForm.seoTitle.trim() ||
      enForm.seoDescription.trim()
    );

    const hadExistingEn = Boolean(
      originalItem?.translations?.en?.title && originalItem.translations.en.title.trim().length > 0
    );

    // Rule: Existing EN cannot be deleted by clearing title in v1
    if (hadExistingEn && !enTitle) {
      setSaveError('Bài viết đã có bản dịch tiếng Anh. Không thể để trống tiêu đề tiếng Anh.');
      setActiveLangTab('en');
      return;
    }

    // Rule: Partial EN without title is invalid
    if (!hadExistingEn && hasAnyEnField && !enTitle) {
      setSaveError('Vui lòng nhập Tiêu đề tiếng Anh nếu muốn lưu bản dịch tiếng Anh.');
      setActiveLangTab('en');
      return;
    }

    let enSlug = '';
    let parsedEnContent: ContentJsonb | null = null;

    if (enTitle) {
      enSlug = enForm.slug.trim() || slugify(enTitle);
      if (!enSlug) {
        setSaveError('Đường dẫn tĩnh (Slug) tiếng Anh không được để trống.');
        setActiveLangTab('en');
        return;
      }

      if (enSlug === viSlug) {
        setSaveError('Đường dẫn tĩnh (Slug) tiếng Anh không được trùng với tiếng Việt.');
        setActiveLangTab('en');
        return;
      }

      if (enForm.contentRaw.trim()) {
        try {
          parsedEnContent = JSON.parse(enForm.contentRaw);
        } catch {
          setSaveError('Nội dung English (JSON) không hợp lệ. Vui lòng kiểm tra cú pháp JSON.');
          setActiveLangTab('en');
          return;
        }
      }
    }

    // 3. Build translations and item
    const viTranslation: NewsEventTranslation = {
      title: viTitle,
      slug: viSlug,
      shortDescription: viForm.shortDescription.trim() || null,
      location: viForm.location.trim() || null,
      content: parsedViContent,
      seoTitle: viForm.seoTitle.trim() || null,
      seoDescription: viForm.seoDescription.trim() || null,
    };

    let enTranslation: NewsEventTranslation | null = null;
    if (enTitle) {
      enTranslation = {
        title: enTitle,
        slug: enSlug,
        shortDescription: enForm.shortDescription.trim() || null,
        location: enForm.location.trim() || null,
        content: parsedEnContent,
        seoTitle: enForm.seoTitle.trim() || null,
        seoDescription: enForm.seoDescription.trim() || null,
      };
    }

    const itemToSave: NewsEvent = {
      id: commonForm.id,
      type: commonForm.type,
      status: commonForm.status,
      thumbnailImageId: commonForm.thumbnailImageId || null,
      eventStartAt: commonForm.eventStartAt || null,
      eventEndAt: commonForm.eventEndAt || null,
      // Mirror VI translation fields to legacy parent columns
      title: viTranslation.title,
      slug: viTranslation.slug,
      shortDescription: viTranslation.shortDescription,
      location: viTranslation.location,
      content: viTranslation.content || defaultContentJson,
      translations: {
        vi: viTranslation,
        en: enTranslation,
      },
      createdAt: originalItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    try {
      await onSave(itemToSave);
      setIsModalOpen(false);
      setOriginalItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lưu bài viết thất bại. Vui lòng kiểm tra lại.';
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const hasEnTranslation = (item: NewsEvent) => {
    return Boolean(item.translations?.en?.title && item.translations.en.title.trim().length > 0);
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
                Tất cả ({news.length})
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span
                        className="translation-status-badge"
                        style={{
                          display: 'inline-block',
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: hasEnTranslation(item)
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(245, 158, 11, 0.15)',
                          color: hasEnTranslation(item) ? '#34d399' : '#fbbf24',
                          fontWeight: 600,
                        }}
                      >
                        {hasEnTranslation(item) ? 'VI ✓ · EN ✓' : 'VI ✓ · EN Thiếu'}
                      </span>
                    </div>
                    {item.shortDescription && (
                      <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: 3 }}>
                        {item.shortDescription}
                      </div>
                    )}
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
                      <ConfiguredExternalLink
                        href={buildPublicUrl(`/tin-tuc/${item.slug}`)}
                        className="btn-icon"
                        title="Xem bài viết trên website"
                        unavailableReason="Chưa cấu hình VITE_PUBLIC_SITE_URL hợp lệ."
                      >
                        <ExternalLink size={16} color="#38bdf8" />
                      </ConfiguredExternalLink>
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
                        onClick={async () => {
                          if (window.confirm(`Xóa bài "${item.title}"?`)) {
                            try {
                              await onDelete(item.id);
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

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={commonForm.id ? 'Chỉnh Sửa Tin Tức / Sự Kiện' : 'Tạo Bài Mới'}
          maxWidth="760px"
          footer={
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
              >
                Hủy
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Đang lưu...' : 'Lưu Xuất Bản'}
              </button>
            </>
          }
        >
          {saveError && (
            <div className="modal-error-alert" role="alert" style={{ marginBottom: 16 }}>
              <span>{saveError}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* THÔNG TIN CHUNG (Language-neutral) */}
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Thông Tin Chung
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phân Loại *</label>
                <select
                  className="form-control"
                  value={commonForm.type}
                  onChange={(e) =>
                    setCommonForm({
                      ...commonForm,
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
                  value={commonForm.status}
                  onChange={(e) =>
                    setCommonForm({
                      ...commonForm,
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
              <label>Ảnh Thumbnail (Chọn từ Media)</label>
              <select
                className="form-control"
                value={commonForm.thumbnailImageId || ''}
                onChange={(e) =>
                  setCommonForm({ ...commonForm, thumbnailImageId: e.target.value || null })
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

            {commonForm.type === 'event' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Thời Gian Bắt Đầu</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={
                      commonForm.eventStartAt
                        ? new Date(commonForm.eventStartAt).toISOString().slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      setCommonForm({
                        ...commonForm,
                        eventStartAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Thời Gian Kết Thúc</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={
                      commonForm.eventEndAt
                        ? new Date(commonForm.eventEndAt).toISOString().slice(0, 16)
                        : ''
                    }
                    onChange={(e) =>
                      setCommonForm({
                        ...commonForm,
                        eventEndAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                  />
                </div>
              </div>
            )}

            {/* TAB NGÔN NGỮ (No flags, purely text) */}
            <div style={{ marginTop: 8 }}>
              <div className="translation-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Nội Dung Bản Dịch
                </span>
                <div className="tab-pill-group">
                  <button
                    type="button"
                    className={`tab-pill ${activeLangTab === 'vi' ? 'active' : ''}`}
                    onClick={() => setActiveLangTab('vi')}
                  >
                    Tiếng Việt
                  </button>
                  <button
                    type="button"
                    className={`tab-pill ${activeLangTab === 'en' ? 'active' : ''}`}
                    onClick={() => setActiveLangTab('en')}
                  >
                    English
                  </button>
                </div>
              </div>

              {/* VIETNAMESE TAB */}
              <div style={{ display: activeLangTab === 'vi' ? 'flex' : 'none', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label>Tiêu Đề (Tiếng Việt) *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: Hội thảo kỹ thuật phân tích LNG 2026..."
                    value={viForm.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      const prevExpectedSlug = slugify(viForm.title);
                      const shouldAutoSlug = !viForm.slug || viForm.slug === prevExpectedSlug;
                      setViForm({
                        ...viForm,
                        title: newTitle,
                        slug: shouldAutoSlug ? slugify(newTitle) : viForm.slug,
                      });
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Đường Dẫn Tĩnh Slug (Tiếng Việt) *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="hoi-thao-ky-thuat-lng-2026"
                    value={viForm.slug}
                    onChange={(e) => setViForm({ ...viForm, slug: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Địa Điểm (Tiếng Việt)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: Trung tâm Hội nghị White Palace, TP.HCM"
                    value={viForm.location}
                    onChange={(e) => setViForm({ ...viForm, location: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Mô Tả Tóm Tắt (Tiếng Việt)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={viForm.shortDescription}
                    onChange={(e) => setViForm({ ...viForm, shortDescription: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Nội Dung JSONB Blocks (Tiếng Việt)</label>
                  <textarea
                    className="form-control"
                    rows={5}
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                    value={viForm.contentRaw}
                    onChange={(e) => setViForm({ ...viForm, contentRaw: e.target.value })}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Cấu trúc chuẩn gồm blocks: heading, paragraph, image, bullet_list, quote...
                  </span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>SEO Title (Tiếng Việt - Tùy chọn)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={viForm.seoTitle}
                      onChange={(e) => setViForm({ ...viForm, seoTitle: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>SEO Description (Tiếng Việt - Tùy chọn)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={viForm.seoDescription}
                      onChange={(e) => setViForm({ ...viForm, seoDescription: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* ENGLISH TAB */}
              <div style={{ display: activeLangTab === 'en' ? 'flex' : 'none', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label>Title (English)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Technical Seminar on LNG Analysis 2026..."
                    value={enForm.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      const prevExpectedSlug = slugify(enForm.title);
                      const shouldAutoSlug = !enForm.slug || enForm.slug === prevExpectedSlug;
                      setEnForm({
                        ...enForm,
                        title: newTitle,
                        slug: shouldAutoSlug ? slugify(newTitle) : enForm.slug,
                      });
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Slug (English)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="technical-seminar-lng-analysis-2026"
                    value={enForm.slug}
                    onChange={(e) => setEnForm({ ...enForm, slug: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Location (English)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. White Palace Convention Center, HCMC"
                    value={enForm.location}
                    onChange={(e) => setEnForm({ ...enForm, location: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Short Description (English)</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={enForm.shortDescription}
                    onChange={(e) => setEnForm({ ...enForm, shortDescription: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Content JSONB Blocks (English)</label>
                  <textarea
                    className="form-control"
                    rows={5}
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                    value={enForm.contentRaw}
                    placeholder='{"version": 1, "blocks": [{"type": "paragraph", "data": {"text": "..."}}]}'
                    onChange={(e) => setEnForm({ ...enForm, contentRaw: e.target.value })}
                  />
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    JSON format version 1 with blocks: heading, paragraph, image, bullet_list, quote...
                  </span>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>SEO Title (English - Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={enForm.seoTitle}
                      onChange={(e) => setEnForm({ ...enForm, seoTitle: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>SEO Description (English - Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={enForm.seoDescription}
                      onChange={(e) => setEnForm({ ...enForm, seoDescription: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
