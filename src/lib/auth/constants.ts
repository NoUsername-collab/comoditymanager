/** Utilizator afișat la login (mapat la email Supabase). */
export const ADMIN_LOGIN_USERNAME = "Admin";

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL ?? "admin@casaemil.ro";
}

export function isAdminUsername(input: string): boolean {
  return input.trim().toLowerCase() === ADMIN_LOGIN_USERNAME.toLowerCase();
}
