import type { OccupancyKind } from "@/domain/occupancy/types";

/**
 * Reception writes (Gantt, cazări, confirm): near-instant UI, blocking
 * checks only where a large PMS would refuse the save.
 *
 * Blocking: staff, one-night stay, name+phone, occupancy on those rooms
 * (stay / request / hold / block), lifecycle (not already confirmed).
 *
 * After the response: guest profile match, alerts, activity log,
 * guest-app access, email, other admin page caches.
 */
export const RECEPTION_OCCUPANCY_KINDS: OccupancyKind[] = [
  "hold",
  "request",
  "stay",
  "block",
];
