"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useAdminPending } from "@/components/admin/feedback/AdminPendingProvider";
import {
  AdminButton,
  type AdminButtonVariant,
  type AdminButtonSize,
} from "@/components/admin/ui/AdminButton";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  pendingLabel?: string;
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  fullWidth?: boolean;
};

export function AdminSubmitButton({
  children,
  pendingLabel,
  disabled,
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  ...rest
}: Props) {
  const tCommon = useTranslations("admin.common");
  const { pending: formPending } = useFormStatus();
  const { pending: globalPending } = useAdminPending();
  const pending = formPending || globalPending;

  return (
    <AdminButton
      type="submit"
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled || pending}
      aria-busy={pending}
      className={className}
      {...rest}
    >
      {formPending ? (pendingLabel ?? tCommon("processing")) : children}
    </AdminButton>
  );
}
