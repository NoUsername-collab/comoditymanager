"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DISPLAY_LAYOUT_CHANGED_EVENT,
  getDisplayLayoutPreference,
  setDisplayLayoutPreference,
  type DisplayLayoutPreference,
} from "@/lib/ui/display-layout-preference";
import {
  applyDisplayProfileToDocument,
  isDisplayProfile,
  type DisplayProfile,
} from "@/lib/ui/display-profile";
import {
  getLayoutViewportSize,
  readLayoutChromeFromDom,
  resolveAutoDisplayProfile,
  type LayoutChrome,
} from "@/layout/mobile";

const OPTIONS: DisplayLayoutPreference[] = [
  "auto",
  "wide",
  "laptop",
  "compact-laptop",
  "narrow",
];

function optionLabel(
  value: DisplayLayoutPreference,
  t: ReturnType<typeof useTranslations<"admin.pages.settings">>
): string {
  if (value === "auto") return t("displayLayoutAuto");
  if (value === "wide") return t("displayLayoutWide");
  if (value === "laptop") return t("displayLayoutLaptop");
  if (value === "compact-laptop") return t("displayLayoutCompact");
  return t("displayLayoutNarrow");
}

function chromeLabel(
  chrome: LayoutChrome,
  t: ReturnType<typeof useTranslations<"admin.pages.settings">>
): string {
  return chrome === "compact"
    ? t("displayLayoutChromeCompact")
    : t("displayLayoutChromeWide");
}

export function AdminDisplayLayoutPicker() {
  const t = useTranslations("admin.pages.settings");
  const [preference, setPreference] = useState<DisplayLayoutPreference>("auto");
  const [detected, setDetected] = useState<DisplayProfile>("laptop");
  const [chrome, setChrome] = useState<LayoutChrome>("wide");
  const [viewportLabel, setViewportLabel] = useState("");

  const refreshDetected = useCallback(() => {
    const { width, height } = getLayoutViewportSize();
    setDetected(resolveAutoDisplayProfile(width, height));
    setChrome(readLayoutChromeFromDom());
    setViewportLabel(`${width}×${height}`);
  }, []);

  useEffect(() => {
    setPreference(getDisplayLayoutPreference());
    refreshDetected();

    const onChange = () => {
      setPreference(getDisplayLayoutPreference());
      refreshDetected();
    };

    window.addEventListener("resize", refreshDetected);
    window.addEventListener(DISPLAY_LAYOUT_CHANGED_EVENT, onChange);
    window.visualViewport?.addEventListener("resize", refreshDetected);

    return () => {
      window.removeEventListener("resize", refreshDetected);
      window.removeEventListener(DISPLAY_LAYOUT_CHANGED_EVENT, onChange);
      window.visualViewport?.removeEventListener("resize", refreshDetected);
    };
  }, [refreshDetected]);

  function select(value: DisplayLayoutPreference) {
    setPreference(value);
    setDisplayLayoutPreference(value);
    applyDisplayProfileToDocument();
    refreshDetected();
  }

  const activeProfile: DisplayProfile =
    preference === "auto"
      ? detected
      : isDisplayProfile(preference)
        ? preference
        : detected;

  return (
    <div className="admin-palette-block admin-display-layout">
      <p className="admin-palette-block__title">{t("displayLayoutTitle")}</p>
      <p className="admin-palette-block__desc">{t("displayLayoutHint")}</p>

      <div
        className="admin-display-layout__options"
        role="radiogroup"
        aria-label={t("displayLayoutTitle")}
      >
        {OPTIONS.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={preference === value}
            className={[
              "admin-display-layout__option",
              preference === value && "admin-display-layout__option--active",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => select(value)}
          >
            {optionLabel(value, t)}
          </button>
        ))}
      </div>

      <p className="admin-display-layout__status">
        {preference === "auto"
          ? t("displayLayoutDetected", {
              profile: t(`displayLayoutProfile_${detected}`),
              chrome: chromeLabel(chrome, t),
              size: viewportLabel,
            })
          : t("displayLayoutManual", {
              profile: t(`displayLayoutProfile_${activeProfile}`),
              chrome: chromeLabel(chrome, t),
            })}
      </p>
    </div>
  );
}
