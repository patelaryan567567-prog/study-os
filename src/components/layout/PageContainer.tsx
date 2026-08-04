import type { ReactNode } from 'react';
import { cn } from '@/utils';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function PageContainer({ children, className, title, subtitle, action, icon }: PageContainerProps) {
  return (
    <section className={cn('min-h-full p-5 lg:p-7 max-w-[1440px] mx-auto w-full', className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 mb-7">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(124,106,247,0.2), rgba(124,106,247,0.08))',
                  border: '1px solid rgba(124,106,247,0.2)',
                }}>
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] tracking-tight">{title}</h2>
              )}
              {subtitle && (
                <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
