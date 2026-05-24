"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type AdminPendingContextValue = {
  pending: boolean;
  runAdminAction: <T>(fn: () => Promise<T> | T) => Promise<T>;
};

const AdminPendingContext = createContext<AdminPendingContextValue | null>(null);

export function AdminPendingProvider({ children }: { children: ReactNode }) {
  const depthRef = useRef(0);
  const [pending, setPending] = useState(false);

  const runAdminAction = useCallback(
    async <T,>(fn: () => Promise<T> | T): Promise<T> => {
      depthRef.current += 1;
      setPending(true);
      try {
        return await fn();
      } finally {
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

  return (
    <AdminPendingContext.Provider value={value}>
      {children}
      {pending ? (
        <div
          className="admin-pending-overlay"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Se procesează cererea"
        >
          <div className="admin-pending-overlay__card">
            <span className="admin-pending-overlay__spinner" aria-hidden />
            <span className="admin-pending-overlay__text">Se procesează…</span>
          </div>
        </div>
      ) : null}
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
