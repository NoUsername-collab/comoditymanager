/**
 * Platform admin guard — gates Hospira internal panel.
 *
 * Checks the authenticated user's email against HOSPIRA_ADMIN_EMAILS env var.
 * Requires both valid Supabase auth AND email match.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const FALLBACK_EMAILS = "admin@hospira.ro";

function getPlatformAdminEmails(): string[] {
  const raw = process.env.HOSPIRA_ADMIN_EMAILS?.trim() || FALLBACK_EMAILS;
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

/**
 * Require platform admin — redirects to / if not authorized.
 * Use in server components and server actions.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdminSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isPlatformAdminEmail(user.email)) {
    redirect("/");
  }

  return { userId: user.id, email: user.email };
}
