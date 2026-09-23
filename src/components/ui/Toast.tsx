import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { useState, useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastQueue: ((t: Toast) => void) | null = null;

export function showToast(message: string, type: ToastType = "info") {
  toastQueue?.({ id: Date.now().toString(), message, type });
}

const icons = {
  success: <CheckCircle size={16} />,
  error: <AlertCircle size={16} />,
  info: <Info size={16} />,
  warning: <AlertCircle size={16} />,
};

const colors = {
  success: "text-[var(--color-success)]",
  error: "text-[var(--color-danger)]",
  info: "text-[var(--color-info)]",
  warning: "text-[var(--color-warning)]",
};

const accentColors = {
  success: "#22c55e",
  error: "#ef4444",
  info: "#38bdf8",
  warning: "#f97316",
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastQueue = (t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(
        () => setToasts((prev) => prev.filter((x) => x.id !== t.id)),
        3500,
      );
    };
    return () => {
      toastQueue = null;
    };
  }, []);

  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 40, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, y: -20, scale: 0.9 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.08)] backdrop-blur-[18px] shadow-[0_10px_40px_rgba(0,0,0,0.35)] pointer-events-auto"
            style={{ minWidth: 320, maxWidth: 420 }}
          >
            <div
              className="absolute left-0 top-0 h-full w-1.5"
              style={{ background: accentColors[t.type] }}
            />
            <div className="flex items-start gap-3 px-5 py-4 pl-6">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{
                  background: `${accentColors[t.type]}20`,
                  color: accentColors[t.type],
                }}
              >
                {icons[t.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${colors[t.type]}`}>
                  {t.message}
                </p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: accentColors[t.type],
                      animation: "toast-progress 3.5s linear forwards",
                    }}
                  />
                </div>
              </div>
              <button
                onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
                className="ml-3 opacity-70 transition-opacity duration-200 hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
