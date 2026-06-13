import QRCode from "qrcode";
import { getTranslations } from "next-intl/server";
import { buildWifiQrPayload } from "@/lib/guest-app/wifi-payload";

type Props = {
  networkName: string;
  password?: string | null;
};

export async function GuestWifiQrCode({ networkName, password }: Props) {
  const t = await getTranslations("guestApp.wifi");
  const payload = buildWifiQrPayload(networkName, password);
  const dataUrl = await QRCode.toDataURL(payload, {
    margin: 1,
    width: 200,
    color: { dark: "#111111", light: "#ffffff" },
  });

  return (
    <div className="guest-app__wifi-qr">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt={t("qrAlt")} className="guest-app__wifi-qr__img" />
      <p className="guest-app__wifi-qr__hint">{t("qrHint")}</p>
    </div>
  );
}
