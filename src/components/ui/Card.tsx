import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils";
import { useTheme } from "@/context/ThemeContext";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "outline";
  hoverable?: boolean;
  padding?: string;
  children: ReactNode;
}

export function Card({
  className,
  variant = "default",
  hoverable = false,
  padding,
  children,
  ...props
}: CardProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // "sm" | "md" | "lg" are semantic paddings; anything else is treated as a raw class
  const paddingClasses: Record<string, string> = {
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  };
  const resolvedPadding = paddingClasses[padding ?? ""] ?? padding;

  const variantClasses = {
    default: isDark
      ? "bg-gray-800/80 border-gray-700"
      : "bg-white border-gray-200",
    glass: isDark
      ? "bg-gray-800/40 backdrop-blur-xl border-gray-700/50"
      : "bg-white/60 backdrop-blur-xl border-gray-200/50",
    outline: isDark ? "border-gray-700" : "border-gray-200",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all duration-200",
        variantClasses[variant],
        hoverable && "hover:shadow-lg hover:scale-[1.01]",
        resolvedPadding,
        isDark
          ? "shadow-[0_8px_30px_rgba(0,0,0,0.3)]"
          : "shadow-[0_8px_30px_rgba(0,0,0,0.05)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
