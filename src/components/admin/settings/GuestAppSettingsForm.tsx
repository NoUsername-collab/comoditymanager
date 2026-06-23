"use client";

import type { ReactNode } from "react";
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
import { saveGuestAppSettingsAction } from "@/features/settings/actions/guest-app";
import { AdminSubmitButton } from "@/components/admin/feedback/AdminSubmitButton";
import { SettingsSaveBar } from "@/components/admin/settings/SettingsSaveBar";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";

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

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <SettingsSection title={title} description={description}>
      {children}
    </SettingsSection>
  );
}

export function GuestAppSettingsForm({
  settings,
  readOnly = false,
}: {
  settings: GuestAppSettings;
  readOnly?: boolean;
}) {
  const t = useTranslations("admin.pages.guestApp");
  const tCommon = useTranslations("admin.common");
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <form onSubmit={handleSubmit} className="settings-form-stack">
      <fieldset disabled={readOnly} className="settings-form-stack border-0 p-0 m-0 min-w-0">
        {error ? (
          <div className="settings-alerts">
            <p className="settings-alerts__item settings-alerts__item--error" role="alert">
              {error}
            </p>
          </div>
        ) : null}

        <FormSection title={t("general")}>
          <div className="admin-settings-fields">
            <label className="pub-settings-section-toggle">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span>{t("enabled")}</span>
            </label>
          </div>
        </FormSection>

        <FormSection title={t("appearance")} description={t("themeHint")}>
          <div className="admin-settings-fields admin-settings-fields--2col">
            <label className="admin-settings-fields__full">
              <span>{t("themeSource")}</span>
              <select
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
              <>
                <label>
                  <span>{t("primaryColor")}</span>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                  />
                </label>
                <label>
                  <span>{t("accentColor")}</span>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                  />
                </label>
              </>
            ) : null}
            <label className="admin-settings-fields__full">
              <span>{t("logoUrl")}</span>
              <input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
              />
            </label>
          </div>
        </FormSection>

        <FormSection title={t("features")} description={t("featuresHint")}>
          <ul className="admin-settings-list">
            {features.map((feature) => (
              <li key={feature.id} className="admin-settings-list__row">
                <span className="admin-settings-list__label">
                  {guestAppFeatureLabel(feature.id)}
                </span>
                <select
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
        </FormSection>

        <FormSection title={t("hotelContent")}>
          <div className="admin-settings-fields admin-settings-fields--2col">
            <label className="pub-settings-section-toggle admin-settings-fields__full">
              <input
                type="checkbox"
                checked={usePrimaryContact}
                onChange={(e) => setUsePrimaryContact(e.target.checked)}
              />
              <span>{t("usePrimaryContact")}</span>
            </label>
            <label className="admin-settings-fields__full">
              <span>{t("shortDescription")}</span>
              <textarea
                rows={2}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
              />
            </label>
            <label className="admin-settings-fields__full">
              <span>{t("longDescription")}</span>
              <textarea
                rows={4}
                value={longDescription}
                onChange={(e) => setLongDescription(e.target.value)}
              />
            </label>
            <label className="admin-settings-fields__full">
              <span>{t("address")}</span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>
            <label>
              <span>{t("phone")}</span>
              <input value={hotelPhone} onChange={(e) => setHotelPhone(e.target.value)} />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                value={hotelEmail}
                onChange={(e) => setHotelEmail(e.target.value)}
              />
            </label>
            <label className="admin-settings-fields__full">
              <span>Website</span>
              <input value={website} onChange={(e) => setWebsite(e.target.value)} />
            </label>
          </div>
        </FormSection>

        <FormSection title="Wi-Fi">
          <div className="admin-settings-fields">
            <label>
              <span>{t("wifiNetwork")}</span>
              <input value={wifiName} onChange={(e) => setWifiName(e.target.value)} />
            </label>
            <label>
              <span>{t("wifiPassword")}</span>
              <input
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
              />
            </label>
            <label>
              <span>{t("wifiInstructions")}</span>
              <textarea
                rows={2}
                value={wifiInstructions}
                onChange={(e) => setWifiInstructions(e.target.value)}
              />
            </label>
          </div>
        </FormSection>

        <FormSection title={t("travelTips")}>
          <div className="admin-settings-fields">
            <label>
              <span>{t("travelTipsHint")}</span>
              <textarea
                rows={4}
                value={travelTips}
                onChange={(e) => setTravelTips(e.target.value)}
              />
            </label>
          </div>
        </FormSection>

        <FormSection title={t("facilities")} description={t("listItemsHint")}>
          <div className="admin-settings-fields">
            <label>
              <span>{t("facilitiesList")}</span>
              <textarea
                rows={4}
                value={facilitiesText}
                onChange={(e) => setFacilitiesText(e.target.value)}
              />
            </label>
          </div>
        </FormSection>

        <FormSection title={t("services")} description={t("listItemsHint")}>
          <div className="admin-settings-fields">
            <label>
              <span>{t("servicesList")}</span>
              <textarea
                rows={4}
                value={servicesText}
                onChange={(e) => setServicesText(e.target.value)}
              />
            </label>
          </div>
        </FormSection>

        <FormSection title={t("greenStay")}>
          <div className="admin-settings-fields">
            <label className="pub-settings-section-toggle">
              <input
                type="checkbox"
                checked={greenEnabled}
                onChange={(e) => setGreenEnabled(e.target.checked)}
              />
              <span>{t("greenStayEnabled")}</span>
            </label>
            <label>
              <span>{t("greenStayDescription")}</span>
              <textarea
                rows={3}
                value={greenDescription}
                onChange={(e) => setGreenDescription(e.target.value)}
              />
            </label>
          </div>
        </FormSection>
      </fieldset>

      {!readOnly ? (
        <SettingsSaveBar status={pending ? "saving" : "idle"}>
          <AdminSubmitButton type="submit" variant="primary" size="lg" disabled={pending}>
            {pending ? tCommon("saving") : t("save")}
          </AdminSubmitButton>
        </SettingsSaveBar>
      ) : null}
    </form>
  );
}
