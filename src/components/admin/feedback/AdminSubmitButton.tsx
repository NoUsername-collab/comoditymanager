"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useAdminPending } from "@/components/admin/feedback/AdminPendingProvider";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel?: string;
};

export function AdminSubmitButton({
  children,
  pendingLabel,
  disabled,
  ...props
}: Props) {
  const tCommon = useTranslations("admin.common");
  const { pending: formPending } = useFormStatus();
  const { pending: globalPending } = useAdminPending();
  const pending = formPending || globalPending;

  return (
    <button type="submit" disabled={disabled || pending} aria-busy={pending} {...props}>
      {formPending ? (pendingLabel ?? tCommon("processing")) : children}
    </button>
  );
}
