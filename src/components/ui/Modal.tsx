import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none`}
          >
            <div className={`glass rounded-2xl w-full ${sizes[size]} pointer-events-auto border border-[var(--color-border)]`}
              style={{ background: 'var(--color-bg-card)' }}>
              {title && (
                <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)]">{title}</h2>
                  <Button variant="ghost" size="icon" onClick={onClose}>
                    <X size={16} />
                  </Button>
                </div>
              )}
              <div className="p-5">{children}</div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
