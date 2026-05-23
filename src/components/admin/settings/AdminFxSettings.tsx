"use client";

import { useEffect, useState } from "react";
import {
  readAdminFxPrefs,
  writeAdminFxPrefs,
} from "@/lib/admin-fx-storage";
import { playConfirmSound } from "@/components/admin/feedback/admin-fx-effects";

export function AdminFxSettings() {
  const [soundEnabled, setSoundEnabled] = useState(false);

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
          <strong>Sunet la confirmare</strong>
          <span className="admin-fx-settings__hint">
            Stil scurt „system ding” — dezactivat implicit. Poți testa bifând
            caseta.
          </span>
        </span>
      </label>
    </div>
  );
}
