import { createPublicAdminClient } from "@/lib/supabase/admin";
import {
  ADMIN_LOGIN_USERNAME,
  getAdminEmail,
  getOperatorEmail,
  OPERATOR_LOGIN_USERNAME,
} from "@/lib/auth/constants";
import type { StaffRole } from "@/lib/auth/roles";

export type StaffAccount = {
  role: StaffRole;
  loginUsername: string;
  email: string;
};

export function listStaffAccounts(): StaffAccount[] {
  return [
    {
      role: "admin",
      loginUsername: ADMIN_LOGIN_USERNAME,
      email: getAdminEmail(),
    },
    {
      role: "operator",
      loginUsername: OPERATOR_LOGIN_USERNAME,
      email: getOperatorEmail(),
    },
  ];
}

export async function updateStaffPasswordByEmail(
  email: string,
  newPassword: string
): Promise<void> {
  if (!newPassword || newPassword.length < 8) {
    throw new Error("staff.password_min_8_chars");
  }

  const allowed = listStaffAccounts().map((a) => a.email.toLowerCase());
  if (!allowed.includes(email.toLowerCase())) {
    throw new Error("staff.unknown_account");
  }

  const supabase = createPublicAdminClient();
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    perPage: 200,
  });
  if (listError) throw new Error(listError.message);

  const user = list.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  if (!user) {
    throw new Error(
      "staff.account_missing_in_supabase_run_setup_staff"
    );
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });
  if (error) throw new Error(error.message);
}
