import { CircleCheckIcon, OctagonXIcon, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "error" | "success";

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
  success: (message: string, options?: ToastOptions) => void;
};

const DEFAULT_DURATION_MS = 4500;
const MAX_TOASTS = 1;

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
        title: options?.title ?? (variant === "success" ? "Succès" : "Erreur"),
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
      success: (message, options) => {
        addToast("success", message, options);
      },
    }),
    [addToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-4 z-50 flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col gap-2">
        {toasts.map((toast) =>
          (() => {
            const isSuccess = toast.variant === "success";
            const titleIcon = isSuccess ? (
              <CircleCheckIcon className="size-4 text-success" />
            ) : (
              <OctagonXIcon className="size-4 text-danger" />
            );
            const containerClass = isSuccess
              ? "pointer-events-auto rounded-lg border border-success/50 bg-surface/95 p-4 text-text shadow-lg backdrop-blur-sm"
              : "pointer-events-auto rounded-lg border border-danger/50 bg-surface/95 p-4 text-text shadow-lg backdrop-blur-sm";
            const titleClass = isSuccess
              ? "font-semibold text-success"
              : "font-semibold text-danger";
            const closeButtonClass = isSuccess
              ? "rounded border border-success/40 p-1 text-xs font-semibold text-success transition hover:bg-success/10"
              : "rounded border border-danger/40 p-1 text-xs font-semibold text-danger transition hover:bg-danger/10";
            const progressContainerClass = isSuccess
              ? "mt-3 h-1 rounded bg-success/25"
              : "mt-3 h-1 rounded bg-danger/25";
            const progressBarClass = isSuccess
              ? "h-full w-full rounded bg-success/70"
              : "h-full w-full rounded bg-danger/70";

            return (
              <div className={containerClass} key={toast.id} role="alert">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {titleIcon}
                      <p className={titleClass}>{toast.title}</p>
                    </div>
                    {toast.description ? (
                      <p className="mt-1 text-sm text-text-muted">
                        {toast.description}
                      </p>
                    ) : null}
                  </div>
                  <button
                    aria-label="Fermer"
                    className={closeButtonClass}
                    onClick={() => {
                      removeToast(toast.id);
                    }}
                    type="button"
                  >
                    <X className="size-4" strokeWidth={3} />
                  </button>
                </div>
                <div className={progressContainerClass}>
                  <div className={progressBarClass} />
                </div>
              </div>
            );
          })(),
        )}
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
