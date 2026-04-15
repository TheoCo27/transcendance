import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "error";

type ToastItem = {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  durationMs: number;
};

type ToastOptions = {
  title?: string;
  durationMs?: number;
};

type ToastContextValue = {
  error: (message: string, options?: ToastOptions) => void;
};

const DEFAULT_DURATION_MS = 4500;
const MAX_TOASTS = 5;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (variant: ToastVariant, message: string, options?: ToastOptions) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const toast: ToastItem = {
        id,
        title: options?.title ?? "Erreur",
        description: message,
        variant,
        durationMs: options?.durationMs ?? DEFAULT_DURATION_MS,
      };

      setToasts((previous) => {
        if (previous.length >= MAX_TOASTS) {
          return [...previous.slice(1), toast];
        }

        return [toast, ...previous];
      });
      window.setTimeout(() => {
        removeToast(id);
      }, toast.durationMs);
    },
    [removeToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      error: (message, options) => {
        addToast("error", message, options);
      },
    }),
    [addToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(92vw,26rem)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            className="pointer-events-auto rounded-lg border border-danger/50 bg-surface/95 p-4 text-text shadow-lg backdrop-blur-sm"
            key={toast.id}
            role="alert"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-danger">
                  {toast.title}
                </p>
                {toast.description ? (
                  <p className="mt-1 text-sm text-text-muted">
                    {toast.description}
                  </p>
                ) : null}
              </div>
              <button
                aria-label="Fermer"
                className="rounded border border-danger/40 px-2 py-0.5 text-xs font-semibold text-danger transition hover:bg-danger/10"
                onClick={() => {
                  removeToast(toast.id);
                }}
                type="button"
              >
                x
              </button>
            </div>
            <div className="mt-3 h-1 rounded bg-danger/25">
              <div className="h-full w-full rounded bg-danger/70" />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
