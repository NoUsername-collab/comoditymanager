"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { SettingsCompletionSummary } from "@/domain/settings/settings-completion";

type Props = {
  summary: SettingsCompletionSummary;
};

export function SettingsSetupProgress({ summary }: Props) {
  const t = useTranslations("admin.pages.settings");
  const { items, percent, completeCount, totalCount } = summary;

  if (items.length === 0) return null;

  const ringRadius = 28;
  const circumference = 2 * Math.PI * ringRadius;
  const dashOffset = circumference - (percent / 100) * circumference;

  return (
    <section
      className="settings-setup-progress"
      aria-labelledby="settings-setup-progress-title"
    >
      <div className="settings-setup-progress__head">
        <div className="settings-setup-progress__ring-wrap" aria-hidden>
          <svg
            className="settings-setup-progress__ring"
            viewBox="0 0 72 72"
            width="72"
            height="72"
          >
            <circle
              className="settings-setup-progress__ring-track"
              cx="36"
              cy="36"
              r={ringRadius}
              fill="none"
              strokeWidth="6"
            />
            <circle
              className="settings-setup-progress__ring-fill"
              cx="36"
              cy="36"
              r={ringRadius}
              fill="none"
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 36 36)"
            />
          </svg>
          <span className="settings-setup-progress__ring-label">{percent}%</span>
        </div>
        <div>
          <h3 id="settings-setup-progress-title" className="settings-setup-progress__title">
            {t("checklistTitle")}
          </h3>
          <p className="settings-setup-progress__subtitle">
            {t("checklistProgressValue", {
              done: completeCount,
              total: totalCount,
            })}
          </p>
        </div>
      </div>

      <ul className="settings-setup-progress__list">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className={[
                "settings-setup-progress__item",
                item.done && "settings-setup-progress__item--done",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span
                className="settings-setup-progress__check"
                aria-hidden={item.done}
              >
                {item.done ? "✓" : "○"}
              </span>
              <span className="settings-setup-progress__label">{t(item.labelKey)}</span>
              {!item.done ? (
                <span className="settings-setup-progress__action">{t("checklistFix")}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
