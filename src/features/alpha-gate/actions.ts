"use server";

import { redirect } from "next/navigation";
import {
  sanitizeAlphaGateReturnPath,
  setAlphaGateUnlock,
  verifyAlphaGatePassword,
} from "@/lib/auth/alpha-gate";
import { isAlphaGateEnabled } from "@/lib/auth/alpha-gate-edge";

export async function unlockAlphaGateAction(formData: FormData) {
  if (!isAlphaGateEnabled()) {
    redirect("/");
  }

  const password = String(formData.get("password") ?? "");
  const next = sanitizeAlphaGateReturnPath(
    String(formData.get("next") ?? "/")
  );

  if (!verifyAlphaGatePassword(password)) {
    return { error: "wrongPassword" as const };
  }

  await setAlphaGateUnlock();
  redirect(next);
}
