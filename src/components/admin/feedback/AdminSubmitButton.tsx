"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useAdminPending } from "@/components/admin/feedback/AdminPendingProvider";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel?: string;
};

export function AdminSubmitButton({
  children,
  pendingLabel = "Se procesează…",
  disabled,
  ...props
}: Props) {
  const { pending: formPending } = useFormStatus();
  const { pending: globalPending } = useAdminPending();
  const pending = formPending || globalPending;

  return (
    <button type="submit" disabled={disabled || pending} aria-busy={pending} {...props}>
      {formPending ? pendingLabel : children}
    </button>
  );
}
