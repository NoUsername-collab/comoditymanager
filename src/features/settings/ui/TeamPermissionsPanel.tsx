"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSettingsSaveFeedback } from "@/hooks/useSettingsSaveFeedback";
import { SettingsSaveBar } from "@/components/admin/settings/SettingsSaveBar";
import { updateTeamPermissionsAction } from "@/features/settings/actions";
import {
  PERMISSION_GROUP_IDS,
  type PermissionGroupId,
  type TeamPermissions,
} from "@/domain/settings/team-permissions";

type Props = {
  permissions: TeamPermissions;
};

function PermissionToggle({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="team-permissions__toggle" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function TeamPermissionsPanel({ permissions: initial }: Props) {
  const t = useTranslations("admin.pages.settings.teamPermissions");
  const { notifySuccess, notifyError } = useSettingsSaveFeedback();
  const [permissions, setPermissions] = useState(initial);
  const [pending, startTransition] = useTransition();

  function setRolePermission(
    role: "admin" | "operator",
    group: PermissionGroupId,
    value: boolean,
  ) {
    setPermissions((prev) => ({
      ...prev,
      [role]: { ...prev[role], [group]: value },
    }));
  }

  function save() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("team_permissions", JSON.stringify(permissions));
      const res = await updateTeamPermissionsAction(fd);
      if (res.ok) {
        notifySuccess(t("saved"));
      } else {
        notifyError(res.error ?? t("saveError"));
        setPermissions(initial);
      }
    });
  }

  return (
    <div
      className={`team-permissions admin-settings-fields${pending ? " team-permissions--pending" : ""}`}
    >
      <p className="team-permissions__intro">{t("intro")}</p>

      <div className="team-permissions__grid">
        {PERMISSION_GROUP_IDS.map((group) => (
          <article key={group} className="team-permissions__card">
            <h3 className="team-permissions__card-title">{t(`groups.${group}.title`)}</h3>
            <p className="team-permissions__card-desc">{t(`groups.${group}.desc`)}</p>
            <div className="team-permissions__card-toggles">
              <PermissionToggle
                id={`perm-admin-${group}`}
                label={t("roleAdmin")}
                checked={permissions.admin[group]}
                disabled={pending}
                onChange={(value) => setRolePermission("admin", group, value)}
              />
              <PermissionToggle
                id={`perm-operator-${group}`}
                label={t("roleOperator")}
                checked={permissions.operator[group]}
                disabled={pending}
                onChange={(value) => setRolePermission("operator", group, value)}
              />
              <p className="team-permissions__owner-note">
                <span className="team-permissions__owner-label">{t("roleOwner")}</span>
                {t("ownerFullAccess")}
              </p>
            </div>
          </article>
        ))}
      </div>

      <SettingsSaveBar status={pending ? "saving" : "idle"}>
        <button
          type="button"
          className="admin-btn admin-btn--primary admin-btn--lg"
          disabled={pending}
          onClick={save}
        >
          {pending ? t("saving") : t("save")}
        </button>
      </SettingsSaveBar>
    </div>
  );
}
