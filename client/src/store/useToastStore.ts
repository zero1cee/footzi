import { create } from 'zustand';

export type ToastType = 'info' | 'success' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: ToastItem[];
  show: (message: string, type?: ToastType, durationMs?: number) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, type = 'info', durationMs = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-2), { id, message, type }], // Keep max 3 toasts
    }));

    if (durationMs > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, durationMs);
    }
  },
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const toast = {
  show: (message: string, durationMs?: number) =>
    useToastStore.getState().show(message, 'info', durationMs),
  success: (message: string, durationMs?: number) =>
    useToastStore.getState().show(message, 'success', durationMs),
  error: (message: string, durationMs?: number) =>
    useToastStore.getState().show(message, 'error', durationMs),
};
