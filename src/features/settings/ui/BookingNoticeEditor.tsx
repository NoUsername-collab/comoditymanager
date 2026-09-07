"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BOOKING_NOTICE_ICONS,
  BOOKING_NOTICE_ICON_GLYPH,
  BOOKING_NOTICE_PRESETS,
  BOOKING_NOTICE_PRESET_ICON,
  bookingNoticeFromDraft,
  buildBookingNoticeView,
  emptyCustomItem,
  emptyPresetItem,
  type BookingNoticeDraft,
} from "@/features/public-site/domain/booking-notice";
import type {
  BookingNoticeIconId,
  BookingNoticePresetId,
} from "@/features/public-site/domain/types";
import { buildBookingNoticePresetCopy } from "@/features/public-site/ui/booking-notice-copy";
import { AdminButton } from "@/components/admin/ui/AdminButton";

type Draft = BookingNoticeDraft;

const MAX_NOTICE_ITEMS = 8;

let noticeDraftSeq = 0;
function nextNoticeId(): string {
  noticeDraftSeq += 1;
  return `notice-${Date.now()}-${noticeDraftSeq}`;
}

export function BookingNoticeEditor({
  value,
  onChange,
  checkInTime,
  checkOutTime,
}: {
  value: Draft;
  onChange: (next: Draft) => void;
  checkInTime: string;
  checkOutTime: string;
}) {
  const t = useTranslations("admin.pages.publicSite");
  const tCal = useTranslations("public.calendar");
  const locale = useLocale();
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const presets = useMemo(() => buildBookingNoticePresetCopy(tCal), [tCal]);
  const view = useMemo(
    () =>
      buildBookingNoticeView({
        notice: bookingNoticeFromDraft(value),
        locale,
        checkInTime,
        checkOutTime,
        fallbackTitle: tCal("asideTitle"),
        fallbackFooter: tCal("surplusNote"),
        presets,
      }),
    [value, locale, checkInTime, checkOutTime, tCal, presets]
  );

  function presetCopy(preset: Exclude<BookingNoticePresetId, "custom">) {
    return presets[preset];
  }

  function applyPreset(id: string, preset: BookingNoticePresetId) {
    onChange({
      ...value,
      items: value.items.map((item) => {
        if (item.id !== id) return item;
        if (preset === "custom") {
          const current = view.items.find((row) => row.id === id);
          return {
            ...item,
            preset,
            title: item.title || current?.title || "",
            text: item.text || current?.text || "",
          };
        }
        return {
          ...item,
          preset,
          icon: BOOKING_NOTICE_PRESET_ICON[preset],
          title: "",
          text: "",
        };
      }),
    });
    setExpandedIds((ids) => ids.filter((row) => row !== id));
  }

  function addPreset(preset: Exclude<BookingNoticePresetId, "custom">) {
    if (value.items.length >= MAX_NOTICE_ITEMS) return;
    const item = emptyPresetItem(preset);
    onChange({
      ...value,
      items: [
        ...value.items,
        {
          id: `${preset}-${nextNoticeId()}`,
          preset: item.preset,
          icon: item.icon,
          title: "",
          text: "",
        },
      ],
    });
  }

  function addCustom() {
    if (value.items.length >= MAX_NOTICE_ITEMS) return;
    const item = emptyCustomItem(nextNoticeId());
    onChange({
      ...value,
      items: [
        ...value.items,
        { id: item.id, preset: "custom", icon: "info", title: "", text: "" },
      ],
    });
    setExpandedIds((ids) => [...ids, item.id]);
  }

  function restoreDefaults() {
    onChange({
      enabled: true,
      title: "",
      footer: "",
      items: (["noPay", "hold", "hours"] as const).map((preset) => ({
        id: preset,
        preset,
        icon: BOOKING_NOTICE_PRESET_ICON[preset],
        title: "",
        text: "",
      })),
    });
    setExpandedIds([]);
  }

  const usedPresets = new Set(
    value.items
      .filter((item) => item.preset !== "custom")
      .map((item) => item.preset)
  );
  const availablePresets = BOOKING_NOTICE_PRESETS.filter(
    (preset) => !usedPresets.has(preset)
  );

  return (
    <div className="pub-notice-editor">
      <label className="pub-settings-section-toggle">
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        {t("noticeEnabled")}
      </label>

      <p className="admin-settings-hint">{t("noticeCatalogHint")}</p>

      {value.enabled && view.items.length > 0 ? (
        <div className="pub-notice-editor__preview" aria-label={t("noticePreviewLabel")}>
          <p className="pub-notice-editor__preview-kicker">{t("noticePreviewLabel")}</p>
          {view.title ? (
            <p className="pub-notice-editor__preview-title">{view.title}</p>
          ) : null}
          <ul className="pub-notice-editor__preview-list">
            {view.items.map((item) => (
              <li key={item.id}>
                <span aria-hidden>{item.icon}</span>
                <span>
                  {item.title ? <strong>{item.title}</strong> : null}
                  {item.text ? <span>{item.text}</span> : null}
                </span>
              </li>
            ))}
          </ul>
          {view.footer ? <p className="pub-notice-editor__preview-footer">{view.footer}</p> : null}
        </div>
      ) : null}

      <label>
        <span>{t("noticeTitle")}</span>
        <input
          value={value.title}
          placeholder={tCal("asideTitle")}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
        />
      </label>

      <div className="pub-notice-editor__cards">
        {value.items.map((item, index) => {
          const resolved = view.items.find((row) => row.id === item.id);
          const isCustom = item.preset === "custom";
          const showFields =
            isCustom ||
            item.title.trim().length > 0 ||
            item.text.trim().length > 0 ||
            expandedIds.includes(item.id);
          const copy = item.preset === "custom" ? null : presetCopy(item.preset);

          return (
            <div key={item.id} className="pub-notice-editor__card">
              <div className="pub-notice-editor__card-head">
                <span className="pub-notice-editor__glyph" aria-hidden>
                  {BOOKING_NOTICE_ICON_GLYPH[item.icon]}
                </span>
                <div>
                  <p className="pub-notice-editor__card-title">
                    {resolved?.title || copy?.title || t("noticePreset_custom")}
                  </p>
                  <p className="pub-notice-editor__card-text">
                    {resolved?.text || copy?.text || t("noticeCustomPlaceholder")}
                  </p>
                </div>
                <div className="pub-gallery-editor__actions">
                  <button
                    type="button"
                    className="pub-gallery-editor__icon-btn"
                    disabled={index === 0}
                    aria-label={t("galleryMoveUp")}
                    onClick={() => {
                      if (index === 0) return;
                      const next = [...value.items];
                      const [moved] = next.splice(index, 1);
                      next.splice(index - 1, 0, moved!);
                      onChange({ ...value, items: next });
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="pub-gallery-editor__icon-btn"
                    disabled={index === value.items.length - 1}
                    aria-label={t("galleryMoveDown")}
                    onClick={() => {
                      if (index >= value.items.length - 1) return;
                      const next = [...value.items];
                      const [moved] = next.splice(index, 1);
                      next.splice(index + 1, 0, moved!);
                      onChange({ ...value, items: next });
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="pub-gallery-editor__icon-btn pub-gallery-editor__icon-btn--danger"
                    aria-label={t("noticeRemove")}
                    onClick={() =>
                      onChange({
                        ...value,
                        items: value.items.filter((row) => row.id !== item.id),
                      })
                    }
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="pub-notice-editor__card-tools">
                <label>
                  <span>{t("noticePreset")}</span>
                  <select
                    value={item.preset}
                    onChange={(e) =>
                      applyPreset(item.id, e.target.value as BookingNoticePresetId)
                    }
                  >
                    {BOOKING_NOTICE_PRESETS.map((preset) => (
                      <option key={preset} value={preset}>
                        {t(`noticePreset_${preset}`)}
                      </option>
                    ))}
                    <option value="custom">{t("noticePreset_custom")}</option>
                  </select>
                </label>
                <label>
                  <span>{t("noticeIcon")}</span>
                  <select
                    value={item.icon}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        items: value.items.map((row) =>
                          row.id === item.id
                            ? { ...row, icon: e.target.value as BookingNoticeIconId }
                            : row
                        ),
                      })
                    }
                  >
                    {BOOKING_NOTICE_ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {BOOKING_NOTICE_ICON_GLYPH[icon]} {t(`noticeIcon_${icon}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {showFields ? (
                <div className="pub-notice-editor__fields">
                  <label>
                    <span>{t("noticeItemTitle")}</span>
                    <input
                      value={item.title}
                      placeholder={copy?.title ?? ""}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          items: value.items.map((row) =>
                            row.id === item.id ? { ...row, title: e.target.value } : row
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>{t("noticeItemText")}</span>
                    <textarea
                      rows={2}
                      value={item.text}
                      placeholder={copy?.text ?? ""}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          items: value.items.map((row) =>
                            row.id === item.id ? { ...row, text: e.target.value } : row
                          ),
                        })
                      }
                    />
                  </label>
                  {!isCustom ? (
                    <AdminButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onChange({
                          ...value,
                          items: value.items.map((row) =>
                            row.id === item.id ? { ...row, title: "", text: "" } : row
                          ),
                        });
                        setExpandedIds((ids) => ids.filter((row) => row !== item.id));
                      }}
                    >
                      {t("noticeUsePreset")}
                    </AdminButton>
                  ) : null}
                </div>
              ) : (
                <AdminButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const source = copy ?? resolved;
                    onChange({
                      ...value,
                      items: value.items.map((row) =>
                        row.id === item.id
                          ? {
                              ...row,
                              title: source?.title ?? "",
                              text: source?.text ?? "",
                            }
                          : row
                      ),
                    });
                    setExpandedIds((ids) =>
                      ids.includes(item.id) ? ids : [...ids, item.id]
                    );
                  }}
                >
                  {t("noticeCustomize")}
                </AdminButton>
              )}
            </div>
          );
        })}
      </div>

      <div className="pub-notice-editor__catalog">
        <p className="pub-notice-editor__catalog-label">{t("noticeAddPreset")}</p>
        <div className="pub-notice-editor__chips">
          {availablePresets.map((preset) => (
            <button
              key={preset}
              type="button"
              className="pub-notice-editor__chip"
              disabled={value.items.length >= MAX_NOTICE_ITEMS}
              onClick={() => addPreset(preset)}
            >
              <span aria-hidden>{BOOKING_NOTICE_ICON_GLYPH[BOOKING_NOTICE_PRESET_ICON[preset]]}</span>
              {t(`noticePreset_${preset}`)}
            </button>
          ))}
          <button
            type="button"
            className="pub-notice-editor__chip pub-notice-editor__chip--custom"
            disabled={value.items.length >= MAX_NOTICE_ITEMS}
            onClick={addCustom}
          >
            + {t("noticeAddCustom")}
          </button>
        </div>
        <AdminButton type="button" variant="ghost" size="sm" onClick={restoreDefaults}>
          {t("noticeRestore")}
        </AdminButton>
      </div>

      <label>
        <span>{t("noticeFooter")}</span>
        <textarea
          rows={2}
          value={value.footer}
          placeholder={tCal("surplusNote")}
          onChange={(e) => onChange({ ...value, footer: e.target.value })}
        />
      </label>
      <p className="admin-settings-hint">{t("noticeEmptyUsesPreset")}</p>
      <p className="admin-settings-hint">
        {t("noticeHoursHint", {
          placeholderIn: "{checkIn}",
          placeholderOut: "{checkOut}",
          checkInTime,
          checkOutTime,
        })}
      </p>
    </div>
  );
}
