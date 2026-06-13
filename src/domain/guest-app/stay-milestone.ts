export type GuestStayMilestoneId = "confirmed" | "checked_in" | "checked_out";

export type GuestStayMilestoneStepState = "done" | "current" | "upcoming";

export type GuestStayMilestoneStep = {
  id: GuestStayMilestoneId;
  label: string;
  state: GuestStayMilestoneStepState;
};

const LABELS: Record<GuestStayMilestoneId, string> = {
  confirmed: "Confirmată",
  checked_in: "Check-in",
  checked_out: "Check-out",
};

const ORDER: GuestStayMilestoneId[] = ["confirmed", "checked_in", "checked_out"];

/** Faza curentă a sejurului (cât timp guest app e accesibilă). */
export function resolveGuestStayPhase(input: {
  today: string;
  checkIn: string;
  checkOut: string;
  checkedInAt: string | null;
}): GuestStayMilestoneId {
  if (input.today > input.checkOut) return "checked_out";
  if (input.today === input.checkOut && input.checkedInAt) return "checked_out";
  if (input.checkedInAt) return "checked_in";
  return "confirmed";
}

export function buildGuestStayMilestones(input: {
  today: string;
  checkIn: string;
  checkOut: string;
  checkedInAt: string | null;
}): GuestStayMilestoneStep[] {
  const current = resolveGuestStayPhase(input);
  const currentIdx = ORDER.indexOf(current);

  return ORDER.map((id, idx) => ({
    id,
    label: LABELS[id],
    state:
      idx < currentIdx ? "done" : idx === currentIdx ? "current" : "upcoming",
  }));
}

export type GuestPhaseHintKey =
  | "phase.confirmed"
  | "phase.checkinToday"
  | "phase.checkedIn"
  | "phase.checkoutToday"
  | "phase.checkedOut";

export function resolveGuestPhaseHintKey(input: {
  today: string;
  checkIn: string;
  checkOut: string;
  checkedInAt: string | null;
}): GuestPhaseHintKey {
  const phase = resolveGuestStayPhase(input);
  if (phase === "checked_out") return "phase.checkedOut";
  if (input.today === input.checkOut) return "phase.checkoutToday";
  if (phase === "checked_in") return "phase.checkedIn";
  if (input.today === input.checkIn) return "phase.checkinToday";
  return "phase.confirmed";
}

export function countStayNights(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T12:00:00`);
  const end = new Date(`${checkOut}T12:00:00`);
  const nights = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, nights);
}
