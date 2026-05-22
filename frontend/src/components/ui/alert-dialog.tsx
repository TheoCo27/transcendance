import {
  cloneElement,
  createContext,
  createElement,
  useContext,
  useEffect,
  useId,
  useMemo,
} from "react";
import { createPortal } from "react-dom";

type AlertDialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
};

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

function useAlertDialogContext() {
  const context = useContext(AlertDialogContext);

  if (!context) {
    throw new Error("AlertDialog components must be used within AlertDialog");
  }

  return context;
}

type AlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

export function AlertDialog({
  open,
  onOpenChange,
  children,
}: AlertDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  const value = useMemo(
    () => ({ open, setOpen: onOpenChange, titleId, descriptionId }),
    [descriptionId, onOpenChange, open, titleId],
  );

  return (
    <AlertDialogContext.Provider value={value}>
      {children}
    </AlertDialogContext.Provider>
  );
}

type AlertDialogTriggerProps = {
  asChild?: boolean;
  children: React.ReactElement;
  className?: string;
};

export function AlertDialogTrigger({
  asChild = false,
  children,
  className,
}: AlertDialogTriggerProps) {
  const { setOpen } = useAlertDialogContext();

  if (!asChild) {
    return createElement(
      "button",
      {
        className,
        type: "button",
        onClick: () => setOpen(true),
      },
      children,
    );
  }

  return cloneElement(children, {
    className: [children.props.className, className].filter(Boolean).join(" "),
    onClick: (event: React.MouseEvent) => {
      children.props.onClick?.(event);
      if (!event.defaultPrevented) {
        setOpen(true);
      }
    },
  });
}

type AlertDialogContentProps = {
  className?: string;
  children: React.ReactNode;
};

export function AlertDialogContent({
  className = "",
  children,
}: AlertDialogContentProps) {
  const { open, setOpen, titleId, descriptionId } = useAlertDialogContext();

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <button
        aria-label="Fermer la fenêtre de dialogue"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        type="button"
        onClick={() => setOpen(false)}
      />
      <div
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        role="alertdialog"
        className={`relative w-full max-w-lg rounded-3xl border border-white/10 bg-slate-950 p-6 text-text shadow-[0_30px_90px_rgba(15,23,42,0.45)] ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

type AlertDialogHeaderProps = {
  className?: string;
  children: React.ReactNode;
};

export function AlertDialogHeader({
  className = "",
  children,
}: AlertDialogHeaderProps) {
  return <div className={`space-y-2 ${className}`}>{children}</div>;
}

type AlertDialogTitleProps = {
  className?: string;
  children: React.ReactNode;
};

export function AlertDialogTitle({
  className = "",
  children,
}: AlertDialogTitleProps) {
  const { titleId } = useAlertDialogContext();

  return (
    <h2
      id={titleId}
      className={`text-2xl font-semibold tracking-tight ${className}`}
    >
      {children}
    </h2>
  );
}

type AlertDialogDescriptionProps = {
  className?: string;
  children: React.ReactNode;
};

export function AlertDialogDescription({
  className = "",
  children,
}: AlertDialogDescriptionProps) {
  const { descriptionId } = useAlertDialogContext();

  return (
    <p
      id={descriptionId}
      className={`text-sm leading-relaxed text-white/65 ${className}`}
    >
      {children}
    </p>
  );
}

type AlertDialogFooterProps = {
  className?: string;
  children: React.ReactNode;
};

export function AlertDialogFooter({
  className = "",
  children,
}: AlertDialogFooterProps) {
  return (
    <div
      className={`mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end ${className}`}
    >
      {children}
    </div>
  );
}

type AlertDialogActionProps = React.ComponentPropsWithoutRef<"button">;

export function AlertDialogAction({
  className = "",
  onClick,
  type = "button",
  ...props
}: AlertDialogActionProps) {
  const { setOpen } = useAlertDialogContext();

  return (
    <button
      type={type}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          setOpen(false);
        }
      }}
      className={`inline-flex items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:pointer-events-none disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}

type AlertDialogCancelProps = React.ComponentPropsWithoutRef<"button">;

export function AlertDialogCancel({
  className = "",
  onClick,
  type = "button",
  ...props
}: AlertDialogCancelProps) {
  const { setOpen } = useAlertDialogContext();

  return (
    <button
      type={type}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          setOpen(false);
        }
      }}
      className={`inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 ${className}`}
      {...props}
    />
  );
}
