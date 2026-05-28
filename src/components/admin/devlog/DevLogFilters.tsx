"use client";

import { Link } from "@/i18n/navigation";

const LEVELS = [
  { id: "error", label: "Errors", color: "#991b1b" },
  { id: "warn", label: "Warnings", color: "#92400e" },
  { id: "info", label: "Info", color: "#1e40af" },
  { id: "debug", label: "Debug", color: "#6b7280" },
] as const;

const SOURCES = [
  { id: "server", label: "Server" },
  { id: "action", label: "Actions" },
  { id: "api", label: "API" },
  { id: "performance", label: "Slow Queries" },
] as const;

export function DevLogFilters({
  activeLevel,
  activeSource,
}: {
  activeLevel?: string;
  activeSource?: string;
}) {
  function buildHref(params: { level?: string; source?: string }) {
    const sp = new URLSearchParams();
    if (params.level) sp.set("level", params.level);
    if (params.source) sp.set("source", params.source);
    const q = sp.toString();
    return q ? `/admin/devlog?${q}` : "/admin/devlog";
  }

  return (
    <div className="devlog-filters">
      <div className="devlog-filters__group">
        <span className="devlog-filters__label">Level</span>
        <Link
          href="/admin/devlog"
          className={`devlog-filters__pill ${!activeLevel ? "devlog-filters__pill--active" : ""}`}
        >
          All
        </Link>
        {LEVELS.map((l) => (
          <Link
            key={l.id}
            href={buildHref({ level: l.id, source: activeSource })}
            className={`devlog-filters__pill ${activeLevel === l.id ? "devlog-filters__pill--active" : ""}`}
            style={activeLevel === l.id ? { borderColor: l.color, color: l.color } : {}}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div className="devlog-filters__group">
        <span className="devlog-filters__label">Source</span>
        <Link
          href={buildHref({ level: activeLevel })}
          className={`devlog-filters__pill ${!activeSource ? "devlog-filters__pill--active" : ""}`}
        >
          All
        </Link>
        {SOURCES.map((s) => (
          <Link
            key={s.id}
            href={buildHref({ level: activeLevel, source: s.id })}
            className={`devlog-filters__pill ${activeSource === s.id ? "devlog-filters__pill--active" : ""}`}
          >
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
