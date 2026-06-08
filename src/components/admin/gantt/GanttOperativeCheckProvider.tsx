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
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { GanttCheckTimeDialog } from "@/components/admin/gantt/GanttCheckTimeDialog";

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

type CheckDialogState = OperativeCheckRequest & {
  mode: "checkin" | "checkout";
  intent: "set" | "edit";
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
  const [dialog, setDialog] = useState<CheckDialogState | null>(null);

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

      setDialog({
        ...args,
        mode: "checkin",
        intent: "set",
      });
      return true;
    },
    [today, showToast, tGantt, tServer]
  );

  const requestCheckOut = useCallback((args: OperativeCheckRequest) => {
    setDialog({
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
      {dialog && (
        <GanttCheckTimeDialog
          open
          mode={dialog.mode}
          intent={dialog.intent}
          bookingId={dialog.bookingId}
          guestName={dialog.guestName}
          plannedCheckIn={dialog.plannedCheckIn}
          plannedCheckOut={dialog.plannedCheckOut}
          today={dialog.today ?? today}
          status={dialog.status}
          actualCheckInAt={dialog.actualCheckInAt}
          actualCheckOutAt={dialog.actualCheckOutAt}
          onClose={() => setDialog(null)}
          onSuccess={() => router.refresh()}
        />
      )}
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
