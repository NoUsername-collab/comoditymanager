"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { DESIGN_THEME_IDS } from "@/design/themes/catalog";
import { DEFAULT_GUEST_APP_FEATURES } from "@/domain/guest-app/defaults";
import type {
  GuestAppFeatureDef,
  GuestAppFeatureId,
  GuestAppFeatureState,
  GuestAppListItem,
  GuestAppSettings,
} from "@/domain/guest-app/types";
import type { GuestAppThemeSource } from "@/design/themes/types";
import { guestAppFeatureLabel } from "@/features/guest-app/feature-labels";
import { saveGuestAppSettingsAction } from "@/app/[locale]/admin/(panel)/settings/guest-app/actions";
import { AdminInput, AdminSelect, AdminTextarea } from "@/components/admin/ui/AdminInput";

const labelClass =
  "block text-xs font-semibold uppercase tracking-wide text-zinc-500";

function linesToList(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function listItemsToLines(items: GuestAppListItem[] | undefined): string {
  return (items ?? [])
    .map((item) => {
      const parts = [item.icon, item.title, item.description].filter(Boolean);
      return parts.join(" | ");
    })
    .join("\n");
}

function linesToListItems(raw: string): GuestAppListItem[] {
  return linesToList(raw).map((line) => {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length >= 3) {
      return { icon: parts[0], title: parts[1], description: parts[2] };
    }
    if (parts.length === 2) {
      return { title: parts[0], description: parts[1] };
    }
    return { title: line };
  });
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
  const [usePrimaryContact, setUsePrimaryContact] = useState(
    settings.usePrimaryContact ?? true,
  );
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
  const [facilitiesText, setFacilitiesText] = useState(
    listItemsToLines(settings.content.facilities),
  );
  const [servicesText, setServicesText] = useState(
    listItemsToLines(settings.content.services),
  );

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
        usePrimaryContact,
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
          facilities: linesToListItems(facilitiesText),
          services: linesToListItems(servicesText),
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
          <AdminSelect
            className="mt-1"
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
          </AdminSelect>
        </label>
        {themeId === "custom" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelClass}>
              {t("primaryColor")}
              <AdminInput
                type="color"
                className="mt-1"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
            </label>
            <label className={labelClass}>
              {t("accentColor")}
              <AdminInput
                type="color"
                className="mt-1"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
              />
            </label>
          </div>
        ) : null}
        <label className={labelClass}>
          {t("logoUrl")}
          <AdminInput
            className="mt-1"
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
              <AdminSelect
                fieldSize="sm"
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
              </AdminSelect>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">{t("hotelContent")}</h2>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={usePrimaryContact}
            onChange={(e) => setUsePrimaryContact(e.target.checked)}
          />
          <span>{t("usePrimaryContact")}</span>
        </label>
        <label className={labelClass}>
          {t("shortDescription")}
          <AdminTextarea
            className="mt-1"
            rows={2}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          {t("longDescription")}
          <AdminTextarea
            className="mt-1"
            rows={4}
            value={longDescription}
            onChange={(e) => setLongDescription(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          {t("address")}
          <AdminInput
            className="mt-1"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            {t("phone")}
            <AdminInput
              className="mt-1"
              value={hotelPhone}
              onChange={(e) => setHotelPhone(e.target.value)}
            />
          </label>
          <label className={labelClass}>
            Email
            <AdminInput
              type="email"
              className="mt-1"
              value={hotelEmail}
              onChange={(e) => setHotelEmail(e.target.value)}
            />
          </label>
        </div>
        <label className={labelClass}>
          Website
          <AdminInput
            className="mt-1"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Wi-Fi</h2>
        <label className={labelClass}>
          {t("wifiNetwork")}
          <AdminInput
            className="mt-1"
            value={wifiName}
            onChange={(e) => setWifiName(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          {t("wifiPassword")}
          <AdminInput
            className="mt-1"
            value={wifiPassword}
            onChange={(e) => setWifiPassword(e.target.value)}
          />
        </label>
        <label className={labelClass}>
          {t("wifiInstructions")}
          <AdminTextarea
            className="mt-1"
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
          <AdminTextarea
            className="mt-1"
            rows={4}
            value={travelTips}
            onChange={(e) => setTravelTips(e.target.value)}
          />
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">{t("facilities")}</h2>
        <p className="text-xs text-zinc-500">{t("listItemsHint")}</p>
        <label className={labelClass}>
          {t("facilitiesList")}
          <AdminTextarea
            className="mt-1"
            rows={4}
            value={facilitiesText}
            onChange={(e) => setFacilitiesText(e.target.value)}
          />
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">{t("services")}</h2>
        <p className="text-xs text-zinc-500">{t("listItemsHint")}</p>
        <label className={labelClass}>
          {t("servicesList")}
          <AdminTextarea
            className="mt-1"
            rows={4}
            value={servicesText}
            onChange={(e) => setServicesText(e.target.value)}
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
          <AdminTextarea
            className="mt-1"
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
