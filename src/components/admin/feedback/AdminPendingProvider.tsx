"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AdminThemeLoading } from "@/components/admin/loading/AdminThemeLoading";

const MIN_PENDING_MS = 400;

type AdminPendingContextValue = {
  pending: boolean;
  runAdminAction: <T>(fn: () => Promise<T> | T) => Promise<T>;
};

const AdminPendingContext = createContext<AdminPendingContextValue | null>(null);

export function AdminPendingProvider({ children }: { children: ReactNode }) {
  const depthRef = useRef(0);
  const [pending, setPending] = useState(false);
  const mounted = typeof document !== "undefined";

  useEffect(() => {
    if (!pending) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pending]);

  const runAdminAction = useCallback(
    async <T,>(fn: () => Promise<T> | T): Promise<T> => {
      depthRef.current += 1;
      setPending(true);
      const started = Date.now();
      try {
        return await fn();
      } finally {
        const elapsed = Date.now() - started;
        const wait = Math.max(0, MIN_PENDING_MS - elapsed);
        if (wait > 0) {
          await new Promise((resolve) => setTimeout(resolve, wait));
        }
        depthRef.current = Math.max(0, depthRef.current - 1);
        if (depthRef.current === 0) {
          setPending(false);
        }
      }
    },
    []
  );

  const value = useMemo(
    () => ({ pending, runAdminAction }),
    [pending, runAdminAction]
  );

  const overlay =
    pending && mounted ? (
      <AdminThemeLoading fullScreen label="Se procesează…" />
    ) : null;

  return (
    <AdminPendingContext.Provider value={value}>
      {children}
      {overlay ? createPortal(overlay, document.body) : null}
    </AdminPendingContext.Provider>
  );
}

export function useAdminPending() {
  const ctx = useContext(AdminPendingContext);
  if (!ctx) {
    throw new Error("useAdminPending must be used within AdminPendingProvider");
  }
  return ctx;
}

/** Safe în componente care pot rula și în afara admin shell. */
export function useRunAdminAction() {
  const ctx = useContext(AdminPendingContext);
  return useCallback(
    async <T,>(fn: () => Promise<T> | T): Promise<T> => {
      if (ctx) {
        return ctx.runAdminAction(fn);
      }
      return fn();
    },
    [ctx]
  );
}

export function useAdminPendingOptional() {
  return useContext(AdminPendingContext);
}
