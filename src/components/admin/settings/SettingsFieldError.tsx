type Props = {
  children: React.ReactNode;
  id?: string;
  className?: string;
};

/** Inline validation message under a settings field — shown only when the field failed. */
export function SettingsFieldError({ children, id, className = "" }: Props) {
  return (
    <span
      id={id}
      role="alert"
      className={["admin-settings-field-error admin-text--danger", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
