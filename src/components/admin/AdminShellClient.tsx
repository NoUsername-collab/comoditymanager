"use client";

import { AdminFlashFromUrl } from "@/components/admin/feedback/AdminFlashFromUrl";
import { AdminToastProvider } from "@/components/admin/feedback/AdminToastProvider";

export function AdminShellClient({ children }: { children: React.ReactNode }) {
  return (
    <AdminToastProvider>
      <AdminFlashFromUrl />
      {children}
    </AdminToastProvider>
  );
}
