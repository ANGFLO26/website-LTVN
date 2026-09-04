import { SearchX } from 'lucide-react'
import type { ReactNode } from 'react'

export function SectionHeading({
  eyebrow,
  title,
  titleId,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  titleId?: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 id={titleId}>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function PageIntro({
  eyebrow,
  title,
  description,
  image,
  className = '',
  actions,
  aside,
}: {
  eyebrow: string
  title: string
  description: string
  image?: string
  className?: string
  actions?: ReactNode
  aside?: ReactNode
}) {
  return (
    <section className={`page-intro ${aside ? 'page-intro-has-aside' : ''} ${className}`.trim()}>
      {image && (
        <img
          className="page-intro-media"
          src={image}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
        />
      )}
      <div className="page-intro-shade" aria-hidden="true" />
      <div className="container page-intro-inner">
        <div className="page-intro-copy">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          {actions && <div className="page-intro-actions">{actions}</div>}
        </div>
        {aside && <div className="page-intro-aside">{aside}</div>}
      </div>
    </section>
  )
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}) {
  return (
    <div className="empty-state">
      <SearchX aria-hidden="true" />
      <h3>{title}</h3>
      <p>{description}</p>
      <button type="button" className="button button-secondary" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  )
}
