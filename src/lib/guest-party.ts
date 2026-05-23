export function guestPartyTotal(adults: number, children: number): number {
  return adults + children;
}

/** ex. „3 pers.” */
export function formatGuestPartyShort(adults: number, children: number): string {
  const n = guestPartyTotal(adults, children);
  return `${n} pers.`;
}

/** ex. „2 ad. + 1 cop.” — pentru tooltip / detalii */
export function formatGuestPartyDetail(adults: number, children: number): string {
  if (children === 0) return `${adults} adulți`;
  return `${adults} ad. + ${children} cop.`;
}
