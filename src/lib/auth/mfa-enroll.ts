import type { SupabaseClient } from "@supabase/supabase-js";

export async function clearUnverifiedTotpFactors(
  supabase: SupabaseClient
): Promise<void> {
  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.totp ?? []) {
    if (factor.status !== "verified") {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }
}

type EnrollErrorTranslator = (
  key:
    | "enrollFailed"
    | "enrollFailedMfaDisabled"
    | "enrollFailedRetry"
    | "enrollFailedDetail",
  values?: { detail?: string }
) => string;

export function mapMfaEnrollError(
  message: string | undefined,
  t: EnrollErrorTranslator
): string {
  if (!message) return t("enrollFailed");

  const lower = message.toLowerCase();

  if (
    lower.includes("mfa") &&
    (lower.includes("disabled") ||
      lower.includes("not enabled") ||
      lower.includes("not allowed"))
  ) {
    return t("enrollFailedMfaDisabled");
  }

  if (
    lower.includes("already") ||
    lower.includes("maximum") ||
    lower.includes("duplicate") ||
    lower.includes("unverified")
  ) {
    return t("enrollFailedRetry");
  }

  return t("enrollFailedDetail", { detail: message });
}
