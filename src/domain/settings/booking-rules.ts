export type CancellationPolicyType =
  | "flexible"
  | "moderate"
  | "strict"
  | "custom";

export type WeekendPricingMode = "fri_sat" | "sat_only";

export type PricingSeason = {
  id: string;
  name: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  /** 1.2 = +20% față de prețul de bază */
  multiplier: number;
};

export type StayPricingRules = {
  weekendEnabled: boolean;
  weekendMode: WeekendPricingMode;
  weekendMultiplier: number;
  seasons: PricingSeason[];
};

export type BookingRulesSettings = {
  cancellationPolicyType: CancellationPolicyType;
  cancellationPolicyDays: number;
  cancellationPolicyCustomText: string | null;
  pricingWeekendEnabled: boolean;
  pricingWeekendMode: WeekendPricingMode;
  pricingWeekendMultiplier: number;
  pricingSeasons: PricingSeason[];
  invoiceSeries: string;
  invoiceNextNumber: number;
  invoiceSellerRegCom: string | null;
};

export const DEFAULT_BOOKING_RULES: BookingRulesSettings = {
  cancellationPolicyType: "moderate",
  cancellationPolicyDays: 3,
  cancellationPolicyCustomText: null,
  pricingWeekendEnabled: false,
  pricingWeekendMode: "fri_sat",
  pricingWeekendMultiplier: 1.2,
  pricingSeasons: [],
  invoiceSeries: "HSP",
  invoiceNextNumber: 1,
  invoiceSellerRegCom: null,
};

function parsePolicyType(raw: unknown): CancellationPolicyType {
  if (
    raw === "flexible" ||
    raw === "moderate" ||
    raw === "strict" ||
    raw === "custom"
  ) {
    return raw;
  }
  return DEFAULT_BOOKING_RULES.cancellationPolicyType;
}

function parseWeekendMode(raw: unknown): WeekendPricingMode {
  return raw === "sat_only" ? "sat_only" : "fri_sat";
}

function clampMultiplier(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(5, Math.max(1, Math.round(value * 100) / 100));
}

function parseSeasonEntry(raw: unknown, index: number): PricingSeason | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? "").trim();
  const startMonth = Number(row.startMonth);
  const startDay = Number(row.startDay);
  const endMonth = Number(row.endMonth);
  const endDay = Number(row.endDay);
  const multiplier = clampMultiplier(Number(row.multiplier ?? 1));
  if (!name) return null;
  if (
    !Number.isInteger(startMonth) ||
    !Number.isInteger(startDay) ||
    !Number.isInteger(endMonth) ||
    !Number.isInteger(endDay)
  ) {
    return null;
  }
  if (
    startMonth < 1 ||
    startMonth > 12 ||
    endMonth < 1 ||
    endMonth > 12 ||
    startDay < 1 ||
    startDay > 31 ||
    endDay < 1 ||
    endDay > 31
  ) {
    return null;
  }
  const id =
    typeof row.id === "string" && row.id.trim().length > 0
      ? row.id.trim()
      : `season-${index + 1}`;
  return {
    id,
    name,
    startMonth,
    startDay,
    endMonth,
    endDay,
    multiplier,
  };
}

export function parsePricingSeasons(raw: unknown): PricingSeason[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, index) => parseSeasonEntry(entry, index))
    .filter((entry): entry is PricingSeason => entry != null)
    .slice(0, 8);
}

export function parseBookingRulesRow(
  row: Record<string, unknown> | null | undefined
): BookingRulesSettings {
  if (!row) return DEFAULT_BOOKING_RULES;
  return {
    cancellationPolicyType: parsePolicyType(row.cancellation_policy_type),
    cancellationPolicyDays: Math.min(
      90,
      Math.max(0, Number(row.cancellation_policy_days) || 0)
    ),
    cancellationPolicyCustomText:
      row.cancellation_policy_custom_text != null
        ? String(row.cancellation_policy_custom_text).trim() || null
        : null,
    pricingWeekendEnabled: Boolean(row.pricing_weekend_enabled),
    pricingWeekendMode: parseWeekendMode(row.pricing_weekend_mode),
    pricingWeekendMultiplier: clampMultiplier(
      Number(row.pricing_weekend_multiplier) ||
        DEFAULT_BOOKING_RULES.pricingWeekendMultiplier
    ),
    pricingSeasons: parsePricingSeasons(row.pricing_seasons),
    invoiceSeries:
      String(row.invoice_series ?? DEFAULT_BOOKING_RULES.invoiceSeries)
        .trim()
        .slice(0, 12) || DEFAULT_BOOKING_RULES.invoiceSeries,
    invoiceNextNumber: Math.max(
      1,
      Number(row.invoice_next_number) || DEFAULT_BOOKING_RULES.invoiceNextNumber
    ),
    invoiceSellerRegCom:
      row.invoice_seller_reg_com != null
        ? String(row.invoice_seller_reg_com).trim() || null
        : null,
  };
}

export function toStayPricingRules(
  settings: BookingRulesSettings
): StayPricingRules {
  return {
    weekendEnabled: settings.pricingWeekendEnabled,
    weekendMode: settings.pricingWeekendMode,
    weekendMultiplier: settings.pricingWeekendMultiplier,
    seasons: settings.pricingSeasons,
  };
}

export function buildCancellationPolicyText(
  settings: Pick<
    BookingRulesSettings,
    | "cancellationPolicyType"
    | "cancellationPolicyDays"
    | "cancellationPolicyCustomText"
  >,
  locale: "ro" | "en" | "bg" = "ro"
): string {
  if (
    settings.cancellationPolicyType === "custom" &&
    settings.cancellationPolicyCustomText
  ) {
    return settings.cancellationPolicyCustomText;
  }

  const days = settings.cancellationPolicyDays;

  if (locale === "en") {
    switch (settings.cancellationPolicyType) {
      case "flexible":
        return "Free cancellation at any time before check-in.";
      case "strict":
        return "Non-refundable after booking confirmation.";
      case "moderate":
        return `Free cancellation up to ${days} day(s) before check-in. After that, the stay may be charged in full.`;
      default:
        return settings.cancellationPolicyCustomText ?? "";
    }
  }

  if (locale === "bg") {
    switch (settings.cancellationPolicyType) {
      case "flexible":
        return "Безплатна анулация по всяко време преди настаняване.";
      case "strict":
        return "Без възстановяване след потвърждение на резервацията.";
      case "moderate":
        return `Безплатна анулация до ${days} ден(а) преди настаняване. След това престоят може да бъде таксуван изцяло.`;
      default:
        return settings.cancellationPolicyCustomText ?? "";
    }
  }

  switch (settings.cancellationPolicyType) {
    case "flexible":
      return "Anulare gratuită oricând înainte de check-in.";
    case "strict":
      return "Fără rambursare după confirmarea rezervării.";
    case "moderate":
      return `Anulare gratuită cu cel puțin ${days} zi(le) înainte de check-in. După această dată, sejurul poate fi taxat integral.`;
    default:
      return settings.cancellationPolicyCustomText ?? "";
  }
}
