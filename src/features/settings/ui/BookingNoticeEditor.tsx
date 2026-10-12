"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  BOOKING_NOTICE_ICON_GLYPH,
  BOOKING_NOTICE_PRESETS,
  BOOKING_NOTICE_PRESET_ICON,
  bookingNoticeFromDraft,
  buildBookingNoticeView,
  emptyCustomItem,
  interpolateNoticePlaceholders,
  type BookingNoticeDraft,
} from "@/features/public-site/domain/booking-notice";
import type { BookingNoticePresetId } from "@/features/public-site/domain/types";
import { buildBookingNoticePresetCopy } from "@/features/public-site/ui/booking-notice-copy";
import { AdminButton } from "@/components/admin/ui/AdminButton";

type Draft = BookingNoticeDraft;
type Item = Draft["items"][number];
type PresetId = Exclude<BookingNoticePresetId, "custom">;

const MAX_NOTICE_ITEMS = 8;

/** The hours text follows the check-in settings, so it is never edited by hand. */
const AUTO_TEXT_PRESETS = new Set<PresetId>(["hours"]);

let noticeDraftSeq = 0;
function nextNoticeId(): string {
  noticeDraftSeq += 1;
  return `notice-${Date.now()}-${noticeDraftSeq}`;
}

/**
 * "What guests should know" next to the booking form: tick ready-made texts
 * (shown exactly as guests read them, hours filled in), reword one if needed,
 * or add a text of your own.
 */
export function BookingNoticeEditor({
  value,
  onChange,
  checkInTime,
  checkOutTime,
  locale: localeProp,
}: {
  value: Draft;
  onChange: (next: Draft) => void;
  checkInTime: string;
  checkOutTime: string;
  locale?: string;
}) {
  const t = useTranslations("admin.pages.publicSite");
  const tCal = useTranslations("public.calendar");
  const adminLocale = useLocale();
  const locale = localeProp ?? adminLocale;
  const [editingIds, setEditingIds] = useState<string[]>([]);

  const presets = useMemo(() => buildBookingNoticePresetCopy(tCal), [tCal]);
  const view = useMemo(
    () =>
      buildBookingNoticeView({
        notice: bookingNoticeFromDraft(value),
        locale,
        checkInTime,
        checkOutTime,
        presets,
      }),
    [value, locale, checkInTime, checkOutTime, presets],
  );

  const full = value.items.length >= MAX_NOTICE_ITEMS;
  const customItems = value.items.filter((item) => item.preset === "custom");

  function readyText(preset: PresetId) {
    const copy = presets[preset];
    return {
      title: interpolateNoticePlaceholders(copy.title, checkInTime, checkOutTime),
      text: interpolateNoticePlaceholders(copy.text, checkInTime, checkOutTime),
    };
  }

  function patchItem(id: string, patch: Partial<Item>) {
    onChange({
      ...value,
      items: value.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    });
  }

  function removeItem(id: string) {
    onChange({ ...value, items: value.items.filter((item) => item.id !== id) });
    setEditingIds((ids) => ids.filter((row) => row !== id));
  }

  function togglePreset(preset: PresetId, on: boolean) {
    const existing = value.items.find((item) => item.preset === preset);
    if (!on) {
      if (existing) removeItem(existing.id);
      return;
    }
    if (existing || full) return;
    onChange({
      ...value,
      items: [
        ...value.items,
        {
          id: `${preset}-${nextNoticeId()}`,
          preset,
          icon: BOOKING_NOTICE_PRESET_ICON[preset],
          title: "",
          text: "",
        },
      ],
    });
  }

  function startEditing(item: Item, preset: PresetId) {
    const source = readyText(preset);
    patchItem(item.id, {
      title: item.title || source.title,
      text: item.text || source.text,
    });
    setEditingIds((ids) => (ids.includes(item.id) ? ids : [...ids, item.id]));
  }

  function resetToReady(item: Item) {
    patchItem(item.id, { title: "", text: "" });
    setEditingIds((ids) => ids.filter((row) => row !== item.id));
  }

  function addCustom() {
    if (full) return;
    const item = emptyCustomItem(nextNoticeId());
    onChange({
      ...value,
      items: [...value.items, { id: item.id, preset: "custom", icon: "info", title: "", text: "" }],
    });
  }

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

      {value.enabled ? (
        <>
          <p className="admin-settings-hint">{t("noticeCatalogHint")}</p>

          <ul className="pub-notice-editor__choices">
            {BOOKING_NOTICE_PRESETS.map((preset) => {
              const item = value.items.find((row) => row.preset === preset);
              const checked = Boolean(item);
              const ready = readyText(preset);
              const shown = item ? view.items.find((row) => row.id === item.id) : null;
              const editing =
                item &&
                (editingIds.includes(item.id) || item.title.trim() || item.text.trim());
              return (
                <li key={preset} className="pub-notice-editor__choice" data-on={checked || undefined}>
                  <label className="pub-notice-editor__choice-row">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && full}
                      onChange={(e) => togglePreset(preset, e.target.checked)}
                    />
                    <span className="pub-notice-editor__glyph" aria-hidden>
                      {BOOKING_NOTICE_ICON_GLYPH[BOOKING_NOTICE_PRESET_ICON[preset]]}
                    </span>
                    <span className="pub-notice-editor__choice-copy">
                      <strong>{shown?.title || ready.title}</strong>
                      <span>{shown?.text || ready.text}</span>
                    </span>
                  </label>

                  {item && editing ? (
                    <div className="pub-notice-editor__fields">
                      <NoticeFields
                        item={item}
                        placeholder={ready}
                        onChange={(patch) => patchItem(item.id, patch)}
                      />
                      <AdminButton type="button" variant="ghost" size="sm" onClick={() => resetToReady(item)}>
                        {t("noticeUsePreset")}
                      </AdminButton>
                    </div>
                  ) : item && !AUTO_TEXT_PRESETS.has(preset) ? (
                    <AdminButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditing(item, preset)}
                    >
                      {t("noticeCustomize")}
                    </AdminButton>
                  ) : item ? (
                    <p className="admin-settings-hint">{t("noticeHoursAuto")}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <div className="pub-notice-editor__own">
            <p className="pub-notice-editor__catalog-label">{t("noticeOwnTitle")}</p>
            {customItems.map((item) => (
              <div key={item.id} className="pub-notice-editor__card">
                <NoticeFields item={item} onChange={(patch) => patchItem(item.id, patch)} />
                <AdminButton type="button" variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                  {t("noticeRemove")}
                </AdminButton>
              </div>
            ))}
            <AdminButton type="button" variant="secondary" size="sm" disabled={full} onClick={addCustom}>
              + {t("noticeAddCustom")}
            </AdminButton>
            {full ? <p className="admin-settings-hint">{t("noticeFull", { max: MAX_NOTICE_ITEMS })}</p> : null}
          </div>

          <details className="pub-notice-editor__more">
            <summary>{t("noticeMore")}</summary>
            <label>
              <span>{t("noticeTitle")}</span>
              <input
                value={value.title}
                placeholder={tCal("asideTitle")}
                onChange={(e) => onChange({ ...value, title: e.target.value })}
              />
            </label>
            <label>
              <span>{t("noticeFooter")}</span>
              <textarea
                rows={2}
                value={value.footer}
                placeholder={tCal("surplusNote")}
                onChange={(e) => onChange({ ...value, footer: e.target.value })}
              />
            </label>
          </details>
        </>
      ) : null}
    </div>
  );
}

function NoticeFields({
  item,
  placeholder,
  onChange,
}: {
  item: Item;
  placeholder?: { title: string; text: string };
  onChange: (patch: Partial<Item>) => void;
}) {
  const t = useTranslations("admin.pages.publicSite");
  return (
    <>
      <label>
        <span>{t("noticeItemTitle")}</span>
        <input
          value={item.title}
          placeholder={placeholder?.title ?? ""}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </label>
      <label>
        <span>{t("noticeItemText")}</span>
        <textarea
          rows={2}
          value={item.text}
          placeholder={placeholder?.text ?? ""}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </label>
    </>
  );
}
