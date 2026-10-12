"use client";

import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { SettingsSaveBar } from "@/components/admin/settings/SettingsSaveBar";
import type { SettingsDraft } from "@/hooks/useSettingsDraft";

/** Bottom bar for a page's typed fields: state in words, Save and Discard. */
export function SettingsDraftSaveBar<T extends Record<string, unknown>>({
  draft,
  errorFallback,
}: {
  draft: SettingsDraft<T>;
  /** Shown when a save fails without its own message. */
  errorFallback: string;
}) {
  const t = useTranslations("admin.pages.settings");
  const status = draft.saving
    ? "saving"
    : draft.error !== null
      ? "error"
      : draft.saved && !draft.dirty
        ? "success"
        : "idle";
  const message = draft.saving
    ? t("saveBarSaving")
    : draft.error !== null
      ? draft.error || errorFallback
      : draft.dirty
        ? t("unsavedChanges")
        : t("allSaved");

  return (
    <SettingsSaveBar status={status} statusMessage={message}>
      <div className="flex flex-wrap gap-2">
        {draft.dirty && !draft.saving ? (
          <AdminButton type="button" variant="ghost" size="lg" onClick={draft.discard}>
            {t("saveBarDiscard")}
          </AdminButton>
        ) : null}
        <AdminButton
          type="button"
          variant="primary"
          size="lg"
          disabled={!draft.dirty || draft.saving}
          onClick={() => void draft.save()}
        >
          {draft.saving ? t("saveBarSaving") : t("saveBarSave")}
        </AdminButton>
      </div>
    </SettingsSaveBar>
  );
}
