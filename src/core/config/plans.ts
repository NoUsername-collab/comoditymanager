/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  REZOVA — Plan & Feature Gating                                ║
 * ║                                                                ║
 * ║  Maps directly to pricing.html tiers.                          ║
 * ║  Every feature in the app checks against this config.          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ─── Deployment Modes ────────────────────────────────────────────
export type DeploymentMode = "cloud" | "local" | "hybrid";

// ─── Plan Tiers (from pricing.html) ──────────────────────────────
export type CloudPlan = "starter" | "standard" | "pro" | "business";
export type LocalPlan = "local_basic" | "local_pro" | "local_business";
export type HybridPlan = "hybrid_basic" | "hybrid_pro" | "hybrid_business";
export type PlanId = CloudPlan | LocalPlan | HybridPlan;

// ─── Add-on Modules (from pricing.html) ──────────────────────────
export type ModuleId =
  | "ical_sync"        // +€8/mo  — iCal sync (Booking, Airbnb)
  | "invoicing"        // +€6/mo  — Facturare + e-Factura ANAF
  | "whatsapp"         // +€5/mo  — WhatsApp notifications
  | "public_page"      // +€7/mo  — Public booking page
  | "advanced_reports" // +€5/mo  — Advanced statistics
  | "multi_property"   // +€20/mo — Multiple buildings/locations
  | "white_label"      // +€15/mo — Remove Rezova branding
  | "api_access";      // +€10/mo — REST/GraphQL API

// ─── Core Features (always available, gated by plan) ─────────────
export type CoreFeature =
  | "calendar"           // Basic calendar view
  | "gantt"              // Full Gantt timeline
  | "guest_files"        // Guest management
  | "bookings"           // Booking management
  | "rooms_unlimited"    // Unlimited rooms (Starter = max 3)
  | "email_notifications"// Auto email notifications
  | "themes"             // Visual theme selection
  | "heatmap"            // Availability heatmap
  | "priority_support"   // Priority support channel
  | "custom_domain"      // Custom domain
  | "professional_email" // Professional email
  | "sla_guarantee"      // SLA 99.9%
  | "dedicated_manager"  // Dedicated account manager
  | "onboarding"         // Dedicated onboarding
  | "automations";       // Advanced automations

// ─── Plan Feature Matrix ─────────────────────────────────────────
export interface PlanConfig {
  id: PlanId;
  mode: DeploymentMode;
  label: string;
  maxRooms: number;            // Infinity for unlimited
  coreFeatures: CoreFeature[];
  includedModules: ModuleId[]; // Modules bundled in the plan
  showBranding: boolean;       // Rezova branding visible?
  maxProperties: number;       // Multi-property limit
}

const STARTER_FEATURES: CoreFeature[] = [
  "calendar",
  "guest_files",
  "bookings",
];

const STANDARD_FEATURES: CoreFeature[] = [
  ...STARTER_FEATURES,
  "gantt",
  "rooms_unlimited",
  "email_notifications",
  "themes",
  "heatmap",
];

const PRO_FEATURES: CoreFeature[] = [
  ...STANDARD_FEATURES,
  "priority_support",
  "custom_domain",
  "professional_email",
];

const BUSINESS_FEATURES: CoreFeature[] = [
  ...PRO_FEATURES,
  "sla_guarantee",
  "dedicated_manager",
  "onboarding",
  "automations",
];

/**
 * Full plan definitions — source of truth for feature gating.
 */
export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  // ── Cloud ──────────────────────────────────────────────────────
  starter: {
    id: "starter",
    mode: "cloud",
    label: "Starter",
    maxRooms: 3,
    coreFeatures: STARTER_FEATURES,
    includedModules: [],
    showBranding: true,
    maxProperties: 1,
  },
  standard: {
    id: "standard",
    mode: "cloud",
    label: "Standard",
    maxRooms: Infinity,
    coreFeatures: STANDARD_FEATURES,
    includedModules: ["public_page"],
    showBranding: false,
    maxProperties: 1,
  },
  pro: {
    id: "pro",
    mode: "cloud",
    label: "Pro",
    maxRooms: Infinity,
    coreFeatures: PRO_FEATURES,
    includedModules: [
      "public_page",
      "ical_sync",
      "invoicing",
      "advanced_reports",
      "whatsapp",
    ],
    showBranding: false,
    maxProperties: 1,
  },
  business: {
    id: "business",
    mode: "cloud",
    label: "Business",
    maxRooms: Infinity,
    coreFeatures: BUSINESS_FEATURES,
    includedModules: [
      "public_page",
      "ical_sync",
      "invoicing",
      "advanced_reports",
      "whatsapp",
      "multi_property",
      "white_label",
      "api_access",
    ],
    showBranding: false,
    maxProperties: 5,
  },

  // ── Local ──────────────────────────────────────────────────────
  local_basic: {
    id: "local_basic",
    mode: "local",
    label: "Local Basic",
    maxRooms: Infinity,
    coreFeatures: STANDARD_FEATURES,
    includedModules: [],
    showBranding: false,
    maxProperties: 1,
  },
  local_pro: {
    id: "local_pro",
    mode: "local",
    label: "Local Pro",
    maxRooms: Infinity,
    coreFeatures: PRO_FEATURES,
    includedModules: [
      "invoicing",
      "advanced_reports",
    ],
    showBranding: false,
    maxProperties: 1,
  },
  local_business: {
    id: "local_business",
    mode: "local",
    label: "Local Business",
    maxRooms: Infinity,
    coreFeatures: BUSINESS_FEATURES,
    includedModules: [
      "invoicing",
      "advanced_reports",
      "multi_property",
      "white_label",
    ],
    showBranding: false,
    maxProperties: 5,
  },

  // ── Hybrid ─────────────────────────────────────────────────────
  hybrid_basic: {
    id: "hybrid_basic",
    mode: "hybrid",
    label: "Local Basic + Sync",
    maxRooms: Infinity,
    coreFeatures: STANDARD_FEATURES,
    includedModules: [],
    showBranding: false,
    maxProperties: 1,
  },
  hybrid_pro: {
    id: "hybrid_pro",
    mode: "hybrid",
    label: "Local Pro + Sync",
    maxRooms: Infinity,
    coreFeatures: PRO_FEATURES,
    includedModules: [
      "invoicing",
      "advanced_reports",
    ],
    showBranding: false,
    maxProperties: 1,
  },
  hybrid_business: {
    id: "hybrid_business",
    mode: "hybrid",
    label: "Local Business + Sync",
    maxRooms: Infinity,
    coreFeatures: BUSINESS_FEATURES,
    includedModules: [
      "invoicing",
      "advanced_reports",
      "multi_property",
      "white_label",
    ],
    showBranding: false,
    maxProperties: 5,
  },
};

// ─── Module Pricing (for add-on purchases) ───────────────────────
export interface ModuleInfo {
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
    description: "Facturi + e-Factura ANAF",
  },
  whatsapp: {
    id: "whatsapp",
    label: "WhatsApp",
    icon: "message",
    pricePerMonth: 5,
    description: "Notificări automate WhatsApp",
  },
  public_page: {
    id: "public_page",
    label: "Pagină Publică",
    icon: "globe",
    pricePerMonth: 7,
    description: "Pagină de prezentare + rezervări online",
  },
  advanced_reports: {
    id: "advanced_reports",
    label: "Rapoarte Avansate",
    icon: "chart",
    pricePerMonth: 5,
    description: "Statistici detaliate și export",
  },
  multi_property: {
    id: "multi_property",
    label: "Multi-proprietate",
    icon: "building",
    pricePerMonth: 20,
    description: "Gestionează mai multe proprietăți",
  },
  white_label: {
    id: "white_label",
    label: "White Label",
    icon: "palette",
    pricePerMonth: 15,
    description: "Elimină branding-ul Rezova",
  },
  api_access: {
    id: "api_access",
    label: "API Access",
    icon: "code",
    pricePerMonth: 10,
    description: "REST API pentru integrări externe",
  },
};
