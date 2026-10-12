import type { ReactNode } from "react";

/** One setting: label and optional explanation on the left, its control on the right. */
export function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="checkin-setting-row">
      <div className="checkin-setting-row__left">
        <span className="checkin-setting-row__label">{label}</span>
        {description ? <span className="checkin-setting-row__desc">{description}</span> : null}
      </div>
      <div className="checkin-setting-row__right">{children}</div>
    </div>
  );
}
