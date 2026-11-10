"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { geocodePropertyAddressAction } from "@/features/settings/actions";
import { parseMapPoint, type MapPoint } from "@/domain/settings/map-point";
import { SettingsFieldHint } from "@/components/admin/settings/SettingsFieldHint";

function embedSrc(p: MapPoint): string {
  const pad = 0.01;
  const c = (n: number) => n.toFixed(6);
  return `https://www.openstreetmap.org/export/embed.html?bbox=${c(p.lng - pad)}%2C${c(p.lat - pad)}%2C${c(p.lng + pad)}%2C${c(p.lat + pad)}&layer=mapnik&marker=${c(p.lat)}%2C${c(p.lng)}`;
}

/**
 * Where the property is on the map: found from the address on request, or
 * pasted as a Google Maps / OpenStreetMap link or as coordinates. The site's
 * map and the guest app's weather both use it.
 */
export function MapPointField({
  value,
  onChange,
  address,
}: {
  value: MapPoint | null;
  onChange: (next: MapPoint | null) => void;
  address: string;
}) {
  const t = useTranslations("admin.pages.settings.identity");
  const [pasted, setPasted] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [searching, setSearching] = useState(false);

  async function findFromAddress() {
    setSearching(true);
    setMessage(null);
    const res = await geocodePropertyAddressAction(address);
    setSearching(false);
    if (!res.ok) {
      setMessage({ tone: "error", text: res.error });
      return;
    }
    onChange({ lat: res.lat, lng: res.lng });
    setMessage({
      tone: res.approximate ? "error" : "ok",
      text: t(res.approximate ? "mapFoundApprox" : "mapFound", { place: res.label }),
    });
  }

  function usePasted() {
    const point = parseMapPoint(pasted);
    if (!point) {
      setMessage({ tone: "error", text: t("mapPasteInvalid") });
      return;
    }
    onChange(point);
    setPasted("");
    setMessage(null);
  }

  return (
    <div className="admin-settings-fields__full map-point">
      <span className="map-point__label">{t("mapTitle")}</span>
      <SettingsFieldHint>{t("mapHint")}</SettingsFieldHint>

      {value ? (
        <div className="map-point__preview">
          <iframe
            title={t("mapTitle")}
            src={embedSrc(value)}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <p className="map-point__coords">
            {value.lat}, {value.lng}{" "}
            <button type="button" onClick={() => onChange(null)}>
              {t("mapClear")}
            </button>
          </p>
        </div>
      ) : (
        <p className="map-point__empty">{t("mapEmpty")}</p>
      )}

      <div className="map-point__actions">
        <button
          type="button"
          className="map-point__find"
          onClick={findFromAddress}
          disabled={searching || address.trim().length < 3}
        >
          {searching ? t("mapSearching") : t("mapFind")}
        </button>
        <div className="map-point__paste">
          <input
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={t("mapPastePlaceholder")}
            aria-label={t("mapPasteLabel")}
          />
          <button type="button" onClick={usePasted} disabled={!pasted.trim()}>
            {t("mapPasteUse")}
          </button>
        </div>
      </div>
      {message ? (
        <p className={`map-point__message map-point__message--${message.tone}`} role="status">
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
