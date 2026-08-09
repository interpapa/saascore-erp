'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (options: Omit<Toast, 'id'>) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// ─── Config per variant ───────────────────────────────────────────────────────

const variantConfig: Record<
  ToastVariant,
  { icon: React.ReactNode; ring: string; iconColor: string }
> = {
  success: {
    icon: <CheckCircle2 size={18} />,
    ring: 'border-emerald-500/30 dark:border-emerald-500/20',
    iconColor: 'text-emerald-500',
  },
  error: {
    icon: <XCircle size={18} />,
    ring: 'border-rose-500/30 dark:border-rose-500/20',
    iconColor: 'text-rose-500',
  },
  info: {
    icon: <Info size={18} />,
    ring: 'border-indigo-500/30 dark:border-indigo-500/20',
    iconColor: 'text-indigo-500',
  },
  warning: {
    icon: <AlertTriangle size={18} />,
    ring: 'border-amber-500/30 dark:border-amber-500/20',
    iconColor: 'text-amber-500',
  },
};

// ─── Toast Item ───────────────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const cfg = variantConfig[toast.variant];

  // Trigger entrance animation on mount
  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 350);
  }, [toast.id, onDismiss]);

  // Auto-dismiss after 4s
  useEffect(() => {
    const timer = setTimeout(dismiss, 4000);
    return () => clearTimeout(timer);
  }, [dismiss]);

  return (
    <div
      className={`
        w-full max-w-sm
        bg-card/90 backdrop-blur-xl
        border ${cfg.ring}
        rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40
        p-4 pr-3
        flex items-start gap-3
        transition-all duration-350 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4'
        }
      `}
      role="alert"
      aria-live="assertive"
    >
      {/* Icon */}
      <div className={`mt-0.5 shrink-0 ${cfg.iconColor}`}>{cfg.icon}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground leading-snug">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {toast.description}
          </p>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={dismiss}
        className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Cerrar notificación"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((options: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...options, id }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container — bottom-left to avoid AI Copilot orb (bottom-right) */}
      <div
        className="fixed bottom-6 left-6 z-80 flex flex-col-reverse gap-3 pointer-events-none"
        aria-label="Notificaciones"
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
