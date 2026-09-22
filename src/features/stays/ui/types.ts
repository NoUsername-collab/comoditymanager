import type { StayPageLists } from "@/services/stays-page-data";

export type { StayListLabels } from "@/domain/stays/labels";

export type OperationalStay = StayPageLists["stays"][number];
export type HistoryStay = StayPageLists["history"][number];
export type CancelledStay = StayPageLists["cancelledHistory"][number];
export type StayCardRow = OperationalStay | CancelledStay;
export type StayListVariant = "requests" | "confirmed" | "cancelled";
