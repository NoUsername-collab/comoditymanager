import type { CazariPageLists } from "@/services/cazari-page-data";

export type { CazariLabels } from "@/domain/cazari/labels";

export type OperationalStay = CazariPageLists["stays"][number];
export type HistoryStay = CazariPageLists["history"][number];
export type CancelledStay = CazariPageLists["cancelledHistory"][number];
export type StayCardRow = OperationalStay | CancelledStay;
