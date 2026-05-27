"use client";

import { useState } from "react";
import { updateGuestProfileControlsAction } from "@/app/admin/(panel)/guests/actions";
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
  const initiallyBlacklisted = profile?.flag_level === "blacklist";
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(profile?.blacklist_reason ?? "");
  const [error, setError] = useState<string | null>(null);
  const runAdminAction = useRunAdminAction();
  const { pending } = useAdminPending();
  const isBlacklisted = initiallyBlacklisted;
  const dangerButtonStyle = {
    border: "1px solid #7f1d1d",
    background: "#050505",
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
    formData.set(
      "manual_trust_adjustment",
      String(profile?.manual_trust_adjustment ?? 0)
    );
    formData.set(
      "manual_loyalty_adjustment",
      String(profile?.manual_loyalty_adjustment ?? 0)
    );
    formData.set("manual_note", profile?.manual_note ?? "");
    for (const trait of profile?.manual_positive_traits ?? []) {
      formData.append("manual_positive_traits", trait);
    }
    for (const trait of profile?.manual_negative_traits ?? []) {
      formData.append("manual_negative_traits", trait);
    }

    try {
      await runAdminAction(() => updateGuestProfileControlsAction(formData));
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nu am putut actualiza blacklist-ul.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={pending}
        className={[
          "rounded px-4 py-2 text-sm font-bold transition disabled:opacity-60",
          compact && "text-[13px]",
        ]
          .filter(Boolean)
          .join(" ")}
        style={dangerButtonStyle}
      >
        {isBlacklisted ? "Gestionează blacklist" : "Adaugă în blacklist"}
      </button>

      <AdminFloatingPanel
        open={open}
        onClose={() => setOpen(false)}
        title={isBlacklisted ? "Blacklist activ" : "Confirmare blacklist"}
        variant="modal"
        width={560}
        className="guest-blacklist-modal"
      >
        <div className="space-y-4 p-4">
          <p className="text-sm text-zinc-300">
            {isBlacklisted
              ? "Actualizezi sau scoți clientul din blacklist. Motivul rămâne vizibil pentru staff."
              : "Confirmi introducerea clientului în blacklist. După salvare va ridica alertă puternică la rezervări noi."}
          </p>

          <label className="block space-y-1 text-sm">
            <span className="font-semibold" style={{ color: "var(--admin-danger-text)" }}>
              Motiv
            </span>
            <textarea
              rows={compact ? 3 : 4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: neplată, pagube, conflict repetat, încălcarea regulilor"
              className="w-full rounded px-3 py-2 text-sm"
              style={{
                border: "1px solid #7f1d1d",
                background: "#0f0f10",
                color: "#fca5a5",
              }}
              required
            />
          </label>

          <div className="flex flex-wrap justify-end gap-2">
            {isBlacklisted && (
              <button
                type="button"
                onClick={() => void submitBlacklist("normal")}
                disabled={pending}
                className="rounded px-4 py-2 text-sm font-medium transition disabled:opacity-60"
                style={neutralButtonStyle}
              >
                {pending ? "Procesez…" : "Scoate din blacklist"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded px-4 py-2 text-sm font-medium transition"
              style={neutralButtonStyle}
            >
              Anulează
            </button>
            <button
              type="button"
              onClick={() => void submitBlacklist("blacklist")}
              disabled={pending || !reason.trim()}
              className="rounded px-4 py-2 text-sm font-bold transition disabled:opacity-60"
              style={dangerButtonStyle}
            >
              {pending
                ? isBlacklisted
                  ? "Actualizez…"
                  : "Pun în blacklist…"
                : isBlacklisted
                  ? "Confirmă blacklist"
                  : "Confirmă și adaugă"}
            </button>
          </div>
        </div>
      </AdminFloatingPanel>

      <AdminAlertDialog
        open={error != null}
        title="Blacklist"
        message={error ?? ""}
        onClose={() => setError(null)}
      />
    </>
  );
}
