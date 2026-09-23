import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) {
  // Portal to <body>: the page transition wrapper applies transforms and
  // z-indexed stacking contexts that would otherwise trap the modal below the
  // sticky top bar (z-60) and break `fixed` viewport coverage.
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[200] bg-[rgba(0,0,0,0.65)] backdrop-blur-[8px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 24 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto pointer-events-none"
          >
            <div
              className={`w-full max-w-[95%] ${sizes[size]} pointer-events-auto rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,30,0.88)] backdrop-blur-[24px] shadow-[0_28px_90px_rgba(0,0,0,0.5)]`}
              style={{ minWidth: 0 }}
            >
              {title && (
                <div className="flex items-start justify-between gap-4 border-b border-[rgba(255,255,255,0.06)] px-7 py-6">
                  <div>
                    <h2 className="text-[26px] font-semibold leading-tight text-[var(--color-text-primary)]">
                      {title}
                    </h2>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-11 w-11 rounded-[14px] border border-[rgba(255,255,255,0.1)] bg-white/5 transition duration-200 hover:bg-white/10"
                  >
                    <X size={16} />
                  </Button>
                </div>
              )}
              <div className="px-7 py-7">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}
