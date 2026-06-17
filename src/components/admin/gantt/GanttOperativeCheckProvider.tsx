"use client";

import type { ReactNode } from "react";
import {
  OperativeCheckProvider,
  useOperativeCheck,
  type OperativeCheckRequest,
} from "@/components/admin/operative/OperativeCheckProvider";

/** @deprecated Prefer OperativeCheckProvider — păstrat pentru Gantt. */
export type { OperativeCheckRequest };

export function GanttOperativeCheckProvider({
  children,
  today,
  canEditAfterCheckout = false,
}: {
  children: ReactNode;
  today: string;
  canEditAfterCheckout?: boolean;
}) {
  return (
    <OperativeCheckProvider
      today={today}
      canEditAfterCheckout={canEditAfterCheckout}
    >
      {children}
    </OperativeCheckProvider>
  );
}

export function useGanttOperativeCheck() {
  const ops = useOperativeCheck();
  return {
    today: ops.today,
    requestCheckIn: ops.openCheckInWizard,
    requestCheckOut: ops.openCheckOut,
  };
}
