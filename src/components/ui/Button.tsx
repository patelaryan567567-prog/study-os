import { motion } from 'framer-motion';
import { cn } from '@/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  children: React.ReactNode;
}

const variants = {
  primary: 'text-white font-semibold',
  secondary: 'text-[var(--color-text-primary)] font-medium',
  ghost: 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium',
  danger: 'text-[var(--color-danger)] font-medium',
  success: 'text-[var(--color-success)] font-medium',
};

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #7c6af7, #9580ff)',
    boxShadow: '0 4px 16px rgba(124,106,247,0.35), 0 1px 0 rgba(255,255,255,0.15) inset',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  secondary: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  ghost: {
    background: 'transparent',
    border: '1px solid transparent',
  },
  danger: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
  },
  success: {
    background: 'rgba(34,211,160,0.1)',
    border: '1px solid rgba(34,211,160,0.2)',
  },
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'px-6 py-2.5 text-sm rounded-xl gap-2',
  icon: 'p-2 rounded-xl',
};

export function Button({ variant = 'secondary', size = 'md', loading, children, className, disabled, style, ...props }: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.97 }}
      className={cn(
        'transition-all duration-150 flex items-center cursor-pointer',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      style={{ ...variantStyles[variant], ...style }}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : children}
    </motion.button>
  );
}
