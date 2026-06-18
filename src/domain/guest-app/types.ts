/** Guest app domain — pure types, fără DB / framework. */

import type { GuestAppThemeSource } from "@/design/themes/types";

export type GuestAppFeatureId =
  | "hotel_info"
  | "gallery"
  | "online_checkin"
  | "wifi"
  | "services"
  | "facilities"
  | "travel_tips"
  | "green_stay"
  | "online_payment";

export type GuestAppFeatureState = "live" | "mock" | "hidden";

export type GuestAppFeatureDef = {
  id: GuestAppFeatureId;
  /** live = funcțional; mock = UI demo; hidden = ascuns */
  state: GuestAppFeatureState;
  sortOrder: number;
};

export type GuestAppAppearance = {
  /** `inherit` = same family as public site; `custom` = override colors only. */
  themeId?: GuestAppThemeSource;
  primaryColor?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
};

export type GuestAppWifiContent = {
  networkName?: string;
  password?: string;
  instructions?: string;
};

export type GuestAppHotelContent = {
  shortDescription?: string;
  longDescription?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
};

export type GuestAppListItem = {
  title: string;
  description?: string;
  icon?: string;
};

export type GuestAppGreenStayContent = {
  enabled?: boolean;
  description?: string;
};

export type GuestAppContent = {
  hotel?: GuestAppHotelContent;
  wifi?: GuestAppWifiContent;
  travelTips?: string[];
  facilities?: GuestAppListItem[];
  services?: GuestAppListItem[];
  greenStay?: GuestAppGreenStayContent;
};

export type GuestAppSettings = {
  enabled: boolean;
  usePrimaryContact: boolean;
  appearance: GuestAppAppearance;
  features: GuestAppFeatureDef[];
  content: GuestAppContent;
};

export type GuestAccessBookingSnapshot = {
  id: string;
  status: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  roomLabels: string[];
  roomImageUrls: string[];
  totalPrice: number | null;
  /** Check-in operațional înregistrat de recepție (null = încă doar confirmată). */
  checkedInAt: string | null;
  paymentStatus: "paid" | "partial" | "unpaid" | null;
  paymentAmountPaid: number | null;
};

export type GuestAccessDenyReason =
  | "disabled"
  | "setup_incomplete"
  | "not_found"
  | "wrong_host"
  | "revoked"
  | "booking_not_confirmed"
  | "before_check_in"
  | "after_check_out";

export type GuestAccessSchedule = {
  checkIn: string;
  checkOut: string;
  opensOn: string;
  closesOn: string;
};

export type GuestAccessResult =
  | {
      ok: true;
      accessCode: string;
      booking: GuestAccessBookingSnapshot;
      settings: GuestAppSettings;
    }
  | {
      ok: false;
      reason: GuestAccessDenyReason;
      schedule?: GuestAccessSchedule;
    };

export type GuestAccessWindow = {
  checkIn: string;
  checkOut: string;
  /** Zile înainte de check-in când linkul devine activ (0 = de la confirmare). */
  earlyAccessDays: number;
};
