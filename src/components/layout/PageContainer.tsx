import type { ReactNode } from "react";
import { cn } from "@/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function PageContainer({
  children,
  className,
  title,
  subtitle,
  action,
  icon,
}: PageContainerProps) {
  return (
    <section
      className={cn(
        "min-h-full p-6 lg:p-8 max-w-[1440px] mx-auto w-full rounded-[28px] border border-white/10 bg-[rgba(255,255,255,0.05)] shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur-[16px]",
        className,
      )}
    >
      {(title || action) && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div
                className="w-12 h-12 rounded-3xl flex items-center justify-center shrink-0"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(124,106,247,0.24), rgba(56,189,248,0.16))",
                  border: "1px solid rgba(124,106,247,0.22)",
                }}
              >
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="text-2xl lg:text-3xl font-extrabold text-[var(--color-text-primary)] tracking-tight truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-1 text-sm lg:text-base text-[var(--color-text-secondary)] leading-relaxed truncate">
                  {subtitle}
                </p>
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
