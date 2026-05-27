"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  readAdminFxPrefs,
  writeAdminFxPrefs,
} from "@/lib/admin-fx-storage";
import { playConfirmSound } from "@/components/admin/feedback/admin-fx-effects";

export function AdminFxSettings() {
  const [soundEnabled, setSoundEnabled] = useState(false);
  const t = useTranslations("admin.settings.fx");

  useEffect(() => {
    setSoundEnabled(readAdminFxPrefs().soundEnabled);
  }, []);

  return (
    <div className="admin-fx-settings">
      <label className="admin-fx-settings__row">
        <input
          type="checkbox"
          checked={soundEnabled}
          onChange={(e) => {
            const next = e.target.checked;
            setSoundEnabled(next);
            writeAdminFxPrefs({ soundEnabled: next });
            if (next) playConfirmSound();
          }}
        />
        <span>
          <strong>{t("confirmSoundTitle")}</strong>
          <span className="admin-fx-settings__hint">
            {t("confirmSoundHint")}
          </span>
        </span>
      </label>
    </div>
  );
}
