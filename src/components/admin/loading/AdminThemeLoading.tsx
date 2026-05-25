type Props = {
  label?: string;
  fullScreen?: boolean;
};

export function AdminThemeLoading({
  label = "Se încarcă…",
  fullScreen = false,
}: Props) {
  return (
    <div
      className={[
        "admin-theme-loading",
        fullScreen && "admin-theme-loading--screen",
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
    >
      <div className="admin-theme-loading__card">
        <span className="admin-theme-loading__spinner" aria-hidden />
        <span className="admin-theme-loading__text">{label}</span>
        <span className="admin-theme-loading__track" aria-hidden>
          <span className="admin-theme-loading__track-bar" />
        </span>
      </div>
    </div>
  );
}
