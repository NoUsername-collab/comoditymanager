"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { updateGuestProfileControlsAction } from "@/app/[locale]/admin/(panel)/guests/actions";
import type { GuestProfileRow } from "@/domain/guest/types";
import { useAdminPending, useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";
import { AdminFloatingPanel } from "@/components/admin/overlay/AdminFloatingPanel";
import { AdminAlertDialog } from "@/components/admin/overlay/AdminAlertDialog";

export function GuestBlacklistPanel({
  guestId,
  profile,
  compact = false,
}: {
  guestId: string;
  profile: GuestProfileRow | null;
  compact?: boolean;
}) {
  const tGuests = useTranslations("admin.guests");
  const tCommon = useTranslations("admin.common");
  const initiallyBlacklisted = profile?.flag_level === "blacklist";
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(profile?.blacklist_reason ?? "");
  const [error, setError] = useState<string | null>(null);
  const runAdminAction = useRunAdminAction();
  const { pending } = useAdminPending();
  const isBlacklisted = initiallyBlacklisted;
  const dangerButtonStyle = {
    border: "1px solid var(--admin-danger-border)",
    background: "var(--admin-danger-bg)",
    color: "var(--admin-danger-text)",
  } as const;
  const neutralButtonStyle = {
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    color: "var(--admin-text)",
  } as const;

  async function submitBlacklist(flagLevel: "blacklist" | "normal") {
    const formData = new FormData();
    formData.set("guest_id", guestId);
    formData.set("flag_level", flagLevel);
    formData.set("blacklist_reason", reason);
    formData.set("manual_note", profile?.manual_note ?? "");

    try {
      await runAdminAction(() => updateGuestProfileControlsAction(formData));
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : tGuests("blacklist.couldNotUpdate"));
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className={[
          "guest-blacklist-panel__trigger rounded px-4 py-2 text-sm font-bold transition disabled:opacity-60",
          compact && "text-[13px]",
        ]
          .filter(Boolean)
          .join(" ")}
        style={dangerButtonStyle}
      >
        {isBlacklisted ? tGuests("blacklist.manage") : tGuests("blacklist.add")}
      </button>

      <AdminFloatingPanel
        open={open}
        onClose={() => setOpen(false)}
        title={isBlacklisted ? tGuests("blacklist.activeTitle") : tGuests("blacklist.confirmTitle")}
        variant="modal"
        width={560}
        className="guest-blacklist-modal"
      >
        <div className="space-y-4 p-4">
          <p className="text-sm text-zinc-300">
            {isBlacklisted
              ? tGuests("blacklist.updateOrRemoveHint")
              : tGuests("blacklist.confirmAddHint")}
          </p>

          <label className="block space-y-1 text-sm">
            <span className="font-semibold" style={{ color: "var(--admin-danger-text)" }}>
              {tGuests("blacklist.reason")}
            </span>
            <textarea
              rows={compact ? 3 : 4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={tGuests("blacklist.placeholder")}
              className="w-full rounded px-3 py-2 text-sm"
              style={{
                border: "1px solid var(--admin-danger-border)",
                background: "var(--admin-danger-bg)",
                color: "var(--admin-danger-text)",
              }}
              required
            />
          </label>

          <div className="guest-blacklist-modal__actions flex flex-wrap justify-end gap-2">
            {isBlacklisted && (
              <button
                type="button"
                onClick={() => void submitBlacklist("normal")}
                disabled={pending}
                className="guest-blacklist-modal__btn guest-blacklist-modal__btn--neutral rounded px-4 py-2 text-sm font-medium transition disabled:opacity-60"
                style={neutralButtonStyle}
              >
                {pending ? tGuests("blacklist.processing") : tGuests("blacklist.remove")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="guest-blacklist-modal__btn guest-blacklist-modal__btn--neutral rounded px-4 py-2 text-sm font-medium transition"
              style={neutralButtonStyle}
            >
              {tCommon("cancel")}
            </button>
            <button
              type="button"
              onClick={() => void submitBlacklist("blacklist")}
              disabled={pending || !reason.trim()}
              className="guest-blacklist-modal__btn guest-blacklist-modal__btn--danger rounded px-4 py-2 text-sm font-bold transition disabled:opacity-60"
              style={dangerButtonStyle}
            >
              {pending
                ? isBlacklisted
                  ? tGuests("blacklist.updating")
                  : tGuests("blacklist.putting")
                : isBlacklisted
                  ? tGuests("blacklist.confirm")
                  : tGuests("blacklist.confirmAndAdd")}
            </button>
          </div>
        </div>
      </AdminFloatingPanel>

      <AdminAlertDialog
        open={error != null}
        title={tGuests("blacklist.title")}
        message={error ?? ""}
        onClose={() => setError(null)}
      />
    </>
  );
}
