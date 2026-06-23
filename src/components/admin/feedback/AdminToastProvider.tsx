"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import {
  burstConfetti,
  playCancelSound,
  playConfirmSound,
} from "./admin-fx-effects";

export type AdminToastKind = "success" | "info" | "error";

export type AdminToast = {
  id: string;
  kind: AdminToastKind;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

type AdminFxContextValue = {
  toasts: AdminToast[];
  showToast: (toast: Omit<AdminToast, "id">) => void;
  dismissToast: (id: string) => void;
  celebrateConfirm: (title?: string, message?: string) => void;
  notifyCancel: (title?: string, message?: string) => void;
  notifyMoved: (title?: string, message?: string) => void;
};

const AdminFxContext = createContext<AdminFxContextValue | null>(null);

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const tCommon = useTranslations("admin.common");
  const [toasts, setToasts] = useState<AdminToast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<AdminToast, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev.slice(-4), { ...toast, id }]);
      const ms = toast.actionLabel ? 10_000 : 4200;
      window.setTimeout(() => dismissToast(id), ms);
    },
    [dismissToast]
  );

  const celebrateConfirm = useCallback(
    (
      title = tCommon("bookingConfirmedTitle"),
      message = tCommon("bookingConfirmedMessage")
    ) => {
      showToast({ kind: "success", title, message });
      burstConfetti();
      playConfirmSound();
    },
    [showToast, tCommon]
  );

  const notifyCancel = useCallback(
    (
      title = tCommon("bookingCancelledTitle"),
      message = tCommon("bookingCancelledMessage")
    ) => {
      showToast({ kind: "info", title, message });
      playCancelSound();
    },
    [showToast, tCommon]
  );

  const notifyMoved = useCallback(
    (
      title = tCommon("bookingMovedTitle"),
      message = tCommon("bookingMovedMessage")
    ) => {
      showToast({ kind: "success", title, message });
      playConfirmSound();
    },
    [showToast, tCommon]
  );

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      dismissToast,
      celebrateConfirm,
      notifyCancel,
      notifyMoved,
    }),
    [toasts, showToast, dismissToast, celebrateConfirm, notifyCancel, notifyMoved]
  );

  return (
    <AdminFxContext.Provider value={value}>
      {children}
      <AdminToastViewport toasts={toasts} onDismiss={dismissToast} />
    </AdminFxContext.Provider>
  );
}

export function useAdminFx() {
  const ctx = useContext(AdminFxContext);
  if (!ctx) {
    throw new Error("useAdminFx must be used within AdminToastProvider");
  }
  return ctx;
}

function AdminToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: AdminToast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  const hasError = toasts.some((t) => t.kind === "error");

  return (
    <div
      className="admin-toast-stack"
      aria-live={hasError ? "assertive" : "polite"}
      aria-relevant="additions"
    >
      {toasts.map((t) => (
        <AdminToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function AdminToastItem({
  toast,
  onDismiss,
}: {
  toast: AdminToast;
  onDismiss: (id: string) => void;
}) {
  const tCommon = useTranslations("admin.common");
  const icon =
    toast.kind === "success" ? "✓" : toast.kind === "error" ? "!" : "i";

  return (
    <div
      className={`admin-toast admin-toast--${toast.kind}`}
      role={toast.kind === "error" ? "alert" : "status"}
    >
      <span className="admin-toast__icon" aria-hidden>
        {icon}
      </span>
      <div className="admin-toast__body">
        <p className="admin-toast__title">{toast.title}</p>
        {toast.message ? (
          <p className="admin-toast__message">{toast.message}</p>
        ) : null}
        {toast.actionLabel && toast.onAction ? (
          <button
            type="button"
            className="admin-toast__action"
            onClick={() => {
              toast.onAction?.();
              onDismiss(toast.id);
            }}
          >
            {toast.actionLabel}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className="admin-toast__close"
        aria-label={tCommon("close")}
        onClick={() => onDismiss(toast.id)}
      >
        ×
      </button>
    </div>
  );
}
