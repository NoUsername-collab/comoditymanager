"use client";

import { useEffect, useRef } from "react";
import { bindTenantSessionAction } from "@/app/[locale]/admin/(panel)/actions/bind-tenant-session";
import { createClient } from "@/lib/supabase/client";

/** Syncs JWT tenant claim with current host — required for bulletproof RLS if using user client. */
export function StaffTenantSessionBinder() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      const result = await bindTenantSessionAction();
      if (!result.ok || !result.refreshed) return;

      const supabase = createClient();
      await supabase.auth.refreshSession();
    })();
  }, []);

  return null;
}
