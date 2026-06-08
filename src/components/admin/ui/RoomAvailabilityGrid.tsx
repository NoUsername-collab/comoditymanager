import type { ReactNode } from "react";

/** Grid compact, delimitat — pătrate ~36px */
export function RoomAvailabilityGrid({ children }: { children: ReactNode }) {
  return (
    <div className="room-availability-grid rounded-xl border border-zinc-200 bg-zinc-50/60 p-2 ring-1 ring-inset ring-zinc-200/80">
      <div className="room-availability-grid__inner grid grid-cols-[repeat(auto-fill,2.25rem)] gap-1.5">
        {children}
      </div>
    </div>
  );
}
