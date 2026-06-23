import type { ComputedDay } from "@/domain/availability/compute";

/** Single day in an availability grid — alias keeps domain modules decoupled from services. */
export type DayAvailability = ComputedDay;
