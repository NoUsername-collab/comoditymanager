"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSettingsSaveFeedback } from "@/hooks/useSettingsSaveFeedback";
import { updateStatisticsVisibilityAction } from "@/app/[locale]/admin/(panel)/settings/actions";
import type { StatisticsVisibility } from "@/domain/settings/statistics-visibility";

type Props = {
  visibility: StatisticsVisibility;
};

export function StatisticsSettingsPanel({ visibility: initialVisibility }: Props) {
  const t = useTranslations("admin.pages.settings.statistics");
  const { notifySuccess, notifyError } = useSettingsSaveFeedback();
  const [visibility, setVisibility] = useState(initialVisibility);
  const [pending, startTransition] = useTransition();

  function save(next: StatisticsVisibility) {
    if (next === visibility) return;

    setVisibility(next);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("statistics_visibility", next);
      const res = await updateStatisticsVisibilityAction(fd);
      if (res.ok) {
        notifySuccess(t("saved"));
      } else {
        notifyError(res.error ?? t("saveError"));
        setVisibility(initialVisibility);
      }
    });
  }

  return (
    <div className={`statistics-settings${pending ? " statistics-settings--pending" : ""}`}>
      <div className="statistics-settings__visibility">
        <label className="statistics-settings__label" htmlFor="statistics-visibility">
          {t("visibilityLabel")}
        </label>
        <p className="statistics-settings__hint">{t("visibilityHint")}</p>
        <select
          id="statistics-visibility"
          className="statistics-settings__select"
          value={visibility}
          disabled={pending}
          onChange={(e) => save(e.target.value as StatisticsVisibility)}
        >
          <option value="owner">{t("visibilityOwner")}</option>
          <option value="admin">{t("visibilityAdmin")}</option>
          <option value="all">{t("visibilityAll")}</option>
        </select>
        <p className="statistics-settings__hint statistics-settings__hint--reports">
          {t("reportsEntryHint")}
        </p>
      </div>
    </div>
  );
}
