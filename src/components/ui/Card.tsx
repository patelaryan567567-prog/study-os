import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
  padding?: "sm" | "md" | "lg";
  variant?: "default" | "elevated" | "sunken" | "accent";
}

const paddings = {
  sm: "p-3 md:p-4 lg:p-5",
  md: "p-4 md:p-5 lg:p-6",
  lg: "p-5 md:p-6 lg:p-7",
};

const cardStyles: Record<string, React.CSSProperties> = {
  default: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow:
      "0 20px 50px rgba(8, 15, 42, 0.18), 0 1px 0 rgba(255,255,255,0.06) inset",
  },
  elevated: {
    background: "rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow:
      "0 24px 58px rgba(8, 15, 42, 0.2), 0 1px 0 rgba(255,255,255,0.07) inset",
  },
  sunken: {
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "inset 0 2px 10px rgba(0,0,0,0.35)",
  },
  accent: {
    background:
      "linear-gradient(135deg, rgba(124,106,247,0.14), rgba(124,106,247,0.06))",
    border: "1px solid rgba(124,106,247,0.18)",
    boxShadow: "0 20px 44px rgba(124,106,247,0.14)",
  },
};

export function Card({
  children,
  className,
  hover,
  glow,
  onClick,
  padding = "md",
  variant = "default",
}: CardProps) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.div
      whileHover={
        hover && !shouldReduceMotion
          ? {
              scale: 1.01,
              y: -4,
              boxShadow:
                "0 26px 62px rgba(59,130,246,0.18), 0 0 0 1px rgba(59,130,246,0.12)",
            }
          : undefined
      }
      whileTap={onClick && !shouldReduceMotion ? { scale: 0.99 } : undefined}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-[20px] transition-all",
        paddings[padding],
        hover && "cursor-pointer",
        glow && "glow-accent",
        className,
      )}
      style={{
        ...cardStyles[variant],
        ...{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: "20px",
          transition: "all 250ms ease",
        },
      }}
    >
      <div
        className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full opacity-10"
        style={{
          background:
            "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 60%)",
        }}
      />
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

export function StatCard({
  label,
  value,
  icon,
  color = "#7c6af7",
  trend,
  subtitle,
}: StatCardProps) {
  return (
    <Card hover className="relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${color}, transparent 60%)`,
        }}
      />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-xs font-medium text-[var(--color-text-secondary)]">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1.5 text-[var(--color-text-primary)] tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs mt-1 text-[var(--color-text-muted)]">
              {subtitle}
            </p>
          )}
          {trend !== undefined && (
            <p
              className="text-xs mt-1"
              style={{
                color:
                  trend >= 0 ? "var(--color-success)" : "var(--color-danger)",
              }}
            >
              {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% vs last week
            </p>
          )}
        </div>
        <div
          className="p-2.5 rounded-xl shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}25` }}
        >
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
    </Card>
  );
}
