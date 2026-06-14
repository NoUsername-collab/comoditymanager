export type TenantCountry = "RO" | "BG" | "MD";

export type FiscalCurrency = "RON" | "BGN" | "MDL";

export type CountryFiscalProfile = {
  country: TenantCountry;
  countryName: { ro: string; en: string; bg: string };
  currency: FiscalCurrency;
  /** Cotă TVA recomandată pentru servicii de cazare (verificare periodică). */
  defaultAccommodationVatRate: number;
  taxIdLabel: { ro: string; en: string; bg: string };
  regComLabel: { ro: string; en: string; bg: string };
  tourismLicenseLabel: { ro: string; en: string; bg: string };
  authorityName: { ro: string; en: string; bg: string };
  officialRefs: { ro: string[]; en: string[]; bg: string[] };
  vatNote: { ro: string; en: string; bg: string };
};

export const COUNTRY_FISCAL_PROFILES: Record<TenantCountry, CountryFiscalProfile> = {
  RO: {
    country: "RO",
    countryName: {
      ro: "România",
      en: "Romania",
      bg: "Румъния",
    },
    currency: "RON",
    defaultAccommodationVatRate: 9,
    taxIdLabel: {
      ro: "CUI",
      en: "Tax ID (CUI)",
      bg: "CUI",
    },
    regComLabel: {
      ro: "Nr. Reg. Com.",
      en: "Trade register no.",
      bg: "Търговски регистър",
    },
    tourismLicenseLabel: {
      ro: "Certificat clasificare turistică",
      en: "Tourism classification certificate",
      bg: "Сертификат за туристическа категоризация",
    },
    authorityName: {
      ro: "META — situr.gov.ro · ANAF",
      en: "META — situr.gov.ro · ANAF",
      bg: "META — situr.gov.ro · ANAF",
    },
    officialRefs: {
      ro: [
        "Certificat clasificare: se.situr.gov.ro (META)",
        "Evidență turiști: OPANAF 381/2026; SIT obligatoriu din 2026",
        "Facturare B2B: RO e-Factura (SPV ANAF)",
      ],
      en: [
        "Classification certificate: se.situr.gov.ro (META)",
        "Guest records: OPANAF 381/2026; SIT mandatory from 2026",
        "B2B invoicing: RO e-Factura (ANAF SPV)",
      ],
      bg: [
        "Сертификат: se.situr.gov.ro (META)",
        "Регистър гости: OPANAF 381/2026; SIT от 2026",
        "B2B фактури: RO e-Factura (ANAF SPV)",
      ],
    },
    vatNote: {
      ro: "Cotă redusă cazare — verificați la ANAF (actualizare periodică).",
      en: "Reduced accommodation VAT — verify with ANAF.",
      bg: "Намалена ДДС за настаняване — проверете при ANAF.",
    },
  },
  BG: {
    country: "BG",
    countryName: {
      ro: "Bulgaria",
      en: "Bulgaria",
      bg: "България",
    },
    currency: "BGN",
    defaultAccommodationVatRate: 9,
    taxIdLabel: {
      ro: "ЕИК (UIC)",
      en: "UIC (company ID)",
      bg: "ЕИК",
    },
    regComLabel: {
      ro: "Registru BULSTAT",
      en: "BULSTAT register",
      bg: "БУЛСТАТ",
    },
    tourismLicenseLabel: {
      ro: "Categorizare cazare turistică",
      en: "Categorized tourist accommodation",
      bg: "Категоризация на туристически обект",
    },
    authorityName: {
      ro: "NRA · Legea turismului",
      en: "NRA · Tourism Act",
      bg: "НАП · Закон за туризма",
    },
    officialRefs: {
      ro: [
        "Cazare turistică: înregistrare municipală + categorizare",
        "TVA cazare categorizată: 9% (NRA)",
        "Platforme UE (Booking/Airbnb): posibil Art. 97a VATA",
      ],
      en: [
        "Tourist accommodation: municipal registration + categorization",
        "Categorized accommodation VAT: 9% (NRA)",
        "EU platforms: possible Art. 97a VAT registration",
      ],
      bg: [
        "Туристическо настаняване: общинска регистрация + категоризация",
        "ДДС категоризирано настаняване: 9% (НАП)",
        "EU платформи: евентуално чл. 97а ЗДДС",
      ],
    },
    vatNote: {
      ro: "9% cazare categorizată; 20% dacă nu e categorizată. Prag înregistrare TVA: verificați NRA.",
      en: "9% categorized stay; 20% if uncategorized. VAT registration threshold: check NRA.",
      bg: "9% категоризирано; 20% без категория. Праг ДДС: вижте НАП.",
    },
  },
  MD: {
    country: "MD",
    countryName: {
      ro: "Republica Moldova",
      en: "Republic of Moldova",
      bg: "Република Молдова",
    },
    currency: "MDL",
    defaultAccommodationVatRate: 8,
    taxIdLabel: {
      ro: "IDNO",
      en: "IDNO (tax ID)",
      bg: "IDNO",
    },
    regComLabel: {
      ro: "Nr. înregistrare",
      en: "Registration no.",
      bg: "Рег. номер",
    },
    tourismLicenseLabel: {
      ro: "Licență / autorizație turism",
      en: "Tourism licence / authorization",
      bg: "Туристически лиценз",
    },
    authorityName: {
      ro: "Serviciul Fiscal de Stat (SFS)",
      en: "State Tax Service (SFS)",
      bg: "Данъчна служба (SFS)",
    },
    officialRefs: {
      ro: [
        "TVA cazare HoReCa: 8% (din 14.02.2025, SFS)",
        "Programare casă de marcat / evidență TVA 8%",
        "Structuri cazare: secțiunea I CAEM",
      ],
      en: [
        "HoReCa accommodation VAT: 8% (from 14 Feb 2025, SFS)",
        "Fiscal device must reflect 8% VAT",
        "Accommodation: CAEM section I",
      ],
      bg: [
        "HoReCa настаняване ДДС: 8% (от 14.02.2025, SFS)",
        "Касов апарат с ДДС 8%",
        "Настаняване: CAEM раздел I",
      ],
    },
    vatNote: {
      ro: "TVA 8% servicii cazare — SFS, februarie 2025.",
      en: "8% VAT on accommodation — SFS, February 2025.",
      bg: "8% ДДС настаняване — SFS, февруари 2025.",
    },
  },
};

export function getCountryFiscalProfile(
  country: string | null | undefined
): CountryFiscalProfile {
  if (country === "BG" || country === "MD") {
    return COUNTRY_FISCAL_PROFILES[country];
  }
  return COUNTRY_FISCAL_PROFILES.RO;
}

export function resolveInvoiceVatRate(
  country: TenantCountry,
  configuredRate: number | null | undefined
): number {
  if (configuredRate != null && Number.isFinite(configuredRate)) {
    return Math.min(100, Math.max(0, configuredRate));
  }
  return COUNTRY_FISCAL_PROFILES[country].defaultAccommodationVatRate;
}

export type VatBreakdown = {
  net: number;
  vat: number;
  gross: number;
  rate: number;
  enabled: boolean;
  pricesIncludeVat: boolean;
};

export function computeVatBreakdown(
  amount: number,
  ratePercent: number,
  options: { enabled: boolean; pricesIncludeVat: boolean }
): VatBreakdown {
  const rounded = Math.round(amount * 100) / 100;
  if (!options.enabled || ratePercent <= 0) {
    return {
      net: rounded,
      vat: 0,
      gross: rounded,
      rate: 0,
      enabled: false,
      pricesIncludeVat: options.pricesIncludeVat,
    };
  }

  if (options.pricesIncludeVat) {
    const gross = rounded;
    const net = Math.round((gross / (1 + ratePercent / 100)) * 100) / 100;
    const vat = Math.round((gross - net) * 100) / 100;
    return {
      net,
      vat,
      gross,
      rate: ratePercent,
      enabled: true,
      pricesIncludeVat: true,
    };
  }

  const net = rounded;
  const vat = Math.round(net * (ratePercent / 100) * 100) / 100;
  const gross = Math.round((net + vat) * 100) / 100;
  return {
    net,
    vat,
    gross,
    rate: ratePercent,
    enabled: true,
    pricesIncludeVat: false,
  };
}

export type FiscalSellerSnapshot = {
  propertyName: string;
  taxId: string | null;
  regCom: string | null;
  address: string | null;
  tourismLicense: string | null;
};

export function isFiscalSellerComplete(
  seller: FiscalSellerSnapshot
): boolean {
  return Boolean(seller.taxId?.trim() && seller.address?.trim());
}
