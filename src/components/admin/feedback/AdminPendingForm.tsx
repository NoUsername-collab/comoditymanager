"use client";

import type { ReactNode } from "react";
import { useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
};

/** Formular server action cu pending controlat, fără overlay global. */
export function AdminPendingForm({ action, children, className, onSubmit }: Props) {
  const runAdminAction = useRunAdminAction();

  return (
    <form
      className={className}
      data-admin-pending="true"
      onSubmit={onSubmit}
      action={(formData) => runAdminAction(() => action(formData))}
    >
      {children}
    </form>
  );
}
