"use client";

import { AdminFloatingPanel } from "./AdminFloatingPanel";

export function AdminAlertDialog({
  open,
  message,
  title = "Atenție",
  onClose,
}: {
  open: boolean;
  message: string;
  title?: string;
  onClose: () => void;
}) {
  return (
    <AdminFloatingPanel
      open={open}
      onClose={onClose}
      title={title}
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
          OK
        </button>
      </div>
    </AdminFloatingPanel>
  );
}
