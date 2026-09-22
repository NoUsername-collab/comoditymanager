"use client";

import type { useTranslations } from "next-intl";
import type { ValidationResult } from "@/domain/checkin/types";

export function StepValidation({
  validation,
  t,
}: {
  validation: ValidationResult | null;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!validation) {
    return (
      <p className="checkin-validation checkin-validation__pending">
        {t("validation.pending")}
      </p>
    );
  }

  const statusClass =
    validation.status === "ok"
      ? "checkin-validation--ok"
      : validation.status === "warning"
        ? "checkin-validation--warning"
        : "checkin-validation--blocked";

  return (
    <div className={`checkin-validation ${statusClass}`}>
      <div className="checkin-validation__status">
        {validation.status === "ok" && "✓"}
        {validation.status === "warning" && "⚠"}
        {validation.status === "blocked" && "✕"}
        <span>{t(`validation.${validation.status}`)}</span>
      </div>

      {validation.blockers.length > 0 && (
        <ul className="checkin-validation__list checkin-validation__list--blockers">
          {validation.blockers.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}

      {validation.flags.length > 0 && (
        <ul className="checkin-validation__list checkin-validation__list--flags">
          {validation.flags.map((f, i) => (
            <li key={i}>{t(`flag.${f}`)}</li>
          ))}
        </ul>
      )}

      {validation.status === "warning" && (
        <p className="checkin-validation__note">
          {t("validation.warningNote")}
        </p>
      )}
    </div>
  );
}
