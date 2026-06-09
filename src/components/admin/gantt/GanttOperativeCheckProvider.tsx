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
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";

const GanttCheckTimeDialog = dynamic(
  () =>
    import("@/components/admin/gantt/GanttCheckTimeDialog").then((m) => ({
      default: m.GanttCheckTimeDialog,
    })),
  { ssr: false }
);

const CheckinWizardLauncher = dynamic(
  () =>
    import("@/components/admin/checkin/CheckinWizardLauncher").then((m) => ({
      default: m.CheckinWizardLauncher,
    })),
  { ssr: false }
);

type OperativeCheckRequest = {
  bookingId: string;
  guestName: string;
  plannedCheckIn: string;
  plannedCheckOut: string;
  status?: string;
  actualCheckInAt?: string | null;
  actualCheckOutAt?: string | null;
  today?: string;
};

type CheckoutDialogState = OperativeCheckRequest & {
  mode: "checkout";
  intent: "set";
};

type GanttOperativeCheckOps = {
  today: string;
  requestCheckIn: (args: OperativeCheckRequest) => boolean;
  requestCheckOut: (args: OperativeCheckRequest) => void;
};

const Ctx = createContext<GanttOperativeCheckOps | null>(null);

export function GanttOperativeCheckProvider({
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

  const requestCheckIn = useCallback(
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

  const requestCheckOut = useCallback((args: OperativeCheckRequest) => {
    setCheckoutDialog({
      ...args,
      mode: "checkout",
      intent: "set",
    });
  }, []);

  const value = useMemo(
    () => ({ today, requestCheckIn, requestCheckOut }),
    [today, requestCheckIn, requestCheckOut]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {checkinBookingId ? (
        <CheckinWizardLauncher
          bookingId={checkinBookingId}
          open
          onClose={() => setCheckinBookingId(null)}
          onSuccess={() => router.refresh()}
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

export function useGanttOperativeCheck(): GanttOperativeCheckOps {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "useGanttOperativeCheck must be used within GanttOperativeCheckProvider"
    );
  }
  return ctx;
}
