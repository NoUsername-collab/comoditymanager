"use client";

import { AdminFloatingPanel } from "./AdminFloatingPanel";
import { useTranslations } from "next-intl";

export function AdminAlertDialog({
  open,
  message,
  title,
  onClose,
}: {
  open: boolean;
  message: string;
  title?: string;
  onClose: () => void;
}) {
  const tCommon = useTranslations("admin.common");
  return (
    <AdminFloatingPanel
      open={open}
      onClose={onClose}
      title={title ?? tCommon("attention")}
      variant="modal"
      width={380}
    >
      <p className="admin-alert-dialog__message">{message}</p>
      <div className="admin-alert-dialog__actions">
        <button
          type="button"
          className="admin-floating-panel__btn admin-floating-panel__btn--primary"
          onClick={onClose}
        >
          {tCommon("ok")}
        </button>
      </div>
    </AdminFloatingPanel>
  );
}
