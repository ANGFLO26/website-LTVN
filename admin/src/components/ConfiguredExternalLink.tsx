import type { ReactNode } from 'react';

interface Props {
  href?: string;
  title: string;
  className?: string;
  unavailableReason?: string;
  children: ReactNode;
}

export function ConfiguredExternalLink({ href, title, className, unavailableReason, children }: Props) {
  if (!href) {
    return (
      <button type="button" disabled className={className} aria-label={title}
        title={`${title} — ${unavailableReason || 'Chưa cấu hình URL hợp lệ.'}`}>
        {children}
      </button>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} title={title} aria-label={title}>
      {children}
    </a>
  );
}
