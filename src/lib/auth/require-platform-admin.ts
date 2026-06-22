/**
 * Platform admin guard — gates Hospira internal panel.
 *
 * Checks the authenticated user's email against HOSPIRA_ADMIN_EMAILS env var
 * (legacy NESTIO_ADMIN_EMAILS still accepted during transition).
 * Requires both valid Supabase auth AND email match.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveMfaRedirectPath } from "@/lib/auth/mfa-redirect";
import { PLATFORM_CONTACT_EMAIL } from "@/lib/platform/branding";

/** Dev fallback when HOSPIRA_ADMIN_EMAILS is unset (production must set the env var). */
const FALLBACK_EMAILS = `admin@hospira.ro,${PLATFORM_CONTACT_EMAIL}`;

function getPlatformAdminEmails(): string[] {
  const raw =
    process.env.HOSPIRA_ADMIN_EMAILS?.trim() ||
    process.env.NESTIO_ADMIN_EMAILS?.trim() ||
    FALLBACK_EMAILS;
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
    next: "/hospira-admin",
  });
  if (mfaRedirect) {
    redirect(mfaRedirect);
  }

  return session;
}
