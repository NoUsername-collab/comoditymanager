"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { isAdminTabActive } from "@/layout/mobile/admin-tabs";

/** Prefetch admin nav targets on mount so tab switches feel instant. */
export function useAdminRoutePrefetch(hrefs: readonly string[]) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    for (const href of hrefs) {
      if (!isAdminTabActive(pathname, href)) {
        router.prefetch(href);
      }
    }
  }, [hrefs, pathname, router]);
}
