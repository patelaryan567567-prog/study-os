import { motion } from 'framer-motion';
import { cn } from '@/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
  padding?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'elevated' | 'sunken' | 'accent';
}

const paddings = { sm: 'p-3', md: 'p-4', lg: 'p-6' };

const cardStyles: Record<string, React.CSSProperties> = {
  default: {
    background: 'rgba(255,255,255,0.035)',
    border: '1px solid rgba(255,255,255,0.07)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.04) inset',
  },
  elevated: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset',
  },
  sunken: {
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(255,255,255,0.04)',
    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
  },
  accent: {
    background: 'linear-gradient(135deg, rgba(124,106,247,0.12), rgba(124,106,247,0.04))',
    border: '1px solid rgba(124,106,247,0.2)',
    boxShadow: '0 4px 24px rgba(124,106,247,0.1)',
  },
};

export function Card({ children, className, hover, glow, onClick, padding = 'md', variant = 'default' }: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.005, y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.99 } : undefined}
      onClick={onClick}
      className={cn(
        'rounded-2xl backdrop-blur-xl transition-all duration-200',
        paddings[padding],
        hover && 'cursor-pointer',
        glow && 'glow-accent',
        className
      )}
      style={{
        ...cardStyles[variant],
        ...(hover ? { transition: 'all 0.2s ease' } : {}),
      }}
    >
      {children}
    </motion.div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  trend?: number;
  subtitle?: string;
}

export function StatCard({ label, value, icon, color = '#7c6af7', trend, subtitle }: StatCardProps) {
  return (
    <Card hover className="relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${color}, transparent 60%)` }} />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</p>
          <p className="text-2xl font-bold mt-1.5 text-[var(--color-text-primary)] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs mt-1 text-[var(--color-text-muted)]">{subtitle}</p>}
          {trend !== undefined && (
            <p className="text-xs mt-1" style={{ color: trend >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last week
            </p>
          )}
        </div>
        <div className="p-2.5 rounded-xl shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}25` }}>
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
    </Card>
  );
}
