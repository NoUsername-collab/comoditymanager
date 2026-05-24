"use client";

import type { ReactNode } from "react";
import { useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  className?: string;
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void;
};

/** Formular server action cu overlay global de loading. */
export function AdminPendingForm({ action, children, className, onSubmit }: Props) {
  const runAdminAction = useRunAdminAction();

  return (
    <form
      className={className}
      onSubmit={onSubmit}
      action={(formData) => {
        void runAdminAction(() => action(formData));
      }}
    >
      {children}
    </form>
  );
}
