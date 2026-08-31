"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  changeStaffRoleAction,
  deactivateStaffAction,
} from "@/features/settings/actions/staff";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import type { TenantMember } from "@/services/tenant-members";

const ROLE_COLORS: Record<string, string> = {
  owner:
    "bg-amber-100 text-amber-800 ring-1 ring-amber-300",
  admin:
    "bg-blue-100 text-blue-800 ring-1 ring-blue-200",
  operator:
    "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Proprietar",
  admin: "Admin",
  operator: "Operator",
};

export function StaffMemberRow({ member }: { member: TenantMember }) {
  const t = useTranslations("admin.pages.staffManagement");
  const tCommon = useTranslations("admin.common");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const isOwner = member.role === "owner";

  async function handleChangeRole(newRole: string) {
    setPending(true);
    setError(null);
    setShowRoleMenu(false);
    try {
      const fd = new FormData();
      fd.set("member_id", member.id);
      fd.set("role", newRole);
      const result = await changeStaffRoleAction(fd);
      if (!result.ok) setError(result.error);
    } finally {
      setPending(false);
    }
  }

  async function handleDeactivate() {
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("member_id", member.id);
      const result = await deactivateStaffAction(fd);
      if (!result.ok) setError(result.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="admin-staff-row">
      <div className="admin-staff-row__info">
        <div className="admin-staff-row__email">{member.email}</div>
        <div className="admin-staff-row__meta">
          <span
            className={`admin-staff-row__role-badge inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[member.role] ?? ROLE_COLORS.operator}`}
          >
            {ROLE_LABELS[member.role] ?? member.role}
          </span>
          {!member.accepted_at && (
            <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-700 ring-1 ring-yellow-200">
              {t("pendingInvite")}
            </span>
          )}
        </div>
      </div>

      <div className="admin-staff-row__actions">
        {!isOwner && (
          <>
            {/* Role change dropdown */}
            <div className="relative">
              <AdminButton
                variant="secondary"
                size="sm"
                onClick={() => setShowRoleMenu((v) => !v)}
                disabled={pending}
              >
                {t("changeRole")}
              </AdminButton>

              {showRoleMenu && (
                <div className="admin-staff-row__role-menu absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                  {["admin", "operator"]
                    .filter((r) => r !== member.role)
                    .map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => handleChangeRole(role)}
                        className="admin-staff-row__role-option block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        {ROLE_LABELS[role]}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Deactivate */}
            <AdminButton
              variant="danger"
              size="sm"
              onClick={handleDeactivate}
              disabled={pending}
            >
              {pending ? tCommon("saving") : t("deactivate")}
            </AdminButton>
          </>
        )}
      </div>

      {error && (
        <p className="admin-staff-row__error text-xs text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
