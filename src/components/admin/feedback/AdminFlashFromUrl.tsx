"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation"
import { usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useAdminFx } from "./AdminToastProvider";

function AdminFlashFromUrlInner() {
  const tGuests = useTranslations("admin.guests");
  const tSettings = useTranslations("admin.pages.settings");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { celebrateConfirm, notifyCancel, notifyMoved, showToast } = useAdminFx();

  useEffect(() => {
    const confirmed = searchParams.get("confirmed");
    const toast = searchParams.get("toast");
    const saved = searchParams.get("saved");

    if (!confirmed && !toast && saved !== "1") return;

    const flashKey = `ce-flash:${pathname}?${searchParams.toString()}`;
    if (sessionStorage.getItem(flashKey)) return;
    sessionStorage.setItem(flashKey, "1");

    if (confirmed === "1") {
      celebrateConfirm();
    } else if (toast === "cancelled") {
      notifyCancel();
    } else if (toast === "moved") {
      notifyMoved();
    } else if (toast === "merged") {
      showToast({
        kind: "success",
        title: tGuests("mergedProfileTitle"),
        message: tGuests("mergedProfileMessage"),
      });
    } else if (toast === "rebooked") {
      showToast({
        kind: "success",
        title: tGuests("rebookCreatedTitle"),
        message: tGuests("rebookCreatedMessage"),
      });
    } else if (saved === "1" && pathname.startsWith("/admin/settings")) {
      showToast({
        kind: "success",
        title: tSettings("saved"),
        message: tSettings("descriptionAdmin"),
      });
    }

    const next = new URLSearchParams(searchParams.toString());
    next.delete("confirmed");
    next.delete("toast");
    if (pathname.startsWith("/admin/settings")) next.delete("saved");
    const q = next.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [
    searchParams,
    pathname,
    router,
    celebrateConfirm,
    notifyCancel,
    notifyMoved,
    showToast,
    tGuests,
    tSettings,
  ]);

  return null;
}

export function AdminFlashFromUrl() {
  return (
    <Suspense fallback={null}>
      <AdminFlashFromUrlInner />
    </Suspense>
  );
}
