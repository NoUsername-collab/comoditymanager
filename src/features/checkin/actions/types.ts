import type { BookingRow } from "@/services/bookings/types";
import type { TouristSheetData } from "@/domain/checkin/tourist-sheet";
import type {
  CheckinGuestInput,
  PaymentStatus,
  BookingForCheckin,
  CheckinSettings,
} from "@/domain/checkin/types";
import type { CheckinTransferOffer } from "@/domain/checkin/identity-result";

export type CheckinWizardContextResult = {
  ok: boolean;
  error?: string;
  booking?: BookingForCheckin;
  settings?: CheckinSettings;
  hasExistingCheckin?: boolean;
  checkedInRooms?: string[];
  roomCheckinComplete?: boolean;
  /** Populat când se editează un check-in existent. */
  editContext?: {
    checkinId: string;
    guests: CheckinGuestInput[];
    paymentStatus: PaymentStatus;
    paymentAmountPaid: number;
    depositAmount: number;
    keysHandedRooms: string[];
    notes: string;
  };
  /** Plată inițială la deschiderea wizard-ului (create sau continuare camere). */
  partialPayment?: {
    paymentStatus: PaymentStatus;
    paymentAmountPaid: number;
    depositAmount: number;
    ledgerCollectedHint?: string;
  };
};

export type CreateCheckinResult = {
  ok: boolean;
  error?: string;
  checkinId?: string;
  ganttBooking?: BookingRow;
  needsTransfer?: boolean;
  transferOffer?: CheckinTransferOffer;
};

export type LoadTouristSheetResult = {
  ok: boolean;
  error?: string;
  data?: TouristSheetData;
};
