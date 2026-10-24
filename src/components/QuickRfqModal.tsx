import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react';
import { CheckCircle2, X, Send, AlertCircle } from 'lucide-react';
import { useLanguage } from '../i18n';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  product: {
    model: string;
    name: string;
    slug: string;
  };
}

export function QuickRfqModal({ isOpen, onClose, product }: Props) {
  const { t, language } = useLanguage();
  const defaultMsg =
    language === 'vi'
      ? `Xin vui lòng gửi bảng chào giá và tài liệu kỹ thuật cho thiết bị ${product.model} (${product.name}).`
      : `Please send the formal quotation and technical datasheet for ${product.model} (${product.name}).`;

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(defaultMsg);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const isSubmittingRef = useRef(false);

  const handleModalClose = useCallback(() => {
    setSubmitSuccess(false);
    setSubmitError('');
    onClose();
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleModalClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleModalClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;

    // Validate phone number digits (7 to 15 digits)
    const phoneDigits = phone.replace(/\D/g, '').length;
    const validPhone = /^\+?[0-9 ().-]+$/.test(phone) && phoneDigits >= 7 && phoneDigits <= 15;
    if (!validPhone) {
      setSubmitError(t('contactPhoneInvalid'));
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const payload = {
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        requestType: 'quotation',
        message: message.trim(),
      };

      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSubmitSuccess(true);
        setSubmitError('');
      } else if (response.status === 429) {
        setSubmitError(
          language === 'vi'
            ? 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.'
            : 'Too many requests. Please try again in a few minutes.'
        );
      } else {
        const errorData = await response.json().catch(() => null);
        const errMsg =
          errorData?.message ||
          (language === 'vi'
            ? 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại sau.'
            : 'An error occurred while sending your request. Please try again.');
        setSubmitError(Array.isArray(errMsg) ? errMsg[0] : errMsg);
      }
    } catch {
      setSubmitError(t('contactNetworkError'));
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div
      className="rfq-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rfq-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleModalClose();
      }}
    >
      <div className="rfq-modal-dialog">
        <div className="rfq-modal-header">
          <h3 id="rfq-modal-title">{t('quickRfqTitle')}</h3>
          <button
            type="button"
            className="rfq-btn-close"
            onClick={handleModalClose}
            aria-label={t('closeMenu')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="rfq-modal-body">
          {submitSuccess ? (
            <div className="rfq-success-box">
              <CheckCircle2 size={48} style={{ color: '#10b981' }} />
              <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--ink-strong)' }}>
                {t('quickRfqSuccess')}
              </h4>
              <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {t('quickRfqSuccessDesc')}
              </p>
              <button
                type="button"
                className="button button-primary"
                style={{ marginTop: 12, minWidth: 140 }}
                onClick={handleModalClose}
              >
                {t('quickRfqClose')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="rfq-product-chip">
                <span>{t('quickRfqForProduct')}:</span>
                <strong>{product.model}</strong>
              </div>

              <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: 'var(--ink-soft)' }}>
                {t('quickRfqDesc')}
              </p>

              {submitError && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 6,
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    fontSize: '0.84rem',
                    marginBottom: 16,
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="rfq-form-group">
                <label htmlFor="rfq-fullName">
                  {t('fullName')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="rfq-fullName"
                    type="text"
                    required
                    className="rfq-form-control"
                    placeholder={language === 'vi' ? 'Ví dụ: Nguyễn Văn A' : 'e.g., John Doe'}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div className="rfq-form-group">
                <label htmlFor="rfq-companyName">
                  {t('contactCompany')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  id="rfq-companyName"
                  type="text"
                  required
                  className="rfq-form-control"
                  placeholder={
                    language === 'vi'
                      ? 'Ví dụ: Lọc dầu Dung Quất / Viện Dầu Khí'
                      : 'e.g., Refinery / Laboratory'
                  }
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <div className="rfq-form-group">
                  <label htmlFor="rfq-email">
                    {t('email')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="rfq-email"
                    type="email"
                    required
                    className="rfq-form-control"
                    placeholder="email@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="rfq-form-group">
                  <label htmlFor="rfq-phone">
                    {t('phone')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="rfq-phone"
                    type="tel"
                    required
                    className="rfq-form-control"
                    placeholder="0912 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="rfq-form-group">
                <label htmlFor="rfq-message">
                  {t('message')} <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  id="rfq-message"
                  required
                  rows={3}
                  className="rfq-form-control"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  {t('quickRfqClose')}
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={isSubmitting}
                  style={{ minWidth: 160, justifyContent: 'center' }}
                >
                  <Send size={16} aria-hidden="true" />
                  <span>{isSubmitting ? t('quickRfqSubmitting') : t('quickRfqSubmit')}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
