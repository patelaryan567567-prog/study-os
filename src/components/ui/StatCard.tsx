import type { ReactNode } from "react";
import { GlassCard } from "./GlassCard";
import { cn } from "@/utils";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  color?: "primary" | "success" | "warning" | "info";
}

const colorClasses: Record<NonNullable<StatCardProps["color"]>, string> = {
  primary: "from-primary-500/20 to-primary-600/10",
  success: "from-success/20 to-success/10",
  warning: "from-warning/20 to-warning/10",
  info: "from-info/20 to-info/10",
};

export function StatCard({
  label,
  value,
  icon,
  trend,
  color = "primary",
}: StatCardProps) {
  return (
    <GlassCard>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {label}
            </p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-3xl font-bold text-gray-900 dark:text-white"
            >
              {value}
            </motion.p>
          </div>
          <div
            className={cn(
              "rounded-xl p-3 bg-gradient-to-br",
              colorClasses[color],
            )}
          >
            {icon}
          </div>
        </div>
        {trend && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 flex items-center gap-2 text-sm"
          >
            <span className={trend.value >= 0 ? "text-success" : "text-error"}>
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {trend.label}
            </span>
          </motion.div>
        )}
      </div>
    </GlassCard>
  );
}
