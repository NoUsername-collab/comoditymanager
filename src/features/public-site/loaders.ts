import { getAdminUser } from "@/lib/auth/require-admin";
import { loadStaffPublicPreview } from "@/services/admin-dashboard";
import { loadBookingConfirmContext } from "@/services/booking-confirm";
import {
  getBookingRulesSettings,
  getStayPricingRules,
} from "@/services/booking-rules-settings";
import { getPensionSettings } from "@/services/pension-settings";
import { getPublicSiteConfig } from "@/services/public-site/queries";

export async function loadPublicSiteConfig() {
  return getPublicSiteConfig();
}

export async function loadPublicHomePage() {
  const staffUserPromise = getAdminUser().catch(() => null);
  const [config, staffPreview] = await Promise.all([
    getPublicSiteConfig(),
    staffUserPromise.then((user) =>
      user ? loadStaffPublicPreview().catch(() => null) : null,
    ),
  ]);
  return { config, staffPreview };
}

export async function loadPublicCalendarPage() {
  return getPublicSiteConfig();
}

export async function loadReceptiePage() {
  return getPensionSettings().catch(() => null);
}

export async function loadTermeniPage() {
  return getBookingRulesSettings().catch(() => null);
}

export async function loadPublicConfirmPage(bookingId: string) {
  const [ctx, pricingRules] = await Promise.all([
    loadBookingConfirmContext(bookingId).catch(() => null),
    getStayPricingRules().catch(() => null),
  ]);
  return { ctx, pricingRules };
}
