import { createClient } from "@/lib/supabase/client";
import { clearUnverifiedTotpFactors } from "@/lib/auth/mfa-enroll";

const TOTP_FRIENDLY_NAME = "Zalmox Admin";

export type TotpEnrollmentStatus =
  | { ok: true; enrolled: boolean }
  | { ok: false };

export type TotpEnrollStart =
  | { ok: true; factorId: string; secret: string; uri: string }
  | { ok: false; message?: string };

export type TotpVerifyFailure = "verify_failed" | "invalid_code";

export type TotpChallengeFailure = TotpVerifyFailure | "no_factor";

function browserAuth() {
  return createClient().auth;
}

export async function getTotpEnrollmentStatus(): Promise<TotpEnrollmentStatus> {
  try {
    const { data: factors, error } = await browserAuth().mfa.listFactors();
    if (error) return { ok: false };
    return {
      ok: true,
      enrolled: (factors.totp ?? []).some((factor) => factor.status === "verified"),
    };
  } catch {
    return { ok: false };
  }
}

export async function startTotpEnrollment(): Promise<TotpEnrollStart> {
  const supabase = createClient();
  await clearUnverifiedTotpFactors(supabase);

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: TOTP_FRIENDLY_NAME,
  });

  if (error || !data?.totp) {
    return { ok: false, message: error?.message };
  }

  return {
    ok: true,
    factorId: data.id,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

async function challengeAndVerify(
  factorId: string,
  code: string
): Promise<{ ok: true } | { ok: false; reason: TotpVerifyFailure }> {
  const mfa = browserAuth().mfa;
  const { data: challenge, error: challengeError } = await mfa.challenge({
    factorId,
  });

  if (challengeError || !challenge) {
    return { ok: false, reason: "verify_failed" };
  }

  const { error: verifyError } = await mfa.verify({
    factorId,
    challengeId: challenge.id,
    code: code.trim(),
  });

  if (verifyError) {
    return { ok: false, reason: "invalid_code" };
  }

  return { ok: true };
}

export async function confirmTotpEnrollment(opts: {
  factorId: string;
  code: string;
}): Promise<{ ok: true } | { ok: false; reason: TotpVerifyFailure }> {
  return challengeAndVerify(opts.factorId, opts.code);
}

export async function unenrollAllTotpFactors(): Promise<
  { ok: true } | { ok: false }
> {
  try {
    const mfa = browserAuth().mfa;
    const { data: factors } = await mfa.listFactors();
    for (const factor of factors?.totp ?? []) {
      await mfa.unenroll({ factorId: factor.id });
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function verifyTotpChallenge(
  code: string
): Promise<{ ok: true } | { ok: false; reason: TotpChallengeFailure }> {
  const mfa = browserAuth().mfa;
  const { data: factors, error: listError } = await mfa.listFactors();

  if (listError) {
    return { ok: false, reason: "verify_failed" };
  }

  const totpFactor = (factors.totp ?? []).find(
    (factor) => factor.status === "verified"
  );
  if (!totpFactor) {
    return { ok: false, reason: "no_factor" };
  }

  return challengeAndVerify(totpFactor.id, code);
}

export async function refreshBrowserAuthSession(): Promise<void> {
  await browserAuth().refreshSession();
}
