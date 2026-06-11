/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  REZOVA — Module Registry                                      ║
 * ║                                                                ║
 * ║  Runtime module system. Each feature module registers itself.  ║
 * ║  Only modules the tenant has paid for get loaded.              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import type { ModuleId } from "@/core/config/plans";
import type { TenantContext } from "@/core/tenant/context";

// ─── Module Definition ───────────────────────────────────────────
export interface ModuleDefinition {
  /** Unique module identifier */
  id: ModuleId;

  /** Human-readable name */
  name: string;

  /**
   * Admin navigation items this module adds.
   * Only shown if the tenant has the module active.
   */
  adminNavItems?: AdminNavItem[];

  /**
   * Public routes this module provides.
   * Only mounted if the tenant has the module active.
   */
  publicRoutes?: string[];

  /**
   * Server actions this module provides.
   * Gated at runtime.
   */
  serverActions?: string[];
}

export interface AdminNavItem {
  label: string;
  href: string;
  icon: string;
  /** Position in sidebar: lower = higher */
  order: number;
}

// ─── Module Registry ─────────────────────────────────────────────
const _registry = new Map<ModuleId, ModuleDefinition>();

/**
 * Register a module definition.
 * Called at startup by each module's index file.
 */
export function registerModule(def: ModuleDefinition): void {
  _registry.set(def.id, def);
}

/**
 * Get all registered module definitions.
 */
export function getAllModules(): ModuleDefinition[] {
  return Array.from(_registry.values());
}

/**
 * Get module definitions that are active for the given tenant.
 */
export function getActiveModules(ctx: TenantContext): ModuleDefinition[] {
  return getAllModules().filter((m) => ctx.hasModule(m.id));
}

/**
 * Get admin nav items for the given tenant (from active modules only).
 */
export function getModuleNavItems(ctx: TenantContext): AdminNavItem[] {
  return getActiveModules(ctx)
    .flatMap((m) => m.adminNavItems ?? [])
    .sort((a, b) => a.order - b.order);
}

/**
 * Check if a specific server action is available for the tenant.
 * Use this to gate server actions at runtime.
 */
export function isActionAvailable(
  ctx: TenantContext,
  actionName: string
): boolean {
  const activeModules = getActiveModules(ctx);
  return activeModules.some((m) =>
    m.serverActions?.includes(actionName)
  );
}

// ─── Built-in Module Registrations ───────────────────────────────
// These are registered eagerly. Third-party modules would
// call registerModule() from their own entry point.

registerModule({
  id: "ical_sync",
  name: "iCal Sync",
  adminNavItems: [
    {
      label: "iCal Sync",
      href: "/admin/integrations/ical",
      icon: "sync",
      order: 70,
    },
  ],
  serverActions: [
    "syncIcalFeed",
    "addIcalSource",
    "removeIcalSource",
    "listIcalSources",
  ],
});

registerModule({
  id: "invoicing",
  name: "Facturare",
  adminNavItems: [
    {
      label: "Facturi",
      href: "/admin/invoices",
      icon: "receipt",
      order: 50,
    },
  ],
  serverActions: [
    "createInvoice",
    "sendInvoice",
    "generateEFactura",
    "listInvoices",
  ],
});

registerModule({
  id: "whatsapp",
  name: "WhatsApp",
  adminNavItems: [
    {
      label: "WhatsApp",
      href: "/admin/integrations/whatsapp",
      icon: "message",
      order: 75,
    },
  ],
  serverActions: [
    "sendWhatsAppNotification",
    "configureWhatsApp",
  ],
});

registerModule({
  id: "guest_app",
  name: "Guest App",
  publicRoutes: ["/stay"],
  serverActions: [
    "resolveGuestAccessByCode",
    "issueGuestAccessForBooking",
  ],
});

registerModule({
  id: "public_page",
  name: "Pagină Publică",
  publicRoutes: ["/", "/calendar", "/receptie"],
  serverActions: [
    "updatePublicPageSettings",
    "togglePublicPage",
  ],
});

registerModule({
  id: "advanced_reports",
  name: "Rapoarte Avansate",
  adminNavItems: [
    {
      label: "Rapoarte",
      href: "/admin/reports",
      icon: "chart",
      order: 55,
    },
  ],
  serverActions: [
    "generateReport",
    "exportReport",
    "scheduleReport",
  ],
});

registerModule({
  id: "multi_property",
  name: "Multi-proprietate",
  adminNavItems: [
    {
      label: "Proprietăți",
      href: "/admin/properties",
      icon: "building",
      order: 10,
    },
  ],
  serverActions: [
    "createProperty",
    "switchProperty",
    "listProperties",
  ],
});

registerModule({
  id: "white_label",
  name: "White Label",
  serverActions: [
    "updateBrandingSettings",
    "uploadLogo",
    "setCustomColors",
  ],
});

registerModule({
  id: "api_access",
  name: "API Access",
  adminNavItems: [
    {
      label: "API",
      href: "/admin/settings/api",
      icon: "code",
      order: 90,
    },
  ],
  serverActions: [
    "generateApiKey",
    "revokeApiKey",
    "listApiKeys",
  ],
});
