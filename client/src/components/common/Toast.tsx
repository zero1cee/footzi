import React from 'react';
import { CheckCircle2, Sparkles, AlertCircle, X } from 'lucide-react';
import { useToastStore, ToastType } from '@/store/useToastStore';

export const Toast: React.FC = () => {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  const renderIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />;
      case 'info':
      default:
        return <Sparkles className="w-4 h-4 text-sand-400 shrink-0" />;
    }
  };

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-6 inset-x-0 z-50 flex flex-col items-center gap-2 pointer-events-none px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto max-w-md bg-charcoal-950/95 backdrop-blur-md text-ivory-100 border border-sand-500/40 shadow-2xl px-4 py-2.5 rounded-full flex items-center gap-3 text-xs tracking-wide animate-fade-in transition-all"
        >
          {renderIcon(t.type)}
          <span className="font-medium text-ivory-50 select-none">{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            className="text-charcoal-400 hover:text-ivory-50 p-1 -mr-1 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
