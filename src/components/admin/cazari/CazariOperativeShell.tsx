"use client";

import type { ReactNode } from "react";
import { OperativeCheckProvider } from "@/components/admin/operative/OperativeCheckProvider";

export function CazariOperativeShell({
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
