import { motion } from "framer-motion";
import { cn } from "@/utils";
import { SkeletonButton } from "./Skeleton";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "icon";
  loading?: boolean;
  children: React.ReactNode;
}

const variants = {
  primary: "text-white font-semibold tracking-[0.2px]",
  secondary: "text-[var(--color-text-primary)] font-semibold tracking-[0.2px]",
  ghost:
    "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-semibold tracking-[0.2px]",
  danger: "text-white font-semibold tracking-[0.2px]",
  success: "text-[var(--color-success)] font-semibold tracking-[0.2px]",
};

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, #4F46E5, #0EA5E9)",
    boxShadow: "0 18px 44px rgba(59,130,246,0.24)",
    border: "1px solid rgba(59,130,246,0.18)",
  },
  secondary: {
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(124,106,247,0.18)",
    boxShadow: "0 16px 32px rgba(124,106,247,0.14)",
  },
  ghost: {
    background: "transparent",
    border: "1px solid transparent",
  },
  danger: {
    background:
      "linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.95))",
    boxShadow: "0 18px 38px rgba(239,68,68,0.2)",
    border: "1px solid rgba(248,113,113,0.24)",
  },
  success: {
    background:
      "linear-gradient(135deg, rgba(34,211,160,0.95), rgba(16,185,129,0.95))",
    boxShadow: "0 18px 32px rgba(34,211,160,0.18)",
    border: "1px solid rgba(34,211,160,0.18)",
  },
};

const sizes = {
  sm: "h-[38px] px-4 text-xs rounded-[14px] gap-[10px]",
  md: "h-[46px] px-5 text-sm rounded-[14px] gap-[10px]",
  lg: "h-[46px] px-6 text-sm rounded-[14px] gap-[10px]",
  icon: "w-[46px] h-[46px] p-0 rounded-full",
};

export function Button({
  variant = "secondary",
  size = "md",
  loading,
  children,
  className,
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <motion.button
      whileHover={disabled || loading ? undefined : { scale: 1.02, y: -2 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      className={cn(
        "relative inline-flex items-center justify-center gap-[10px] cursor-pointer select-none",
        "transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        variants[variant],
        sizes[size],
        className,
      )}
      style={{
        ...variantStyles[variant],
        ...style,
        transition: "all 250ms ease",
        opacity: disabled ? 0.5 : 1,
      }}
      disabled={disabled || loading}
      {...(props as any)}
    >
      <span
        className={cn(
          "flex items-center justify-center gap-[10px] w-full",
          loading && "opacity-0",
        )}
      >
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <SkeletonButton className="h-4 w-16 rounded-full" />
        </span>
      )}
    </motion.button>
  );
}
