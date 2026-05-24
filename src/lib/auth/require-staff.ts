import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getStaffRole,
  pathBlockedForOperator,
  type StaffRole,
} from "@/lib/auth/roles";
import { isAdminLocationUnlocked } from "@/lib/auth/admin-config-session";

export async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Trebuie să fii autentificat");
  }

  const role = getStaffRole(user);
  if (!role) {
    throw new Error("Cont neautorizat");
  }

  return { user, role, supabase };
}

export async function requireStaffRole(allowed: StaffRole[]) {
  const ctx = await requireStaff();
  if (!allowed.includes(ctx.role)) {
    throw new Error("Acces interzis pentru acest rol");
  }
  return ctx;
}

/** @deprecated alias */
export async function requireAdmin() {
  const { user } = await requireStaffRole(["admin", "operator"]);
  return user;
}

export async function getStaffUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !getStaffRole(user)) return null;
    return user;
  } catch {
    return null;
  }
}

/** @deprecated */
export async function getAdminUser() {
  return getStaffUser();
}

/** @deprecated alias — configurare locație necesită unlock separat */
export async function requireLocationAdmin() {
  const ctx = await requireStaff();
  const unlocked = await isAdminLocationUnlocked();
  if (!unlocked) {
    redirect("/admin/settings?location=locked");
  }
  return ctx;
}

export async function guardOperatorRoute(pathname: string) {
  const user = await getStaffUser();
  if (!user) return;
  const role = getStaffRole(user);
  if (role === "operator" && pathBlockedForOperator(pathname)) {
    redirect("/admin/settings?location=forbidden");
  }
}
