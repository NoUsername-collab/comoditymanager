/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  HOSPIRA — Plan & Feature Gating                               ║
 * ║                                                                ║
 * ║  4 cloud plans: Free / Essential / Professional / Business     ║
 * ║  Every feature in the app checks against this config.          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ─── Deployment Modes ────────────────────────────────────────────
export type DeploymentMode = "cloud" | "local" | "hybrid";

// ─── Plan Tiers ─────────────────────────────────────────────────
export type CloudPlan = "free" | "essential" | "professional" | "business";
export type LocalPlan = "local_essential" | "local_professional" | "local_business";
export type HybridPlan = "hybrid_essential" | "hybrid_professional" | "hybrid_business";
export type PlanId = CloudPlan | LocalPlan | HybridPlan;

/** @deprecated Use "free" instead */
export type { CloudPlan as DeprecatedCloudPlan };

// ─── Add-on Modules ─────────────────────────────────────────────
export type ModuleId =
  | "ical_sync"        // iCal sync (Booking, Airbnb)
  | "invoicing"        // Facturare + e-Factura ANAF
  | "whatsapp"         // WhatsApp notifications
  | "public_page"      // Public booking page
  | "advanced_reports" // Advanced statistics
  | "multi_property"   // Multiple buildings/locations
  | "white_label"      // Remove Hospira branding
  | "api_access";      // REST API

// ─── Core Features (gated by plan) ──────────────────────────────
export type CoreFeature =
  | "calendar"           // Basic calendar view
  | "gantt"              // Full Gantt timeline
  | "guest_files"        // Guest management
  | "bookings"           // Booking management
  | "rooms_unlimited"    // Unlimited rooms (Free = max 3)
  | "email_notifications"// Auto email notifications
  | "themes"             // Visual theme selection
  | "heatmap"            // Availability heatmap
  | "priority_support"   // Priority support channel
  | "custom_domain"      // Custom domain
  | "sla_guarantee"      // SLA 99.9%
  | "dedicated_manager"  // Dedicated account manager
  | "onboarding"         // Dedicated onboarding
  | "automations";       // Advanced automations

// ─── Plan Feature Matrix ────────────────────────────────────────
export interface PlanConfig {
  id: PlanId;
  mode: DeploymentMode;
  label: string;
  priceEur: number;          // Monthly price in EUR (0 = free)
  maxRooms: number;          // Infinity for unlimited
  maxTeamMembers: number;    // Including owner
  coreFeatures: CoreFeature[];
  includedModules: ModuleId[];
  showBranding: boolean;
  maxProperties: number;
}

// ─── Feature sets per tier ──────────────────────────────────────

const FREE_FEATURES: CoreFeature[] = [
  "calendar",
  "guest_files",
  "bookings",
];

const ESSENTIAL_FEATURES: CoreFeature[] = [
  ...FREE_FEATURES,
  "gantt",
  "email_notifications",
  "themes",
  "heatmap",
];

const PROFESSIONAL_FEATURES: CoreFeature[] = [
  ...ESSENTIAL_FEATURES,
  "rooms_unlimited",
  "priority_support",
  "custom_domain",
];

const BUSINESS_FEATURES: CoreFeature[] = [
  ...PROFESSIONAL_FEATURES,
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
    mode: "cloud",
    label: "Free",
    priceEur: 0,
    maxRooms: 3,
    maxTeamMembers: 1,
    coreFeatures: FREE_FEATURES,
    includedModules: ["public_page"],
    showBranding: true,
    maxProperties: 1,
  },
  essential: {
    id: "essential",
    mode: "cloud",
    label: "Essential",
    priceEur: 19,
    maxRooms: 10,
    maxTeamMembers: 3,
    coreFeatures: ESSENTIAL_FEATURES,
    includedModules: ["public_page"],
    showBranding: true,
    maxProperties: 1,
  },
  professional: {
    id: "professional",
    mode: "cloud",
    label: "Professional",
    priceEur: 49,
    maxRooms: 30,
    maxTeamMembers: Infinity,
    coreFeatures: PROFESSIONAL_FEATURES,
    includedModules: [
      "public_page",
      "ical_sync",
      "advanced_reports",
    ],
    showBranding: false,
    maxProperties: 1,
  },
  business: {
    id: "business",
    mode: "cloud",
    label: "Business",
    priceEur: 99,
    maxRooms: Infinity,
    maxTeamMembers: Infinity,
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
  local_essential: {
    id: "local_essential",
    mode: "local",
    label: "Local Essential",
    priceEur: 29,
    maxRooms: 10,
    maxTeamMembers: 3,
    coreFeatures: ESSENTIAL_FEATURES,
    includedModules: [],
    showBranding: false,
    maxProperties: 1,
  },
  local_professional: {
    id: "local_professional",
    mode: "local",
    label: "Local Professional",
    priceEur: 69,
    maxRooms: 30,
    maxTeamMembers: Infinity,
    coreFeatures: PROFESSIONAL_FEATURES,
    includedModules: ["invoicing", "advanced_reports"],
    showBranding: false,
    maxProperties: 1,
  },
  local_business: {
    id: "local_business",
    mode: "local",
    label: "Local Business",
    priceEur: 129,
    maxRooms: Infinity,
    maxTeamMembers: Infinity,
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

  // ── Hybrid ────────────────────────────────────────────────────
  hybrid_essential: {
    id: "hybrid_essential",
    mode: "hybrid",
    label: "Hybrid Essential",
    priceEur: 39,
    maxRooms: 10,
    maxTeamMembers: 3,
    coreFeatures: ESSENTIAL_FEATURES,
    includedModules: [],
    showBranding: false,
    maxProperties: 1,
  },
  hybrid_professional: {
    id: "hybrid_professional",
    mode: "hybrid",
    label: "Hybrid Professional",
    priceEur: 79,
    maxRooms: 30,
    maxTeamMembers: Infinity,
    coreFeatures: PROFESSIONAL_FEATURES,
    includedModules: ["invoicing", "advanced_reports"],
    showBranding: false,
    maxProperties: 1,
  },
  hybrid_business: {
    id: "hybrid_business",
    mode: "hybrid",
    label: "Hybrid Business",
    priceEur: 149,
    maxRooms: Infinity,
    maxTeamMembers: Infinity,
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

// ─── Module Catalog ─────────────────────────────────────────────
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
    description: "Notificari automate WhatsApp",
  },
  public_page: {
    id: "public_page",
    label: "Pagina Publica",
    icon: "globe",
    pricePerMonth: 0,
    description: "Pagina de prezentare + rezervari online",
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
    description: "Elimina branding-ul Hospira",
  },
  api_access: {
    id: "api_access",
    label: "API Access",
    icon: "code",
    pricePerMonth: 10,
    description: "REST API pentru integrari externe",
  },
};
