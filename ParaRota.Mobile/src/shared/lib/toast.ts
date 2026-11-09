// Minimal toast bridge — RN Paper Snackbar is mounted in MainLayout via ToastHost.
// Anywhere in app code, call `showToast('Hello')` and it appears.

type Severity = 'info' | 'success' | 'warning' | 'error';

interface ToastItem {
  id: number;
  message: string;
  severity: Severity;
}

type Listener = (items: ToastItem[]) => void;

const listeners = new Set<Listener>();
let queue: ToastItem[] = [];
let nextId = 1;

function emit() {
  for (const l of listeners) l(queue);
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(queue);
  return () => {
    listeners.delete(listener);
  };
}

export function dismissToast(id: number) {
  queue = queue.filter((t) => t.id !== id);
  emit();
}

function push(message: string, severity: Severity) {
  const id = nextId++;
  queue = [...queue, { id, message, severity }];
  emit();
  setTimeout(() => dismissToast(id), severity === 'error' ? 5000 : 3000);
}

export const toast = {
  info: (msg: string) => push(msg, 'info'),
  success: (msg: string) => push(msg, 'success'),
  warning: (msg: string) => push(msg, 'warning'),
  error: (msg: string) => push(msg, 'error'),
};

export function showToast(msg: string, severity: Severity = 'info') {
  push(msg, severity);
}
