"use client";

import { useTranslations } from "next-intl";
import type { GuestAppWifiContent } from "@/domain/guest-app/types";
import { copyTextToClipboard } from "@/lib/guest-app/copy-text";
import { useGuestAppToast } from "./GuestAppToast";

type Props = {
  wifi: GuestAppWifiContent;
};

export function GuestWifiCopyAllButton({ wifi }: Props) {
  const t = useTranslations("guestApp.wifi");
  const { showToast } = useGuestAppToast();

  async function copyAll() {
    const lines = [
      wifi.networkName ? `${t("networkLabel")}: ${wifi.networkName}` : null,
      wifi.password ? `${t("passwordLabel")}: ${wifi.password}` : null,
    ].filter(Boolean);

    if (lines.length === 0) return;

    const ok = await copyTextToClipboard(lines.join("\n"));
    showToast(ok ? t("copyAllSuccess") : t("copyAllFailed"));
  }

  if (!wifi.networkName && !wifi.password) return null;

  return (
    <button type="button" className="guest-app__btn-secondary" onClick={copyAll}>
      {t("copyAll")}
    </button>
  );
}
