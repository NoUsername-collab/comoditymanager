import { forwardRef } from "react";
import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from "react";

export type AdminFieldSize = "sm" | "md" | "lg";

/* ── AdminInput ── */

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  fieldSize?: AdminFieldSize;
  error?: boolean;
};

export const AdminInput = forwardRef<HTMLInputElement, InputProps>(
  function AdminInput({ fieldSize = "md", error, className, ...props }, ref) {
    const cls = [
      "admin-field__input",
      `admin-field__input--${fieldSize}`,
      error && "admin-field__input--error",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return <input ref={ref} className={cls} {...props} />;
  },
);

/* ── AdminSelect ── */

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  fieldSize?: AdminFieldSize;
  error?: boolean;
  children: ReactNode;
};

export const AdminSelect = forwardRef<HTMLSelectElement, SelectProps>(
  function AdminSelect(
    { fieldSize = "md", error, className, ...props },
    ref,
  ) {
    const cls = [
      "admin-field__select",
      `admin-field__select--${fieldSize}`,
      error && "admin-field__select--error",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return <select ref={ref} className={cls} {...props} />;
  },
);

/* ── AdminTextarea ── */

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  fieldSize?: AdminFieldSize;
  error?: boolean;
};

export const AdminTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function AdminTextarea(
    { fieldSize = "md", error, className, ...props },
    ref,
  ) {
    const cls = [
      "admin-field__textarea",
      `admin-field__textarea--${fieldSize}`,
      error && "admin-field__textarea--error",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return <textarea ref={ref} className={cls} {...props} />;
  },
);
