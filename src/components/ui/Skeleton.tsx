import { cn } from "@/utils";

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 animate-pulse",
        className,
      )}
      style={style}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-80" />
    </div>
  );
}

interface SkeletonTextProps {
  lines?: number;
  width?: string;
  className?: string;
}

export function SkeletonText({
  lines = 1,
  width = "w-full",
  className,
}: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            width,
            "h-3 rounded-full bg-white/10",
            index === lines - 1 && "max-w-[80%]",
          )}
        />
      ))}
    </div>
  );
}

interface SkeletonAvatarProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const avatarSizes: Record<NonNullable<SkeletonAvatarProps["size"]>, string> = {
  sm: "w-10 h-10",
  md: "w-14 h-14",
  lg: "w-20 h-20",
};

export function SkeletonAvatar({
  size = "md",
  className,
}: SkeletonAvatarProps) {
  return (
    <Skeleton
      className={cn("rounded-full bg-white/10", avatarSizes[size], className)}
    />
  );
}

interface SkeletonButtonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function SkeletonButton({ className, style }: SkeletonButtonProps) {
  return (
    <Skeleton
      className={cn("rounded-full bg-white/10", className)}
      style={style}
    />
  );
}

interface SkeletonCardProps {
  className?: string;
  style?: React.CSSProperties;
}

export function SkeletonCard({ className, style }: SkeletonCardProps) {
  return (
    <Skeleton
      className={cn(
        "rounded-[20px] border-white/10 bg-white/5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]",
        className,
      )}
      style={style}
    />
  );
}

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({
  rows = 4,
  columns = 5,
  className,
}: SkeletonTableProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, cell) => (
            <Skeleton key={cell} className="h-10 rounded-xl bg-white/10" />
          ))}
        </div>
      ))}
    </div>
  );
}

interface SkeletonChartProps {
  className?: string;
}

export function SkeletonChart({ className }: SkeletonChartProps) {
  return (
    <Skeleton className={cn("h-56 rounded-[24px] bg-white/10", className)} />
  );
}
