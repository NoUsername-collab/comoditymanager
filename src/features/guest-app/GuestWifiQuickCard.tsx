"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { GuestAppWifiContent } from "@/domain/guest-app/types";
import { guestAppFeatureHref } from "@/domain/guest-app/routes";
import { GuestAppCopyField } from "./GuestAppCopyField";
import { GuestWifiCopyAllButton } from "./GuestWifiCopyAllButton";

type Props = {
  accessCode: string;
  wifi: GuestAppWifiContent;
};

export function GuestWifiQuickCard({ accessCode, wifi }: Props) {
  const t = useTranslations("guestApp.home");
  const hasCredentials = Boolean(wifi.networkName || wifi.password);
  if (!hasCredentials) return null;

  return (
    <section className="guest-app__wifi-quick" aria-labelledby="guest-wifi-quick-title">
      <div className="guest-app__wifi-quick__head">
        <h2 id="guest-wifi-quick-title" className="guest-app__wifi-quick__title">
          {t("wifiQuickTitle")}
        </h2>
        <Link
          href={guestAppFeatureHref(accessCode, "wifi")}
          className="guest-app__wifi-quick__more"
        >
          {t("wifiQuickMore")}
        </Link>
      </div>

      {wifi.networkName ? (
        <GuestAppCopyField label={t("wifiNetwork")} value={wifi.networkName} compact />
      ) : null}

      {wifi.password ? (
        <GuestAppCopyField label={t("wifiPassword")} value={wifi.password} compact />
      ) : null}

      <GuestWifiCopyAllButton wifi={wifi} />
    </section>
  );
}
