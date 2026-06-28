import { PublicCalendarSkeleton } from "@/components/public/PublicPageSkeleton";

export default function CalendarLoading() {
  return (
    <div aria-busy="true" aria-label="Se încarcă calendarul...">
      <PublicCalendarSkeleton />
    </div>
  );
}
