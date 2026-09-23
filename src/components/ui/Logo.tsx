import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  animated?: boolean;
}

const sizeMap = {
  sm: { icon: "w-6 h-6", text: "text-lg" },
  md: { icon: "w-8 h-8", text: "text-2xl" },
  lg: { icon: "w-10 h-10", text: "text-3xl" },
  xl: { icon: "w-14 h-14", text: "text-4xl" },
};

export function Logo({
  className,
  size = "md",
  showText = true,
  animated = true,
}: LogoProps) {
  const sizes = sizeMap[size];

  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-2xl",
          sizes.icon,
          animated && "animate-pulse-slow",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500",
            "opacity-75 blur-xl",
            animated && "animate-glow",
          )}
        />

        <div
          className={cn(
            "relative z-10 flex items-center justify-center w-full h-full",
            "bg-gradient-to-br from-purple-600 via-pink-500 to-cyan-500 rounded-2xl",
            "shadow-[0_0_30px_rgba(139,92,246,0.3)]",
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-3/4 h-3/4 text-white"
          >
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M2 17L12 22L22 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M2 12L12 17L22 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
        </div>
      </div>

      {showText && (
        <span
          className={cn(
            "font-bold tracking-tight",
            "bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent",
            sizes.text,
            animated && "animate-shimmer",
          )}
        >
          StudyOS
        </span>
      )}
    </div>
  );
}
