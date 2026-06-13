import { pickLocalized } from "@/features/public-site/domain/localized";
import type {
  PublicBenefitItem,
  PublicGalleryItem,
  PublicSiteConfig,
} from "@/features/public-site/domain/types";
import type {
  GuestAccessBookingSnapshot,
  GuestAppContent,
  GuestAppHotelContent,
  GuestAppListItem,
  GuestAppSettings,
} from "@/domain/guest-app/types";
import { getPublicSiteConfig } from "@/services/public-site/queries";

export type GuestGalleryDisplayItem = {
  id: string;
  url: string;
  caption?: string;
};

export type GuestAppResolvedContext = {
  settings: GuestAppSettings;
  booking: GuestAccessBookingSnapshot;
  locale: string;
  hotel: GuestAppHotelContent;
  wifi: GuestAppContent["wifi"];
  travelTips: string[];
  facilities: GuestAppListItem[];
  services: GuestAppListItem[];
  galleryItems: GuestGalleryDisplayItem[];
  greenStay: GuestAppContent["greenStay"];
  precheckinSubmitted: boolean;
  greenStayPendingDates: string[];
};

function mapBenefits(
  items: PublicBenefitItem[],
  locale: string,
): GuestAppListItem[] {
  return items.map((item, index) => ({
    icon: item.icon,
    title: pickLocalized(item.title, locale),
    description: pickLocalized(item.text, locale),
  })).filter((item) => item.title.trim().length > 0);
}

function mapGallery(
  items: PublicGalleryItem[],
  locale: string,
): GuestGalleryDisplayItem[] {
  return items
    .filter((item) => item.url?.trim())
    .map((item) => ({
      id: item.id,
      url: item.url,
      caption: pickLocalized(item.caption, locale, [item.category ?? ""]),
    }));
}

function mergeHotel(
  guest: GuestAppHotelContent | undefined,
  publicConfig: PublicSiteConfig | null,
  locale: string,
): GuestAppHotelContent {
  const intro = publicConfig?.sections.find(
    (section) => section.sectionType === "intro" && section.visible,
  );
  const introBody = intro?.payload.body
    ? pickLocalized(intro.payload.body, locale)
    : undefined;
  const introLead = intro?.payload.lead
    ? pickLocalized(intro.payload.lead, locale)
    : undefined;

  return {
    shortDescription: guest?.shortDescription?.trim() || introLead || undefined,
    longDescription: guest?.longDescription?.trim() || introBody || undefined,
    address: guest?.address?.trim() || undefined,
    phone: guest?.phone?.trim() || publicConfig?.contact.phone?.trim() || undefined,
    email: guest?.email?.trim() || publicConfig?.contact.email?.trim() || undefined,
    website: guest?.website?.trim() || undefined,
  };
}

function listItemsOrBenefits(
  custom: GuestAppListItem[] | undefined,
  benefits: GuestAppListItem[],
): GuestAppListItem[] {
  if (custom && custom.length > 0) {
    return custom.filter((item) => item.title.trim().length > 0);
  }
  return benefits;
}

async function loadGuestLiveState(bookingId: string): Promise<{
  precheckinSubmitted: boolean;
  greenStayPendingDates: string[];
}> {
  try {
    const { getGuestAppPublicDb } = await import("./public-db");
    const { tenantId, supabase } = await getGuestAppPublicDb();

    const [precheckin, greenRows] = await Promise.all([
      supabase
        .from("guest_precheckin_submissions")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("booking_id", bookingId)
        .maybeSingle(),
      supabase
        .from("guest_green_stay_requests")
        .select("skip_date")
        .eq("tenant_id", tenantId)
        .eq("booking_id", bookingId)
        .eq("status", "pending")
        .order("skip_date", { ascending: true }),
    ]);

    const precheckinSubmitted = Boolean(precheckin.data);
    const greenStayPendingDates =
      greenRows.data?.map((row) => String(row.skip_date)) ?? [];

    return { precheckinSubmitted, greenStayPendingDates };
  } catch {
    return { precheckinSubmitted: false, greenStayPendingDates: [] };
  }
}

export async function resolveGuestAppContext(
  settings: GuestAppSettings,
  booking: GuestAccessBookingSnapshot,
  locale: string,
): Promise<GuestAppResolvedContext> {
  const publicConfig = await getPublicSiteConfig().catch(() => null);

  const benefitsSection = publicConfig?.sections.find(
    (section) => section.sectionType === "benefits" && section.visible,
  );
  const benefits = benefitsSection
    ? mapBenefits((benefitsSection.payload.items ?? []) as PublicBenefitItem[], locale)
    : [];

  const gallerySection = publicConfig?.sections.find(
    (section) => section.sectionType === "gallery" && section.visible,
  );
  const galleryFromSite = gallerySection
    ? mapGallery((gallerySection.payload.items ?? []) as PublicGalleryItem[], locale)
    : [];

  const roomGallery: GuestGalleryDisplayItem[] = booking.roomImageUrls.map(
    (url, index) => ({
      id: `room-${index}`,
      url,
      caption: booking.roomLabels[index] ?? undefined,
    }),
  );

  const galleryItems = [...galleryFromSite, ...roomGallery];

  const liveState = await loadGuestLiveState(booking.id);

  return {
    settings,
    booking,
    locale,
    hotel: mergeHotel(settings.content.hotel, publicConfig, locale),
    wifi: settings.content.wifi,
    travelTips: settings.content.travelTips ?? [],
    facilities: listItemsOrBenefits(settings.content.facilities, benefits),
    services: listItemsOrBenefits(settings.content.services, benefits),
    galleryItems,
    greenStay: settings.content.greenStay,
    ...liveState,
  };
}
