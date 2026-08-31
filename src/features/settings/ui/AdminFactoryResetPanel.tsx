"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { factoryResetAction } from "@/features/settings/actions";
import { useAdminPending, useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";

export function AdminFactoryResetPanel() {
  const tPage = useTranslations("admin.pages.settingsLocation.factoryReset");
  const tCommon = useTranslations("admin.common");
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();

  if (!open) {
    return (
      <div className="admin-factory-reset">
        <p className="admin-factory-reset__warn">
          {tPage.rich("warningHtml", { strong: (chunks) => <strong>{chunks}</strong> })}
        </p>
        <button
          type="button"
          className="admin-factory-reset__trigger"
          onClick={() => setOpen(true)}
        >
          {tPage("trigger")}
        </button>
      </div>
    );
  }

  return (
    <div className="admin-factory-reset admin-factory-reset--open">
      <p className="admin-factory-reset__title">{tPage("confirmTitle")}</p>
      <ul className="admin-factory-reset__list">
        <li>{tPage("bullet1")}</li>
        <li>{tPage("bullet2")}</li>
        <li>{tPage("bullet3")}</li>
        <li>{tPage("bullet4")}</li>
      </ul>

      <label className="admin-factory-reset__ack">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
        />
        <span>{tPage("ack")}</span>
      </label>

      <label className="admin-factory-reset__confirm-label">
        <span>{tPage("typeReset")}</span>
        <input
          type="text"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value.toUpperCase())}
          autoComplete="off"
          spellCheck={false}
          className="admin-factory-reset__confirm-input"
          placeholder="RESET"
        />
      </label>

      {error && <p className="admin-factory-reset__error">{error}</p>}

      <div className="admin-factory-reset__actions">
        <button
          type="button"
          disabled={pending || !ack || confirm !== "RESET"}
          className="admin-factory-reset__submit"
          onClick={() => {
            setError(null);
            void runAdminAction(async () => {
              try {
                await factoryResetAction(confirm);
              } catch (e) {
                setError(e instanceof Error ? e.message : tPage("resetError"));
              }
            });
          }}
        >
          {pending ? tPage("deleting") : tPage("confirmButton")}
        </button>
        <button
          type="button"
          disabled={pending}
          className="admin-factory-reset__cancel"
          onClick={() => {
            setOpen(false);
            setConfirm("");
            setAck(false);
            setError(null);
          }}
        >
          {tCommon("cancel")}
        </button>
      </div>
    </div>
  );
}
