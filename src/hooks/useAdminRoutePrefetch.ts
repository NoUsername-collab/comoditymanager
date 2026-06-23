"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { isAdminTabActive } from "@/layout/mobile/admin-tabs";

/** Session-scoped dedup — AdminNav + bottom nav + drawer share the same targets. */
const prefetchedHrefs = new Set<string>();

/** Large client bundles — skip eager prefetch; hover/tap still prefetches on intent. */
const HEAVY_ADMIN_PREFETCH_ROUTES = new Set([
  "/admin/calendar",
  "/admin/statistics",
  "/admin/disponibilitate",
]);

/** Prefetch admin nav targets on mount so tab switches feel instant. */
export function useAdminRoutePrefetch(hrefs: readonly string[]) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    for (const href of hrefs) {
      if (
        HEAVY_ADMIN_PREFETCH_ROUTES.has(href) ||
        isAdminTabActive(pathname, href) ||
        prefetchedHrefs.has(href)
      ) {
        continue;
      }
      prefetchedHrefs.add(href);
      router.prefetch(href);
    }
  }, [hrefs, pathname, router]);
}
