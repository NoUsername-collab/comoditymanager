/**
 * Helpers env safe pentru Edge Middleware — fără Zod, fără throw la build dacă lipsesc.
 * Middleware face deja redirect la login; aceste fallback-uri sunt doar pentru dev parțial configurat.
 */

const FALLBACK_ADMIN = "admin@zalmox.app";
const FALLBACK_OPERATOR = "operator@zalmox.app";

export function getEdgeStaffEmails() {
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const operator = process.env.OPERATOR_EMAIL?.trim().toLowerCase();
  return {
    adminEmail: admin && admin.includes("@") ? admin : FALLBACK_ADMIN,
    operatorEmail:
      operator && operator.includes("@") ? operator : FALLBACK_OPERATOR,
  };
}

export function getEdgeSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return {
    configured: Boolean(url && key && url.includes("supabase")),
    url,
    key,
  };
}
