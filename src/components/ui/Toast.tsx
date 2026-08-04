import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastQueue: ((t: Toast) => void) | null = null;

export function showToast(message: string, type: ToastType = 'info') {
  toastQueue?.({ id: Date.now().toString(), message, type });
}

const icons = {
  success: <CheckCircle size={16} />,
  error: <AlertCircle size={16} />,
  info: <Info size={16} />,
  warning: <AlertCircle size={16} />,
};

const colors = {
  success: 'text-[var(--color-success)] bg-[var(--color-success)]/10 border-[var(--color-success)]/20',
  error: 'text-[var(--color-danger)] bg-[var(--color-danger)]/10 border-[var(--color-danger)]/20',
  info: 'text-[var(--color-info)] bg-[var(--color-info)]/10 border-[var(--color-info)]/20',
  warning: 'text-[var(--color-warning)] bg-[var(--color-warning)]/10 border-[var(--color-warning)]/20',
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastQueue = (t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3500);
    };
    return () => { toastQueue = null; };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border glass pointer-events-auto ${colors[t.type]}`}
          >
            {icons[t.type]}
            <span className="text-sm font-medium">{t.message}</span>
            <button onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))} className="ml-2 opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
