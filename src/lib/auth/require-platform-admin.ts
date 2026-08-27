/**
 * Platform admin guard — gates Zalmox internal panel.
 *
 * Checks the authenticated user's email against ZALMOX_ADMIN_EMAILS env var
 * (legacy NESTIO_ADMIN_EMAILS and HOSPIRA_ADMIN_EMAILS still accepted
 * during transition — earlier rebrands read these directly).
 * Requires both valid Supabase auth AND email match.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveMfaRedirectPath } from "@/lib/auth/mfa-redirect";
import { readPlatformAdminEmailsRaw } from "@/lib/env/platform-admin-emails";
import { PLATFORM_CONTACT_EMAIL } from "@/lib/platform/branding";
import { isProductionRuntime } from "@/lib/security/production-runtime";

/** Dev fallback when ZALMOX_ADMIN_EMAILS is unset (never used in production). */
const FALLBACK_EMAILS = `admin@zalmox.app,${PLATFORM_CONTACT_EMAIL}`;

function getPlatformAdminEmails(): string[] {
  const raw = readPlatformAdminEmailsRaw();

  if (!raw) {
    if (isProductionRuntime()) return [];
    return FALLBACK_EMAILS.split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }

  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(email: string): boolean {
  return getPlatformAdminEmails().includes(email.toLowerCase());
}

/**
 * Edge-safe check (no Supabase call, just env var).
 * Used in proxy.ts for fast path gating.
 */
export function isPlatformAdminEmailEdge(email: string | undefined): boolean {
  if (!email) return false;
  return getPlatformAdminEmails().includes(email.toLowerCase());
}

export interface PlatformAdminSession {
  userId: string;
  email: string;
}

async function readAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Non-throwing guard for server actions — returns null when unauthorized.
 */
export async function getPlatformAdminOrNull(): Promise<PlatformAdminSession | null> {
  const user = await readAuthUser();
  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    return null;
  }
  return { userId: user.id, email: user.email };
}

/**
 * Platform admin session that also satisfies MFA step-up when enrolled.
 * Use in server actions — mirrors proxy + layout guards.
 */
export async function getPlatformAdminWithMfaOrNull(): Promise<PlatformAdminSession | null> {
  const session = await getPlatformAdminOrNull();
  if (!session) return null;

  const supabase = await createClient();
  const mfaRedirect = await resolveMfaRedirectPath(supabase, {
    email: session.email,
    memberRole: null,
    next: "/platform-admin",
  });
  if (mfaRedirect) return null;

  return session;
}

/**
 * Require platform admin — redirects to / if not authorized.
 * Use in server components and server actions.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminSession> {
  const session = await getPlatformAdminOrNull();
  if (!session) {
    redirect("/");
  }

  const supabase = await createClient();
  const mfaRedirect = await resolveMfaRedirectPath(supabase, {
    email: session.email,
    memberRole: null,
    next: "/platform-admin",
  });
  if (mfaRedirect) {
    redirect(mfaRedirect);
  }

  return session;
}
