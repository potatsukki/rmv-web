import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface WorkspacePageHeaderProps {
  eyebrow: string;
  title: ReactNode;
  description: string;
  image?: string;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function WorkspacePageHeader({
  eyebrow,
  title,
  description,
  image,
  actions,
  children,
  className,
}: WorkspacePageHeaderProps) {
  return (
    <section className={cn('workspace-page-header', className)}>
      {image && (
        <img className="workspace-page-header__image" src={image} alt="" aria-hidden="true" />
      )}
      <div className="workspace-page-header__scrim" />
      <div className="workspace-page-header__content">
        <div>
          <p className="workspace-eyebrow">{eyebrow}</p>
          <h1 className="workspace-page-header__title">{title}</h1>
          <p className="workspace-page-header__description">{description}</p>
        </div>
        {actions && <div className="workspace-page-header__actions">{actions}</div>}
      </div>
      {children && <div className="workspace-page-header__footer">{children}</div>}
    </section>
  );
}
