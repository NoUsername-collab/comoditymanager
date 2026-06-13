"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { DESIGN_THEME_IDS } from "@/design/themes/catalog";
import { DEFAULT_GUEST_APP_FEATURES } from "@/domain/guest-app/defaults";
import type {
  GuestAppFeatureDef,
  GuestAppFeatureId,
  GuestAppFeatureState,
  GuestAppSettings,
} from "@/domain/guest-app/types";
import type { GuestAppThemeSource } from "@/design/themes/types";
import { guestAppFeatureLabel } from "@/features/guest-app/feature-labels";
import { saveGuestAppSettingsAction } from "@/app/[locale]/admin/(panel)/settings/guest-app/actions";

const labelClass =
  "block text-xs font-semibold uppercase tracking-wide text-zinc-500";
const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm";

function linesToList(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

export function GuestAppSettingsForm({
  settings,
}: {
  settings: GuestAppSettings;
}) {
  const t = useTranslations("admin.pages.guestApp");
  const tThemes = useTranslations("admin.pages.publicSite.themes");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [enabled, setEnabled] = useState(settings.enabled);
  const [themeId, setThemeId] = useState<GuestAppThemeSource>(
    settings.appearance.themeId ?? "inherit",
  );
  const [primaryColor, setPrimaryColor] = useState(
    settings.appearance.primaryColor ?? "#d6b55a",
  );
  const [accentColor, setAccentColor] = useState(
    settings.appearance.accentColor ?? "#e8cc72",
  );
  const [logoUrl, setLogoUrl] = useState(settings.appearance.logoUrl ?? "");

  const [features, setFeatures] = useState<GuestAppFeatureDef[]>(
    settings.features.length > 0 ? settings.features : DEFAULT_GUEST_APP_FEATURES,
  );

  const hotel = settings.content.hotel ?? {};
  const wifi = settings.content.wifi ?? {};
  const green = settings.content.greenStay ?? {};

  const [shortDescription, setShortDescription] = useState(
    hotel.shortDescription ?? "",
  );
  const [longDescription, setLongDescription] = useState(
    hotel.longDescription ?? "",
  );
  const [address, setAddress] = useState(hotel.address ?? "");
  const [hotelPhone, setHotelPhone] = useState(hotel.phone ?? "");
  const [hotelEmail, setHotelEmail] = useState(hotel.email ?? "");
  const [website, setWebsite] = useState(hotel.website ?? "");
  const [wifiName, setWifiName] = useState(wifi.networkName ?? "");
  const [wifiPassword, setWifiPassword] = useState(wifi.password ?? "");
  const [wifiInstructions, setWifiInstructions] = useState(
    wifi.instructions ?? "",
  );
  const [travelTips, setTravelTips] = useState(
    (settings.content.travelTips ?? []).join("\n"),
  );
  const [greenDescription, setGreenDescription] = useState(
    green.description ?? "",
  );
  const [greenEnabled, setGreenEnabled] = useState(green.enabled ?? true);

  function setFeatureState(id: GuestAppFeatureId, state: GuestAppFeatureState) {
    setFeatures((prev) =>
      prev.map((f) => (f.id === id ? { ...f, state } : f)),
    );
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveGuestAppSettingsAction({
        enabled,
        appearance: {
          themeId,
          primaryColor: themeId === "custom" ? primaryColor : null,
          accentColor: themeId === "custom" ? accentColor : null,
          logoUrl: logoUrl.trim() || null,
        },
        features,
        content: {
          hotel: {
            shortDescription: shortDescription.trim() || undefined,
            longDescription: longDescription.trim() || undefined,
            address: address.trim() || undefined,
            phone: hotelPhone.trim() || undefined,
            email: hotelEmail.trim() || undefined,
            website: website.trim() || undefined,
          },
          wifi: {
            networkName: wifiName.trim() || undefined,
            password: wifiPassword.trim() || undefined,
            instructions: wifiInstructions.trim() || undefined,
          },
          travelTips: linesToList(travelTips),
          greenStay: {
            enabled: greenEnabled,
            description: greenDescription.trim() || undefined,
          },
        },
      });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">{t("general")}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          {t("enabled")}
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">{t("appearance")}</h2>
        <p className="text-xs text-zinc-500">{t("themeHint")}</p>
        <label className={labelClass}>
          {t("themeSource")}
          <select
            className={inputClass}
            value={themeId}
            onChange={(e) => setThemeId(e.target.value as GuestAppThemeSource)}
          >
            <option value="inherit">{t("themeInherit")}</option>
            {DESIGN_THEME_IDS.map((id) => (
              <option key={id} value={id}>
                {tThemes(`${id}.title`)}
              </option>
            ))}
            <option value="custom">{t("themeCustom")}</option>
          </select>
        </label>
        {themeId === "custom" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              {t("primaryColor")}
              <input
                type="color"
                className={inputClass}
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
            </label>
            <label className={labelClass}>
              {t("accentColor")}
              <input
                type="color"
                className={inputClass}
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
              />
            </label>
          </div>
        ) : null}
        <label className={labelClass}>
          {t("logoUrl")}
          <input
            className={inputClass}
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
          />
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">{t("features")}</h2>
        <p className="text-xs text-zinc-500">{t("featuresHint")}</p>
        <ul className="space-y-2">
          {features.map((feature) => (
            <li
              key={feature.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-100 px-3 py-2"
            >
              <span className="text-sm font-medium">
                {guestAppFeatureLabel(feature.id)}
              </span>
              <select
                className="rounded border border-zinc-300 px-2 py-1 text-sm"
                value={feature.state}
                onChange={(e) =>
                  setFeatureState(
                    feature.id,
                    e.target.value as GuestAppFeatureState,
                  )
                }
              >
                <option value="mock">{t("stateMock")}</option>
                <option value="live">{t("stateLive")}</option>
                <option value="hidden">{t("stateHidden")}</option>
              </select>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">{t("hotelContent")}</h2>
        <label className={labelClass}>
          {t("shortDescription")}
          <textarea
            className={inputClass}
            rows={2}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          {t("longDescription")}
          <textarea
            className={inputClass}
            rows={4}
            value={longDescription}
            onChange={(e) => setLongDescription(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          {t("address")}
          <input
            className={inputClass}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            {t("phone")}
            <input
              className={inputClass}
              value={hotelPhone}
              onChange={(e) => setHotelPhone(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            Email
            <input
              type="email"
              className={inputClass}
              value={hotelEmail}
              onChange={(e) => setHotelEmail(e.target.value)}
            />
          </label>
        </div>
        <label className={labelClass}>
          Website
          <input
            className={inputClass}
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Wi-Fi</h2>
        <label className={labelClass}>
          {t("wifiNetwork")}
          <input
            className={inputClass}
            value={wifiName}
            onChange={(e) => setWifiName(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          {t("wifiPassword")}
          <input
            className={inputClass}
            value={wifiPassword}
            onChange={(e) => setWifiPassword(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          {t("wifiInstructions")}
          <textarea
            className={inputClass}
            rows={2}
            value={wifiInstructions}
            onChange={(e) => setWifiInstructions(e.target.value)}
          />
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">{t("travelTips")}</h2>
        <label className={labelClass}>
          {t("travelTipsHint")}
          <textarea
            className={inputClass}
            rows={4}
            value={travelTips}
            onChange={(e) => setTravelTips(e.target.value)}
          />
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">{t("greenStay")}</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={greenEnabled}
            onChange={(e) => setGreenEnabled(e.target.checked)}
          />
          {t("greenStayEnabled")}
        </label>
        <label className={labelClass}>
          {t("greenStayDescription")}
          <textarea
            className={inputClass}
            rows={3}
            value={greenDescription}
            onChange={(e) => setGreenDescription(e.target.value)}
          />
        </label>
      </section>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={pending}
        className="admin-settings-submit__btn rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        onClick={handleSave}
      >
        {pending ? "…" : t("save")}
      </button>
    </div>
  );
}
