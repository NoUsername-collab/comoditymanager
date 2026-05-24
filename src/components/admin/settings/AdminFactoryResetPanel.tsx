"use client";

import { useState, useTransition } from "react";
import { factoryResetAction } from "@/app/admin/(panel)/settings/actions";

export function AdminFactoryResetPanel() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [ack, setAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <div className="admin-factory-reset">
        <p className="admin-factory-reset__warn">
          Șterge <strong>permanent</strong> clădiri, camere, rezervări, clienți,
          hold-uri, blocări și istoricul activității. Conturile de login admin rămân.
        </p>
        <button
          type="button"
          className="admin-factory-reset__trigger"
          onClick={() => setOpen(true)}
        >
          Reset complet date pensiune…
        </button>
      </div>
    );
  }

  return (
    <div className="admin-factory-reset admin-factory-reset--open">
      <p className="admin-factory-reset__title">Confirmare reset factory</p>
      <ul className="admin-factory-reset__list">
        <li>Se șterg toate clădirile și camerele</li>
        <li>Se șterg toate rezervările și clienții</li>
        <li>Se șterg hold-urile, blocările și jurnalul activității</li>
        <li>Setările pensiunii revin la valorile implicite</li>
      </ul>

      <label className="admin-factory-reset__ack">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
        />
        <span>Înțeleg că acțiunea este ireversibilă</span>
      </label>

      <label className="admin-factory-reset__confirm-label">
        <span>Tastează RESET pentru confirmare</span>
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
            startTransition(async () => {
              try {
                await factoryResetAction(confirm);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Eroare la reset");
              }
            });
          }}
        >
          {pending ? "Se șterge…" : "Da, reset complet"}
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
          Anulează
        </button>
      </div>
    </div>
  );
}
