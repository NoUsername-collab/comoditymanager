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
}: {
  children: ReactNode;
  today: string;
}) {
  return (
    <OperativeCheckProvider today={today}>{children}</OperativeCheckProvider>
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
