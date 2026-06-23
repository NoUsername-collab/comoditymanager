import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Cached per-request session user — no role/tenant resolution. */
export const getSessionUser = cache(async () => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
});
