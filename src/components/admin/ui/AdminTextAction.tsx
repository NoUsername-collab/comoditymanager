"use client";

import { Link } from "@/i18n/navigation";
import type { ComponentPropsWithoutRef } from "react";

export type AdminTextActionVariant =
  | "neutral"
  | "warning"
  | "danger"
  | "primary"
  | "accent";

const VARIANT_CLASS: Record<AdminTextActionVariant, string> = {
  neutral: "admin-text-action--neutral",
  warning: "admin-text-action--warning",
  danger: "admin-text-action--danger",
  primary: "admin-text-action--primary",
  accent: "admin-text-action--accent",
};

function actionClass(variant: AdminTextActionVariant, className?: string) {
  return ["admin-text-action", VARIANT_CLASS[variant], className]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: AdminTextActionVariant;
};

type LinkProps = ComponentPropsWithoutRef<typeof Link> & {
  variant?: AdminTextActionVariant;
};

export function AdminTextActionButton({
  variant = "neutral",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={actionClass(variant, className)}
      {...props}
    />
  );
}

export function AdminTextActionLink({
  variant = "neutral",
  className,
  ...props
}: LinkProps) {
  return <Link className={actionClass(variant, className)} {...props} />;
}
