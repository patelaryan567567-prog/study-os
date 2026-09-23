import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlowingTextProps {
  children: ReactNode;
  variant?: "primary" | "accent" | "pink" | "cyan";
  className?: string;
}

export function GlowingText({
  children,
  variant = "primary",
  className,
}: GlowingTextProps) {
  const glowColors: Record<GlowingTextProps["variant"], string> = {
    primary: "text-primary-400 glow-text",
    accent: "text-accent-400 glow-text-accent",
    pink: "text-pink-400 glow-text-pink",
    cyan: "text-cyan-400 glow-text-cyan",
  };

  return (
    <span className={cn("font-bold", glowColors[variant], className)}>
      {children}
    </span>
  );
}
