import type { ReactNode } from "react";
import { cn } from "@/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "subtle" | "bold";
  hover?: boolean;
}

const variantStyles: Record<GlassCardProps["variant"], string> = {
  default: "bg-white/5 dark:bg-black/20 border-white/10",
  subtle: "bg-white/3 dark:bg-black/10 border-white/5",
  bold: "bg-white/10 dark:bg-black/30 border-white/15",
};

export function GlassCard({
  children,
  className,
  variant = "default",
  hover = true,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300",
        variantStyles[variant],
        hover && "hover:scale-[1.02] hover:shadow-2xl",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
