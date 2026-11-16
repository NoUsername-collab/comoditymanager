/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ZALMOX — Plan & Feature Gating                               ║
 * ║                                                                ║
 * ║  4 cloud plans: Free / Essential / Professional / Business     ║
 * ║  Every feature in the app checks against this config.          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ─── Plan Tiers ─────────────────────────────────────────────────
// Zalmox runs in the cloud only; migration 126 removed the local and hybrid plans.
export type CloudPlan = "free" | "essential" | "professional" | "business";
export type PlanId = CloudPlan;

// ─── Add-on Modules ─────────────────────────────────────────────
export type ModuleId =
  | "ical_sync" // iCal sync (Booking, Airbnb)
  | "invoicing" // PDF invoices
  | "whatsapp" // WhatsApp notifications
  | "guest_app" // Alfred-style guest web app per stay
  | "public_page" // Public booking page
  | "advanced_reports" // Advanced statistics
  | "multi_property" // Multiple buildings/locations
  | "white_label" // Remove Zalmox branding
  | "api_access"; // REST API

// ─── Core Features (gated by plan) ──────────────────────────────
export type CoreFeature =
  | "calendar" // Basic calendar view
  | "gantt" // Full Gantt timeline
  | "guest_files" // Guest management
  | "bookings" // Booking management
  | "rooms_unlimited" // Unlimited rooms (Free = max 3)
  | "email_notifications" // Auto email notifications
  | "themes" // Visual theme selection
  | "heatmap" // Availability heatmap
  | "priority_support" // Priority support channel
  | "custom_domain" // Custom domain
  | "sla_guarantee" // SLA 99.9%
  | "dedicated_manager" // Dedicated account manager
  | "onboarding" // Dedicated onboarding
  | "automations"; // Advanced automations

// ─── Plan Feature Matrix ────────────────────────────────────────
export interface PlanConfig {
  id: PlanId;
  label: string;
  priceEur: number; // Monthly price in EUR (0 = free)
  maxRooms: number; // Infinity for unlimited
  maxTeamMembers: number; // Including owner
  coreFeatures: CoreFeature[];
  includedModules: ModuleId[];
  showBranding: boolean;
  maxProperties: number;
  /** Monthly transactional email cap; null = unlimited. Operator may override per tenant. */
  emailMonthlyCap: number | null;
  /** Which outbound messages this plan may send. */
  emailScope: PlanEmailScope;
}

export type PlanEmailScope = "none" | "confirmation" | "stay";

// ─── Feature sets per tier ──────────────────────────────────────

const BASIC_FEATURES: CoreFeature[] = [
  "calendar",
  "gantt",
  "guest_files",
  "bookings",
  "themes",
  "rooms_unlimited",
];

const LIGHT_FEATURES: CoreFeature[] = [...BASIC_FEATURES, "email_notifications"];

const PRO_FEATURES: CoreFeature[] = [...LIGHT_FEATURES, "heatmap", "custom_domain"];

const BUSINESS_FEATURES: CoreFeature[] = [
  ...PRO_FEATURES,
  "priority_support",
  "sla_guarantee",
  "dedicated_manager",
  "onboarding",
  "automations",
];

// ─── Plan definitions — source of truth ─────────────────────────

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  // ── Cloud ──────────────────────────────────────────────────────
  free: {
    id: "free",
    label: "Basic",
    priceEur: 0,
    maxRooms: Infinity,
    maxTeamMembers: 2,
    coreFeatures: BASIC_FEATURES,
    includedModules: ["public_page", "guest_app"],
    showBranding: true,
    maxProperties: 1,
    emailMonthlyCap: 0,
    emailScope: "none",
  },
  essential: {
    id: "essential",
    label: "Light",
    priceEur: 9,
    maxRooms: Infinity,
    maxTeamMembers: 2,
    coreFeatures: LIGHT_FEATURES,
    includedModules: ["public_page", "guest_app", "invoicing"],
    showBranding: true,
    maxProperties: 1,
    emailMonthlyCap: 300,
    emailScope: "confirmation",
  },
  professional: {
    id: "professional",
    label: "PRO",
    priceEur: 29,
    maxRooms: Infinity,
    maxTeamMembers: 8,
    coreFeatures: PRO_FEATURES,
    includedModules: ["public_page", "guest_app", "invoicing", "ical_sync", "advanced_reports"],
    showBranding: false,
    maxProperties: 3,
    emailMonthlyCap: 2_000,
    emailScope: "stay",
  },
  business: {
    id: "business",
    label: "Business",
    priceEur: 69,
    maxRooms: Infinity,
    maxTeamMembers: Infinity,
    coreFeatures: BUSINESS_FEATURES,
    includedModules: [
      "public_page",
      "guest_app",
      "ical_sync",
      "invoicing",
      "advanced_reports",
      "multi_property",
      "white_label",
      "api_access",
      // whatsapp = add-on only (Meta API has per-message cost passed to client)
    ],
    showBranding: false,
    maxProperties: 10,
    emailMonthlyCap: null,
    emailScope: "stay",
  },
};

// ─── Module Catalog ─────────────────────────────────────────────
interface ModuleInfo {
  id: ModuleId;
  label: string;
  icon: string;
  pricePerMonth: number; // EUR
  description: string;
}

export const MODULE_CATALOG: Record<ModuleId, ModuleInfo> = {
  ical_sync: {
    id: "ical_sync",
    label: "iCal Sync",
    icon: "sync",
    pricePerMonth: 8,
    description: "Sync cu Booking.com, Airbnb, Google Calendar",
  },
  invoicing: {
    id: "invoicing",
    label: "Facturare",
    icon: "receipt",
    pricePerMonth: 6,
    description: "Facturi PDF",
  },
  whatsapp: {
    id: "whatsapp",
    label: "WhatsApp",
    icon: "message",
    pricePerMonth: 5,
    description: "Notificari automate WhatsApp",
  },
  public_page: {
    id: "public_page",
    label: "Pagina Publica",
    icon: "globe",
    pricePerMonth: 0,
    description: "Pagina de prezentare + rezervari online",
  },
  guest_app: {
    id: "guest_app",
    label: "Guest App",
    icon: "smartphone",
    pricePerMonth: 0,
    description: "Aplicatie web pentru oaspeti pe durata seederii",
  },
  advanced_reports: {
    id: "advanced_reports",
    label: "Rapoarte Avansate",
    icon: "chart",
    pricePerMonth: 5,
    description: "Statistici detaliate si export",
  },
  multi_property: {
    id: "multi_property",
    label: "Multi-proprietate",
    icon: "building",
    pricePerMonth: 20,
    description: "Gestioneaza mai multe proprietati",
  },
  white_label: {
    id: "white_label",
    label: "White Label",
    icon: "palette",
    pricePerMonth: 15,
    description: "Elimina branding-ul Zalmox",
  },
  api_access: {
    id: "api_access",
    label: "API Access",
    icon: "code",
    pricePerMonth: 10,
    description: "REST API pentru integrari externe",
  },
};

/** Legacy DB / test plan ids → current `PlanId`. */
const LEGACY_PLAN_IDS: Record<string, PlanId> = {
  starter: "free",
  standard: "essential",
  pro: "professional",
};

/** The plan for a stored id; an id Zalmox does not know gets Basic, never a paid plan. */
export function resolvePlanId(raw: string): PlanId {
  const legacy = LEGACY_PLAN_IDS[raw];
  if (legacy) return legacy;
  if (raw in PLAN_CONFIGS) return raw as PlanId;
  return "free";
}

export function getPlanConfig(planId: string): PlanConfig {
  return PLAN_CONFIGS[resolvePlanId(planId)];
}
