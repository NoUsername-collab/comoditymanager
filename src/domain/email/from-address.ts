import { platformPensionNameFallback } from "@/lib/platform/branding";

export function sanitizeEmailDisplayName(name: string): string {
  return name.replace(/[<>"]/g, "").trim();
}

export function formatTransactionalFromAddress(
  displayName: string,
  mailDomain: string,
): string {
  const safeName = sanitizeEmailDisplayName(displayName) || platformPensionNameFallback();
  const domain = mailDomain.replace(/^@/, "").trim().toLowerCase();
  return `${safeName} <noreply@${domain}>`;
}
