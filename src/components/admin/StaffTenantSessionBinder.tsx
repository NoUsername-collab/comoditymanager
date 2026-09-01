"use client";

import { useEffect, useRef } from "react";
import { bindTenantSessionAction } from "@/features/auth/bind-tenant-session";
import { refreshBrowserAuthSession } from "@/lib/auth/mfa-browser";

/** Syncs JWT tenant claim with current host — required for bulletproof RLS if using user client. */
export function StaffTenantSessionBinder() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      const result = await bindTenantSessionAction();
      if (!result.ok || !result.refreshed) return;

      await refreshBrowserAuthSession();
    })();
  }, []);

  return null;
}
