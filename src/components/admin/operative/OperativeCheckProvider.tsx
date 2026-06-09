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
import { CheckinWizardLauncher } from "@/components/admin/checkin/CheckinWizardLauncher";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";

const GanttCheckTimeDialog = dynamic(
  () =>
    import("@/components/admin/gantt/GanttCheckTimeDialog").then((m) => ({
      default: m.GanttCheckTimeDialog,
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
};

type CheckoutDialogState = OperativeCheckRequest & {
  mode: "checkout";
  intent: "set";
};

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
  const [checkoutDialog, setCheckoutDialog] =
    useState<CheckoutDialogState | null>(null);

  const openCheckInWizard = useCallback(
    (args: OperativeCheckRequest): boolean => {
      const effectiveToday = args.today ?? today;
      const status = args.status ?? "confirmata";

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

      setCheckinBookingId(args.bookingId);
      return true;
    },
    [today, showToast, tGantt, tServer]
  );

  const openCheckOut = useCallback((args: OperativeCheckRequest) => {
    setCheckoutDialog({
      ...args,
      mode: "checkout",
      intent: "set",
    });
  }, []);

  const closeCheckinWizard = useCallback(() => setCheckinBookingId(null), []);
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
          onClose={closeCheckinWizard}
          onSuccess={refreshAfterCheckin}
        />
      ) : null}
      {checkoutDialog ? (
        <GanttCheckTimeDialog
          open
          mode={checkoutDialog.mode}
          intent={checkoutDialog.intent}
          bookingId={checkoutDialog.bookingId}
          guestName={checkoutDialog.guestName}
          plannedCheckIn={checkoutDialog.plannedCheckIn}
          plannedCheckOut={checkoutDialog.plannedCheckOut}
          today={checkoutDialog.today ?? today}
          status={checkoutDialog.status}
          actualCheckInAt={checkoutDialog.actualCheckInAt}
          actualCheckOutAt={checkoutDialog.actualCheckOutAt}
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
