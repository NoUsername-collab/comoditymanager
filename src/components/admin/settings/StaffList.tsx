"use client";

import { useTranslations } from "next-intl";
import { StaffMemberRow } from "./StaffMemberRow";
import type { TenantMember } from "@/services/tenant-members";

export function StaffList({ members }: { members: TenantMember[] }) {
  const t = useTranslations("admin.pages.staffManagement");

  if (members.length === 0) {
    return (
      <p className="text-sm text-zinc-500 py-4">{t("noMembers")}</p>
    );
  }

  // Sort: owner first, then admin, then operator
  const roleOrder: Record<string, number> = {
    owner: 0,
    admin: 1,
    operator: 2,
  };
  const sorted = [...members].sort(
    (a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9)
  );

  return (
    <div className="admin-staff-list">
      {sorted.map((member) => (
        <StaffMemberRow key={member.id} member={member} />
      ))}
    </div>
  );
}
