import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Calendar, MapPin, ExternalLink, ArrowUp, ArrowDown, Code, LayoutList } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import type { NewsEvent, MediaAsset, ContentBlock, ContentJsonb, NewsEventTranslation } from '../types';
import { buildPublicUrl } from '../config/urls';
import { ConfiguredExternalLink } from '../components/ConfiguredExternalLink';

interface ContentBlocksEditorProps {
  value: string;
  onChange: (newRaw: string) => void;
  media: MediaAsset[];
  locale: 'vi' | 'en';
}

const ContentBlocksEditor: React.FC<ContentBlocksEditorProps> = ({ value, onChange, media, locale }) => {
  const [mode, setMode] = useState<'visual' | 'json'>('visual');

  let parsedBlocks: ContentBlock[] | null = null;
  if (!value.trim()) {
    parsedBlocks = [];
  } else {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.blocks)) {
        parsedBlocks = parsed.blocks as ContentBlock[];
      }
    } catch {
      parsedBlocks = null;
    }
  }

  const updateBlocks = (nextBlocks: ContentBlock[]) => {
    if (nextBlocks.length === 0 && !value.trim()) {
      onChange('');
      return;
    }
    onChange(JSON.stringify({ version: 1, blocks: nextBlocks }, null, 2));
  };

  const handleAddBlock = (type: ContentBlock['type']) => {
    const current = parsedBlocks || [];
    let newBlock: ContentBlock;
    switch (type) {
      case 'heading':
        newBlock = { type: 'heading', data: { level: 2, text: '' } };
        break;
      case 'paragraph':
        newBlock = { type: 'paragraph', data: { text: '' } };
        break;
      case 'bullet_list':
        newBlock = { type: 'bullet_list', data: { items: [''] } };
        break;
      case 'numbered_list':
        newBlock = { type: 'numbered_list', data: { items: [''] } };
        break;
      case 'image':
        newBlock = { type: 'image', data: { url: media[0]?.publicUrl || '', alt: '', caption: '' } };
        break;
      case 'quote':
        newBlock = { type: 'quote', data: { text: '', author: '' } };
        break;
      default:
        newBlock = { type: 'paragraph', data: { text: '' } };
    }
    updateBlocks([...current, newBlock]);
  };

  const handleMoveBlock = (index: number, direction: -1 | 1) => {
    if (!parsedBlocks) return;
    const target = index + direction;
    if (target < 0 || target >= parsedBlocks.length) return;
    const next = [...parsedBlocks];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    updateBlocks(next);
  };

  const handleRemoveBlock = (index: number) => {
    if (!parsedBlocks) return;
    const next = parsedBlocks.filter((_, i) => i !== index);
    updateBlocks(next);
  };

  const handleUpdateBlockData = (index: number, patch: Record<string, unknown>) => {
    if (!parsedBlocks) return;
    const next = parsedBlocks.map((b, i) =>
      i === index ? { ...b, data: { ...b.data, ...patch } } : b
    );
    updateBlocks(next);
  };

  const handleChangeBlockType = (index: number, newType: ContentBlock['type']) => {
    if (!parsedBlocks) return;
    const oldData = parsedBlocks[index]?.data || {};
    const textVal = typeof oldData.text === 'string' ? oldData.text : '';
    let newData: Record<string, unknown> = {};
    if (newType === 'heading') newData = { level: 2, text: textVal };
    else if (newType === 'paragraph') newData = { text: textVal };
    else if (newType === 'bullet_list' || newType === 'numbered_list') {
      newData = { items: Array.isArray(oldData.items) ? oldData.items : textVal ? [textVal] : [''] };
    } else if (newType === 'image') {
      newData = { url: typeof oldData.url === 'string' ? oldData.url : '', alt: '', caption: '' };
    } else if (newType === 'quote') {
      newData = { text: textVal, author: '' };
    }
    const next = parsedBlocks.map((b, i) => (i === index ? { type: newType, data: newData } : b));
    updateBlocks(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ marginBottom: 0 }}>
          {locale === 'vi' ? 'Nội Dung Bài Viết (Tiếng Việt)' : 'Article Content Blocks (English)'}
        </label>
        <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: 6, padding: 2, gap: 2 }}>
          <button
            type="button"
            onClick={() => setMode('visual')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              background: mode === 'visual' ? '#ffffff' : 'transparent',
              color: mode === 'visual' ? '#0f172a' : '#64748b',
              boxShadow: mode === 'visual' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <LayoutList size={13} /> Trực quan ({parsedBlocks ? parsedBlocks.length : 0})
          </button>
          <button
            type="button"
            onClick={() => setMode('json')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              background: mode === 'json' ? '#ffffff' : 'transparent',
              color: mode === 'json' ? '#0f172a' : '#64748b',
              boxShadow: mode === 'json' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <Code size={13} /> Mã JSON
          </button>
        </div>
      </div>

      {mode === 'json' || parsedBlocks === null ? (
        <>
          {parsedBlocks === null && mode === 'visual' && (
            <div style={{ fontSize: '0.78rem', color: '#b91c1c', background: '#fef2f2', padding: '6px 10px', borderRadius: 6 }}>
              Cú pháp JSON hiện tại chưa hợp lệ nên hiển thị ở chế độ Mã JSON để bạn sửa lỗi.
            </div>
          )}
          <textarea
            className="form-control"
            rows={6}
            style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
            value={value}
            placeholder='{"version": 1, "blocks": [{"type": "paragraph", "data": {"text": "..."}}]}'
            onChange={(e) => onChange(e.target.value)}
          />
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Cấu trúc chuẩn gồm blocks: heading, paragraph, image, bullet_list, numbered_list, quote.
          </span>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
          {parsedBlocks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '14px 8px', color: '#64748b', fontSize: '0.82rem' }}>
              {locale === 'vi'
                ? 'Chưa có khối nội dung nào. Nhấn nút bên dưới để thêm tiêu đề, đoạn văn, danh sách hoặc hình ảnh.'
                : 'No content blocks yet. Click a button below to add headings, paragraphs, lists, or images.'}
            </div>
          ) : (
            parsedBlocks.map((block, idx) => {
              const data = block.data || {};
              return (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    padding: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#475569', background: '#e2e8f0', padding: '2px 6px', borderRadius: 4 }}>
                        #{idx + 1}
                      </span>
                      <select
                        className="form-control"
                        style={{ padding: '3px 8px', fontSize: '0.78rem', height: 'auto', width: 'auto' }}
                        value={block.type}
                        onChange={(e) => handleChangeBlockType(idx, e.target.value as ContentBlock['type'])}
                      >
                        <option value="heading">Tiêu đề (Heading)</option>
                        <option value="paragraph">Đoạn văn (Paragraph)</option>
                        <option value="bullet_list">Danh sách chấm (Bullet List)</option>
                        <option value="numbered_list">Danh sách số (Numbered List)</option>
                        <option value="image">Hình ảnh (Image)</option>
                        <option value="quote">Trích dẫn (Quote)</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Di chuyển lên"
                        disabled={idx === 0}
                        onClick={() => handleMoveBlock(idx, -1)}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        title="Di chuyển xuống"
                        disabled={idx === parsedBlocks.length - 1}
                        onClick={() => handleMoveBlock(idx, 1)}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon delete"
                        title="Xóa khối này"
                        onClick={() => handleRemoveBlock(idx)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {block.type === 'heading' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select
                        className="form-control"
                        style={{ width: 90 }}
                        value={typeof data.level === 'number' ? data.level : 2}
                        onChange={(e) => handleUpdateBlockData(idx, { level: Number(e.target.value) })}
                      >
                        <option value={2}>H2</option>
                        <option value={3}>H3</option>
                        <option value={4}>H4</option>
                      </select>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Nhập nội dung tiêu đề..."
                        value={typeof data.text === 'string' ? data.text : ''}
                        onChange={(e) => handleUpdateBlockData(idx, { text: e.target.value })}
                      />
                    </div>
                  )}

                  {block.type === 'paragraph' && (
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Nhập nội dung đoạn văn..."
                      value={typeof data.text === 'string' ? data.text : ''}
                      onChange={(e) => handleUpdateBlockData(idx, { text: e.target.value })}
                    />
                  )}

                  {(block.type === 'bullet_list' || block.type === 'numbered_list') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Mỗi dòng là một mục danh sách..."
                        value={Array.isArray(data.items) ? (data.items as string[]).join('\n') : ''}
                        onChange={(e) => handleUpdateBlockData(idx, { items: e.target.value.split('\n') })}
                      />
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Mỗi dòng tương ứng với 1 ý trong danh sách.</span>
                    </div>
                  )}

                  {block.type === 'image' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select
                          className="form-control"
                          style={{ maxWidth: 220 }}
                          value={media.find((m) => m.publicUrl === data.url)?.publicUrl || ''}
                          onChange={(e) => {
                            if (!e.target.value) return;
                            const found = media.find((m) => m.publicUrl === e.target.value);
                            handleUpdateBlockData(idx, {
                              url: e.target.value,
                              alt: (typeof data.alt === 'string' && data.alt) || found?.altText || '',
                            });
                          }}
                        >
                          <option value="">-- Chọn từ Media --</option>
                          {media.map((m) => (
                            <option key={m.id} value={m.publicUrl}>
                              {m.fileName}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Đường dẫn ảnh URL (/images/... hoặc https://...)"
                          value={typeof data.url === 'string' ? data.url : ''}
                          onChange={(e) => handleUpdateBlockData(idx, { url: e.target.value })}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Mô tả ảnh (Alt text)"
                          value={typeof data.alt === 'string' ? data.alt : ''}
                          onChange={(e) => handleUpdateBlockData(idx, { alt: e.target.value })}
                        />
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Chú thích dưới ảnh (Caption - tùy chọn)"
                          value={typeof data.caption === 'string' ? data.caption : ''}
                          onChange={(e) => handleUpdateBlockData(idx, { caption: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {block.type === 'quote' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Nội dung câu trích dẫn..."
                        value={typeof data.text === 'string' ? data.text : ''}
                        onChange={(e) => handleUpdateBlockData(idx, { text: e.target.value })}
                      />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Tác giả / Nguồn trích dẫn (tùy chọn)"
                        value={typeof data.author === 'string' ? data.author : ''}
                        onChange={(e) => handleUpdateBlockData(idx, { author: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 4 }}>
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => handleAddBlock('heading')}>
              <Plus size={13} /> Tiêu đề
            </button>
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => handleAddBlock('paragraph')}>
              <Plus size={13} /> Đoạn văn
            </button>
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => handleAddBlock('bullet_list')}>
              <Plus size={13} /> Danh sách
            </button>
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => handleAddBlock('image')}>
              <Plus size={13} /> Hình ảnh
            </button>
            <button type="button" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.76rem' }} onClick={() => handleAddBlock('quote')}>
              <Plus size={13} /> Trích dẫn
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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

const toLocalDateTimeInputValue = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

    if (commonForm.type === 'event' && commonForm.eventStartAt && commonForm.eventEndAt) {
      if (new Date(commonForm.eventEndAt).getTime() < new Date(commonForm.eventStartAt).getTime()) {
        setSaveError('Thời gian kết thúc sự kiện phải sau hoặc bằng thời gian bắt đầu.');
        return;
      }
    }

    const itemToSave: NewsEvent = {
      id: commonForm.id,
      type: commonForm.type,
      status: commonForm.status,
      thumbnailImageId: commonForm.thumbnailImageId || null,
      eventStartAt: commonForm.type === 'event' ? (commonForm.eventStartAt || null) : null,
      eventEndAt: commonForm.type === 'event' ? (commonForm.eventEndAt || null) : null,
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
                    value={toLocalDateTimeInputValue(commonForm.eventStartAt)}
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
                    value={toLocalDateTimeInputValue(commonForm.eventEndAt)}
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
                  <ContentBlocksEditor
                    locale="vi"
                    media={media}
                    value={viForm.contentRaw}
                    onChange={(contentRaw) => setViForm({ ...viForm, contentRaw })}
                  />
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
                  <ContentBlocksEditor
                    locale="en"
                    media={media}
                    value={enForm.contentRaw}
                    onChange={(contentRaw) => setEnForm({ ...enForm, contentRaw })}
                  />
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
