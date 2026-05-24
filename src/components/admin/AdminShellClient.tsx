"use client";

import { AdminFlashFromUrl } from "@/components/admin/feedback/AdminFlashFromUrl";
import { AdminPendingProvider } from "@/components/admin/feedback/AdminPendingProvider";
import { AdminToastProvider } from "@/components/admin/feedback/AdminToastProvider";

export function AdminShellClient({ children }: { children: React.ReactNode }) {
  return (
    <AdminPendingProvider>
      <AdminToastProvider>
        <AdminFlashFromUrl />
        {children}
      </AdminToastProvider>
    </AdminPendingProvider>
  );
}
