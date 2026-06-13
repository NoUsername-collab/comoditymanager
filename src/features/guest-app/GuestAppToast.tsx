"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastContextValue = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function GuestAppToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((next: string) => {
    setMessage(next);
    window.setTimeout(() => setMessage(null), 2600);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? (
        <div className="guest-app__toast" role="status" aria-live="polite">
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useGuestAppToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useGuestAppToast must be used within GuestAppToastProvider");
  }
  return ctx;
}
