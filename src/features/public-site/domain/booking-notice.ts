import { pickLocalized, pickOwnLocalized, writeLocalizedMap } from "@/features/public-site/domain/localized";
import type {
  BookingNoticeIconId,
  BookingNoticePresetId,
  PublicBookingNoticeConfig,
  PublicBookingNoticeItem,
  PublicLocale,
} from "@/features/public-site/domain/types";
import { PUBLIC_LOCALES } from "@/features/public-site/domain/types";

export const BOOKING_NOTICE_PRESETS: Exclude<BookingNoticePresetId, "custom">[] = [
  "noPay",
  "hold",
  "hours",
  "confirm",
  "reply",
  "payOnSite",
  "idCheck",
  "breakfast",
  "parking",
  "pets",
  "children",
  "cancel",
];

export const BOOKING_NOTICE_ICONS: BookingNoticeIconId[] = [
  "check",
  "timer",
  "clock",
  "info",
  "phone",
  "card",
  "key",
  "meal",
  "park",
  "paw",
];

export const BOOKING_NOTICE_ICON_GLYPH: Record<BookingNoticeIconId, string> = {
  check: "✓",
  timer: "⏱",
  clock: "🕐",
  info: "ℹ",
  phone: "☎",
  card: "💳",
  key: "🪪",
  meal: "🍴",
  park: "🅿",
  paw: "🐾",
};

export const BOOKING_NOTICE_PRESET_ICON: Record<
  Exclude<BookingNoticePresetId, "custom">,
  BookingNoticeIconId
> = {
  noPay: "check",
  hold: "timer",
  hours: "clock",
  confirm: "info",
  reply: "phone",
  payOnSite: "card",
  idCheck: "key",
  breakfast: "meal",
  parking: "park",
  pets: "paw",
  children: "info",
  cancel: "timer",
};

const PRESET_ID_SET = new Set<string>([...BOOKING_NOTICE_PRESETS, "custom"]);
const ICON_ID_SET = new Set<string>(BOOKING_NOTICE_ICONS);

const MAX_NOTICE_ITEMS = 8;

export function defaultBookingNotice(): PublicBookingNoticeConfig {
  return {
    enabled: true,
    title: {},
    items: [
      emptyPresetItem("noPay"),
      emptyPresetItem("hold"),
      emptyPresetItem("hours"),
    ],
    footer: {},
  };
}

export function emptyPresetItem(
  preset: Exclude<BookingNoticePresetId, "custom">
): PublicBookingNoticeItem {
  return {
    id: preset,
    preset,
    icon: BOOKING_NOTICE_PRESET_ICON[preset],
    title: {},
    text: {},
  };
}

export type BookingNoticeDraft = {
  enabled: boolean;
  title: string;
  footer: string;
  items: {
    id: string;
    preset: BookingNoticePresetId;
    icon: BookingNoticeIconId;
    title: string;
    text: string;
  }[];
};

export function bookingNoticeToDraft(
  notice: PublicBookingNoticeConfig | null | undefined,
  locale: string
): BookingNoticeDraft {
  const normalized = normalizeBookingNotice(notice);
  return {
    enabled: normalized.enabled,
    title: pickOwnLocalized(normalized.title, locale),
    footer: pickOwnLocalized(normalized.footer, locale),
    items: normalized.items.map((item) => ({
      id: item.id,
      preset: item.preset,
      icon: item.icon,
      title: pickOwnLocalized(item.title, locale),
      text: pickOwnLocalized(item.text, locale),
    })),
  };
}

export function bookingNoticeFromDraft(
  draft: BookingNoticeDraft
): PublicBookingNoticeConfig {
  const localized = (value: string) => {
    const text = value.trim();
    return text ? { ro: text, en: text, bg: text } : {};
  };
  return normalizeBookingNotice({
    enabled: draft.enabled,
    title: localized(draft.title),
    footer: localized(draft.footer),
    items: draft.items.map((item, index) => ({
      id: item.id || `notice-${index}`,
      preset: item.preset,
      icon: item.icon,
      title: localized(item.title),
      text: localized(item.text),
    })),
  });
}

/** Keep item order/presets/icons from source; preserve per-locale title and text. */
export function alignNoticeDraft(
  target: BookingNoticeDraft,
  source: BookingNoticeDraft,
): BookingNoticeDraft {
  const byId = new Map(target.items.map((item) => [item.id, item]));
  return {
    enabled: source.enabled,
    title: target.title,
    footer: target.footer,
    items: source.items.map((item) => {
      const previous = byId.get(item.id);
      return {
        id: item.id,
        preset: item.preset,
        icon: item.icon,
        title: previous?.title ?? "",
        text: previous?.text ?? "",
      };
    }),
  };
}

/** Merge EN/RO/BG drafts without stamping one language onto the other two. */
export function mergeBookingNoticeFromLocales(
  previous: PublicBookingNoticeConfig | null | undefined,
  drafts: Record<PublicLocale, BookingNoticeDraft>,
  structureLocale: PublicLocale,
): PublicBookingNoticeConfig {
  const structure = drafts[structureLocale];
  const prev = normalizeBookingNotice(previous);
  const prevById = new Map(prev.items.map((item) => [item.id, item]));

  const valuesFor = (
    pick: (draft: BookingNoticeDraft) => string,
  ): Partial<Record<PublicLocale, string>> => {
    const values: Partial<Record<PublicLocale, string>> = {};
    for (const locale of PUBLIC_LOCALES) {
      values[locale] = pick(drafts[locale]);
    }
    return values;
  };

  return normalizeBookingNotice({
    enabled: structure.enabled,
    title: writeLocalizedMap(prev.title, valuesFor((draft) => draft.title)),
    footer: writeLocalizedMap(prev.footer, valuesFor((draft) => draft.footer)),
    items: structure.items.map((item, index) => {
      const previousItem = prevById.get(item.id) ?? prev.items[index];
      return {
        id: item.id || `notice-${index}`,
        preset: item.preset,
        icon: item.icon,
        title: writeLocalizedMap(
          previousItem?.title,
          valuesFor(
            (draft) => draft.items.find((row) => row.id === item.id)?.title ?? "",
          ),
        ),
        text: writeLocalizedMap(
          previousItem?.text,
          valuesFor(
            (draft) => draft.items.find((row) => row.id === item.id)?.text ?? "",
          ),
        ),
      };
    }),
  });
}

export function emptyCustomItem(id: string): PublicBookingNoticeItem {
  return {
    id,
    preset: "custom",
    icon: "info",
    title: {},
    text: {},
  };
}

export function normalizeBookingNotice(
  raw: PublicBookingNoticeConfig | null | undefined
): PublicBookingNoticeConfig {
  const fallback = defaultBookingNotice();
  if (!raw || !Array.isArray(raw.items)) {
    return fallback;
  }

  const items = raw.items
    .slice(0, MAX_NOTICE_ITEMS)
    .map((item, index) => normalizeNoticeItem(item, index));

  return {
    enabled: raw.enabled !== false,
    title: raw.title ?? {},
    items,
    footer: raw.footer ?? {},
  };
}

function normalizeNoticeItem(
  item: PublicBookingNoticeItem,
  index: number
): PublicBookingNoticeItem {
  const preset = isPresetId(item.preset) ? item.preset : "custom";
  const icon = isIconId(item.icon)
    ? item.icon
    : preset === "custom"
      ? "info"
      : BOOKING_NOTICE_PRESET_ICON[preset];
  return {
    id: item.id?.trim() || `notice-${index}`,
    preset,
    icon,
    title: item.title ?? {},
    text: item.text ?? {},
  };
}

function isPresetId(value: unknown): value is BookingNoticePresetId {
  return typeof value === "string" && PRESET_ID_SET.has(value);
}

function isIconId(value: unknown): value is BookingNoticeIconId {
  return typeof value === "string" && ICON_ID_SET.has(value);
}

export function interpolateNoticePlaceholders(
  text: string,
  checkInTime: string,
  checkOutTime: string
): string {
  return text
    .replaceAll("{checkIn}", checkInTime)
    .replaceAll("{checkOut}", checkOutTime);
}

export type BookingNoticePresetCopy = Record<
  Exclude<BookingNoticePresetId, "custom">,
  { title: string; text: string }
>;

export type BookingNoticeView = {
  enabled: boolean;
  title: string;
  items: { id: string; icon: string; title: string; text: string }[];
  footer: string;
};

export function buildBookingNoticeView(args: {
  notice: PublicBookingNoticeConfig | null | undefined;
  locale: string;
  checkInTime: string;
  checkOutTime: string;
  fallbackTitle: string;
  fallbackFooter: string;
  presets: Partial<BookingNoticePresetCopy>;
}): BookingNoticeView {
  const notice = normalizeBookingNotice(args.notice);
  const items = notice.items.map((item) => {
    const presetCopy =
      item.preset !== "custom" ? args.presets[item.preset] : undefined;
    const title = pickLocalized(item.title, args.locale, [
      presetCopy?.title ?? "",
    ]);
    const text = interpolateNoticePlaceholders(
      pickLocalized(item.text, args.locale, [presetCopy?.text ?? ""]),
      args.checkInTime,
      args.checkOutTime
    );
    return {
      id: item.id,
      icon: BOOKING_NOTICE_ICON_GLYPH[item.icon],
      title,
      text,
    };
  }).filter((item) => item.title.length > 0 || item.text.length > 0);

  return {
    enabled: notice.enabled,
    title: pickLocalized(notice.title, args.locale, [args.fallbackTitle]),
    items,
    footer: interpolateNoticePlaceholders(
      pickLocalized(notice.footer, args.locale, [args.fallbackFooter]),
      args.checkInTime,
      args.checkOutTime
    ),
  };
}
