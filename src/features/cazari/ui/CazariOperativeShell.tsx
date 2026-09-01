"use client";

import type { ReactNode } from "react";
import { OperativeCheckProvider } from "@/features/checkin/ui/OperativeCheckProvider";

export function CazariOperativeShell({
  children,
  today,
  canEditAfterCheckout = false,
}: {
  children: ReactNode;
  today: string;
  canEditAfterCheckout?: boolean;
}) {
  return (
    <OperativeCheckProvider today={today} canEditAfterCheckout={canEditAfterCheckout}>
      {children}
    </OperativeCheckProvider>
  );
}
