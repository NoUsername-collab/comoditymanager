import { forwardRef } from "react";
import type { ReactNode, AnchorHTMLAttributes } from "react";
import { Link } from "@/i18n/navigation";
import type { AdminButtonVariant, AdminButtonSize } from "./AdminButton";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  variant?: AdminButtonVariant;
  size?: AdminButtonSize;
  iconOnly?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
};

export const AdminLinkButton = forwardRef<HTMLAnchorElement, Props>(
  function AdminLinkButton(
    {
      href,
      variant = "secondary",
      size = "md",
      iconOnly,
      fullWidth,
      className,
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

    return <Link ref={ref} href={href} className={cls} {...props} />;
  },
);
