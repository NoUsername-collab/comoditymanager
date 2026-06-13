"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { canOfferOperativeCheckIn } from "@/domain/booking/operative-checkin";
import dynamic from "next/dynamic";
import {
  CheckinWizardLauncher,
  type CheckinWizardMode,
} from "@/components/admin/checkin/CheckinWizardLauncher";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";

const BookingCheckoutPanel = dynamic(
  () =>
    import("@/components/admin/checkout/BookingCheckoutPanel").then((m) => ({
      default: m.BookingCheckoutPanel,
    })),
  { ssr: false }
);

export type OperativeCheckRequest = {
  bookingId: string;
  guestName: string;
  plannedCheckIn: string;
  plannedCheckOut: string;
  status?: string;
  actualCheckInAt?: string | null;
  actualCheckOutAt?: string | null;
  hasCheckinRecord?: boolean;
  roomNames?: string[];
  checkedInRooms?: string[];
  today?: string;
  /** Deschide wizard-ul în mod editare (check-in deja înregistrat). */
  editExisting?: boolean;
};

type CheckoutDialogState = OperativeCheckRequest;

export type OperativeCheckOps = {
  today: string;
  /** Deschide wizard-ul complet de check-in (identitate → plată → fișă). */
  openCheckInWizard: (args: OperativeCheckRequest) => boolean;
  /** Check-out operațional (doar ora). */
  openCheckOut: (args: OperativeCheckRequest) => void;
};

const Ctx = createContext<OperativeCheckOps | null>(null);

export function OperativeCheckProvider({
  children,
  today,
}: {
  children: ReactNode;
  today: string;
}) {
  const router = useRouter();
  const { showToast } = useAdminFx();
  const tGantt = useTranslations("admin.gantt");
  const tServer = useTranslations("admin.serverActions");
  const [checkinBookingId, setCheckinBookingId] = useState<string | null>(null);
  const [checkinWizardMode, setCheckinWizardMode] =
    useState<CheckinWizardMode>("create");
  const [checkoutDialog, setCheckoutDialog] =
    useState<CheckoutDialogState | null>(null);

  const openCheckInWizard = useCallback(
    (args: OperativeCheckRequest): boolean => {
      const effectiveToday = args.today ?? today;
      const status = args.status ?? "confirmata";

      if (args.editExisting) {
        setCheckinWizardMode("edit");
        setCheckinBookingId(args.bookingId);
        return true;
      }

      if (
        !canOfferOperativeCheckIn({
          status,
          plannedCheckIn: args.plannedCheckIn,
          today: effectiveToday,
          actualCheckInAt: args.actualCheckInAt,
          actualCheckOutAt: args.actualCheckOutAt,
          hasCheckinRecord: args.hasCheckinRecord,
          roomNames: args.roomNames,
          checkedInRooms: args.checkedInRooms,
        })
      ) {
        showToast({
          kind: "info",
          title: tGantt("checkTime.confirmCheckIn"),
          message: tServer("checkInOnlyOnArrivalDay"),
        });
        return false;
      }

      setCheckinWizardMode("create");
      setCheckinBookingId(args.bookingId);
      return true;
    },
    [today, showToast, tGantt, tServer]
  );

  const openCheckOut = useCallback((args: OperativeCheckRequest) => {
    setCheckoutDialog(args);
  }, []);

  const closeCheckinWizard = useCallback(() => {
    setCheckinBookingId(null);
    setCheckinWizardMode("create");
  }, []);
  const refreshAfterCheckin = useCallback(() => router.refresh(), [router]);

  const value = useMemo(
    () => ({ today, openCheckInWizard, openCheckOut }),
    [today, openCheckInWizard, openCheckOut]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {checkinBookingId ? (
        <CheckinWizardLauncher
          bookingId={checkinBookingId}
          open
          mode={checkinWizardMode}
          onClose={closeCheckinWizard}
          onSuccess={refreshAfterCheckin}
        />
      ) : null}
      {checkoutDialog ? (
        <BookingCheckoutPanel
          open
          bookingId={checkoutDialog.bookingId}
          guestName={checkoutDialog.guestName}
          plannedCheckIn={checkoutDialog.plannedCheckIn}
          plannedCheckOut={checkoutDialog.plannedCheckOut}
          onClose={() => setCheckoutDialog(null)}
          onSuccess={() => router.refresh()}
        />
      ) : null}
    </Ctx.Provider>
  );
}

export function useOperativeCheck(): OperativeCheckOps {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "useOperativeCheck must be used within OperativeCheckProvider"
    );
  }
  return ctx;
}
