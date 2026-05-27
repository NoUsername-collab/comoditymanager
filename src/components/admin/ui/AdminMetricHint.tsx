"use client";

import { useTranslations } from "next-intl";

export function AdminMetricHint({
  text,
  label,
}: {
  text: string;
  label?: string;
}) {
  const tCommon = useTranslations("admin.common");
  return (
    <span className="admin-metric-hint">
      <button
        type="button"
        className="admin-metric-hint__trigger"
        aria-label={label ?? tCommon("explanation")}
        title={text}
      >
        ?
      </button>
      <span className="admin-metric-hint__tip" role="tooltip">
        {text}
      </span>
    </span>
  );
}
