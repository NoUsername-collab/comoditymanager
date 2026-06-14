import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type AdminButtonVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "ghost"
  | "soft";

export type AdminButtonSize = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  iconOnly?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
};

export const AdminButton = forwardRef<HTMLButtonElement, Props>(
  function AdminButton(
    {
      variant = "secondary",
      size = "md",
      iconOnly,
      fullWidth,
      className,
      type = "button",
      ...props
    },
    ref,
  ) {
    const cls = [
      "admin-btn",
      `admin-btn--${variant}`,
      `admin-btn--${size}`,
      iconOnly && "admin-btn--icon-only",
      fullWidth && "admin-btn--full",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return <button ref={ref} type={type} className={cls} {...props} />;
  },
);
