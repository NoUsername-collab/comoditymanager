type Props = {
  children: React.ReactNode;
  id?: string;
  className?: string;
};

/** Secondary help line under a settings field label. */
export function SettingsFieldHint({ children, id, className = "" }: Props) {
  return (
    <span
      id={id}
      className={["admin-settings-hint admin-settings-field-hint", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
