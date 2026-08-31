"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckinModal } from "@/features/checkin/ui/CheckinModal";
import type { BookingForCheckin, CheckinSettings } from "@/domain/checkin/types";

type Props = {
  booking: BookingForCheckin;
  settings: CheckinSettings;
  hasExistingCheckin: boolean;
};

/** Check-in doar în ziua planificată de sosire, pentru cazări confirmate fără check-in înregistrat. */
export function BookingCheckinButton({
  booking,
  settings,
  hasExistingCheckin,
}: Props) {
  const t = useTranslations("admin.checkIn");
  const [open, setOpen] = useState(false);

  if (hasExistingCheckin) return null;
  if (booking.status !== "confirmata") return null;

  // Only show check-in button on the check-in date
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (todayStr !== booking.check_in) return null;

  return (
    <>
      <button
        type="button"
        className="checkin-start-btn"
        onClick={() => setOpen(true)}
      >
        <span className="checkin-start-btn__icon">🔑</span>
        {t("startCheckin")}
      </button>

      {open && (
        <CheckinModal
          booking={booking}
          settings={settings}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
