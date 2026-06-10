/** Canonical design families — public site + admin derive from these. */
export type DesignThemeId = "noir" | "alpine" | "mediterranean";

export type DesignThemeMode = "day" | "night";

export type PublicThemeTokens = {
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  accentFg: string;
  headerBg: string;
  card: string;
  cardElevated: string;
  border: string;
  heroGlow: string;
  fontDisplay: string;
  logoFilter: string;
  logoFilterHover: string;
  link: string;
  focusRing: string;
};

export type AdminPrimitiveTokens = {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentHover: string;
  accentMuted: string;
};

export type DesignThemeDefinition = {
  id: DesignThemeId;
  name: string;
  description: string;
  public: PublicThemeTokens;
  admin: Record<DesignThemeMode, AdminPrimitiveTokens>;
};
