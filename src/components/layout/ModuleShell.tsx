import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { GlowingText } from "@/components/ui/GlowingText";
import { GradientText } from "@/components/ui/GradientText";
import { cn } from "@/utils";

type ShellVariant = "dark" | "surface";
type TitleStyle = "gradient" | "shimmer" | "glow";

interface ModuleShellProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Decorative blurred blobs rendered behind the page content. */
  backgroundGlow?: ReactNode;
  variant?: ShellVariant;
  titleStyle?: TitleStyle;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  children: ReactNode;
}

const ROOT_CLASSES: Record<ShellVariant, string> = {
  dark: "min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-purple-950/20 p-8",
  surface:
    "min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-8",
};

const HEADING_CLASSES: Record<ShellVariant, string> = {
  dark: "text-5xl font-bold",
  surface: "text-4xl font-bold text-gray-900 dark:text-white",
};

const SUBTITLE_CLASSES: Record<ShellVariant, string> = {
  dark: "mt-2 text-xl text-gray-400",
  surface: "mt-2 text-gray-600 dark:text-gray-300",
};

function Title({
  title,
  titleStyle,
}: {
  title: string;
  titleStyle: TitleStyle;
}) {
  if (titleStyle === "glow") {
    return <GlowingText variant="primary">{title}</GlowingText>;
  }
  if (titleStyle === "shimmer") {
    return <span className="shimmer-text">{title}</span>;
  }
  return (
    <GradientText from="from-primary-500" to="to-accent-500">
      {title}
    </GradientText>
  );
}

export function ModuleShell({
  title,
  subtitle,
  actions,
  backgroundGlow,
  variant = "surface",
  titleStyle = variant === "dark" ? "shimmer" : "gradient",
  className,
  contentClassName,
  headerClassName,
  children,
}: ModuleShellProps) {
  return (
    <div className={cn(ROOT_CLASSES[variant], className)}>
      <div className={cn("mx-auto max-w-7xl", contentClassName)}>
        {backgroundGlow && (
          <div className="fixed inset-0 -z-10 overflow-hidden">
            {backgroundGlow}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: variant === "dark" ? -30 : -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div
            className={cn(
              "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
              headerClassName,
            )}
          >
            <div>
              <h1 className={HEADING_CLASSES[variant]}>
                <Title title={title} titleStyle={titleStyle} />
              </h1>
              {subtitle && (
                <p className={SUBTITLE_CLASSES[variant]}>{subtitle}</p>
              )}
            </div>
            {actions}
          </div>
        </motion.div>

        {children}
      </div>
    </div>
  );
}
