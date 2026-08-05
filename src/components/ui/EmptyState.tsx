import { motion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import React from "react";
import { FileText, Plus } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  primaryLabel = "Create",
  onPrimary,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`w-full flex items-center justify-center ${className || ""}`}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28 }}
        className="w-full max-w-md"
      >
        <Card padding="lg" className="glass text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-gradient-to-br from-white/6 to-white/3 text-[var(--color-accent)] shadow-md">
              {icon || <FileText size={40} />}
            </div>
            <h3 className="text-lg font-bold">{title}</h3>
            {description && (
              <p className="text-sm text-[var(--color-text-muted)]">
                {description}
              </p>
            )}
            {onPrimary && (
              <Button variant="primary" onClick={onPrimary} className="mt-2">
                <Plus size={14} /> {primaryLabel}
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default EmptyState;
