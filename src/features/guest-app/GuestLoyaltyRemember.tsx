"use client";

import { useEffect } from "react";
import { GUEST_LOYALTY_STORAGE_KEY } from "@/lib/guest-app/loyalty-storage";

export function GuestLoyaltyRemember({ reference }: { reference: string }) {
  useEffect(() => {
    try {
      window.localStorage.setItem(GUEST_LOYALTY_STORAGE_KEY, reference);
    } catch {
      /* private mode */
    }
  }, [reference]);
  return null;
}
