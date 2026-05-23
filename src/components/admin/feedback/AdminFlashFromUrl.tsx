"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAdminFx } from "./AdminToastProvider";

function AdminFlashFromUrlInner() {
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
    } else if (saved === "1" && pathname.startsWith("/admin/settings")) {
      showToast({
        kind: "success",
        title: "Setări salvate",
        message: "Modificările sunt active pentru panoul admin.",
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
