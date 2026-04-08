'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info';

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastInput = Omit<ToastItem, 'id'>;

type ToastContextValue = {
  pushToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toneIcon(tone: ToastTone) {
  switch (tone) {
    case 'success':
      return CheckCircle2;
    case 'error':
      return AlertTriangle;
    default:
      return Info;
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (toast: ToastInput) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { ...toast, id }]);
      window.setTimeout(() => dismissToast(id), 3200);
    },
    [dismissToast],
  );

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[70] flex justify-center px-4 sm:justify-end sm:px-6">
        <div className="flex w-full max-w-sm flex-col gap-3">
          {toasts.map((toast) => {
            const Icon = toneIcon(toast.tone);

            return (
              <div
                key={toast.id}
                className={cn(
                  'pointer-events-auto surface-card app-shell-shadow flex items-start gap-3 border px-4 py-3',
                  toast.tone === 'success' && 'border-emerald-200 bg-emerald-50/95',
                  toast.tone === 'error' && 'border-destructive/30 bg-destructive/5',
                  toast.tone === 'info' && 'border-border bg-background/95',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                    toast.tone === 'success' && 'bg-emerald-100 text-emerald-700',
                    toast.tone === 'error' && 'bg-destructive/10 text-destructive',
                    toast.tone === 'info' && 'bg-secondary text-secondary-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  aria-label="Dismiss notification"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider.');
  }

  return context;
}
