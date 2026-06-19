import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import {
  hasVerifiedTotpFactor,
  isMfaRecommendedForUser,
} from "@/lib/auth/mfa-policy";
import { createClient } from "@/lib/supabase/server";
import type { TenantMemberRole } from "@/services/tenant-members";

type Props = {
  email?: string | null;
  memberRole?: TenantMemberRole | null;
};

export async function MfaSecurityReminder({ email, memberRole }: Props) {
  if (!isMfaRecommendedForUser({ email, memberRole })) {
    return null;
  }

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();

  if (hasVerifiedTotpFactor(factors)) {
    return null;
  }

  const t = await getTranslations("admin.mfa");

  return (
    <div
      className="admin-mfa-reminder border-b border-red-300 bg-red-50 px-4 py-2.5 text-center text-sm text-red-950"
      role="status"
    >
      <span className="font-semibold">{t("securityReminder")}</span>{" "}
      <Link
        href="/admin/settings/security"
        className="font-bold text-red-800 underline decoration-red-400 underline-offset-2 hover:text-red-950"
      >
        {t("securityReminderCta")}
      </Link>
    </div>
  );
}
