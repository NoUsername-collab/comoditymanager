"use client";

export function AdminMetricHint({
  text,
  label = "Explicație",
}: {
  text: string;
  label?: string;
}) {
  return (
    <span className="admin-metric-hint">
      <button
        type="button"
        className="admin-metric-hint__trigger"
        aria-label={label}
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
