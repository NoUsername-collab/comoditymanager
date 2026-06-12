/** Guest app domain — pure types, fără DB / framework. */

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
  primaryColor?: string;
  accentColor?: string;
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

export type GuestAppGreenStayContent = {
  enabled?: boolean;
  description?: string;
};

export type GuestAppContent = {
  hotel?: GuestAppHotelContent;
  wifi?: GuestAppWifiContent;
  travelTips?: string[];
  greenStay?: GuestAppGreenStayContent;
};

export type GuestAppSettings = {
  enabled: boolean;
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
  roomLabels: string[];
};

export type GuestAccessDenyReason =
  | "disabled"
  | "not_found"
  | "wrong_host"
  | "revoked"
  | "booking_not_confirmed"
  | "before_check_in"
  | "after_check_out";

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
    };

export type GuestAccessWindow = {
  checkIn: string;
  checkOut: string;
  /** Zile înainte de check-in când linkul devine activ (0 = doar din ziua sosirii). */
  earlyAccessDays: number;
};
