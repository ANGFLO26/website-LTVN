import { useLanguage } from '../i18n'

export function DataLoadError({ onRetry }: { onRetry: () => Promise<void> }) {
  const { language } = useLanguage()
  return (
    <div className="empty-state" role="alert">
      <h2>{language === 'vi' ? 'Không tải được dữ liệu' : 'Unable to load content'}</h2>
      <p>{language === 'vi'
        ? 'Thông tin hiện chưa được xác minh. Vui lòng thử lại.'
        : 'The content could not be verified. Please try again.'}</p>
      <button type="button" className="button button-secondary" onClick={() => { void onRetry() }}>
        {language === 'vi' ? 'Thử lại' : 'Retry'}
      </button>
    </div>
  )
}
