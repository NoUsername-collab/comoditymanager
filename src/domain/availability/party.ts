/**
 * Who is travelling. Adults are 18+; every minor is listed by age so the
 * property's child policy can decide who needs a bed of their own.
 */
export type Party = {
  adults: number;
  /** One entry per minor (0–17). `null` = age unknown (bookings made before ages were asked). */
  childAges: (number | null)[];
  /** Parents asked for a separate room for the children. Off by default: children stay with an adult. */
  childrenSeparateRoom: boolean;
};

/**
 * Per-property rules for children. Defaults follow what families expect:
 * a baby sleeps with the parents or in a cot, two children share a bed, and
 * one child may sleep with the parents without a bed of their own.
 */
export type ChildPolicy = {
  /** Ages 0..infantMaxAge are babies: a cot or the parents' bed. `null` = no baby rule. */
  infantMaxAge: number | null;
  /** A baby may sleep in the parents' bed, one per adult. Otherwise a cot (or a bed place). */
  infantsWithParents: boolean;
  /** Ages up to childMaxAge are children; older minors (teens) need a bed like an adult. */
  childMaxAge: number;
  /** Two children may share one bed (a bed place or an extra bed). */
  childrenShareBed: boolean;
  /** One child per room may sleep with the parents and does not use a bed place. */
  childWithParents: boolean;
  /** When a teen is the only minor in the room, they may also stay with the parents. */
  loneTeenWithParents: boolean;
};

export const MAX_MINOR_AGE = 17;
export const MAX_PARTY_ADULTS = 30;
export const MAX_PARTY_CHILDREN = 20;

export const DEFAULT_CHILD_POLICY: ChildPolicy = {
  infantMaxAge: 2,
  infantsWithParents: true,
  childMaxAge: 13,
  childrenShareBed: true,
  childWithParents: true,
  loneTeenWithParents: true,
};

/** How many of each kind of guest go into one room. */
export type PartyGroup = {
  adults: number;
  infants: number;
  children: number;
  teens: number;
  /** Minors whose age is unknown: treated like a teen, never sharing a bed. */
  unknown: number;
};

export type MinorKind = "infant" | "child" | "teen" | "unknown";

export function classifyMinor(age: number | null, policy: ChildPolicy): MinorKind {
  if (age == null) return "unknown";
  if (policy.infantMaxAge != null && age <= policy.infantMaxAge) return "infant";
  if (age <= policy.childMaxAge) return "child";
  return "teen";
}

export function partyGroup(party: Party, policy: ChildPolicy): PartyGroup {
  const group: PartyGroup = {
    adults: party.adults,
    infants: 0,
    children: 0,
    teens: 0,
    unknown: 0,
  };
  for (const age of party.childAges) {
    const kind = classifyMinor(age, policy);
    if (kind === "infant") group.infants += 1;
    else if (kind === "child") group.children += 1;
    else if (kind === "teen") group.teens += 1;
    else group.unknown += 1;
  }
  return group;
}

export function partyHeadcount(party: Party): number {
  return party.adults + party.childAges.length;
}

export function minorCount(group: PartyGroup): number {
  return group.infants + group.children + group.teens + group.unknown;
}

function clampAdults(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_PARTY_ADULTS, Math.max(1, Math.floor(n)));
}

export function isValidChildAge(raw: unknown): raw is number {
  return (
    typeof raw === "number" &&
    Number.isInteger(raw) &&
    raw >= 0 &&
    raw <= MAX_MINOR_AGE
  );
}

/**
 * Ages typed in a form: every child needs an age. Returns null when one is
 * missing or out of range, so the caller can ask for it instead of guessing.
 */
export function parseChildAges(raw: unknown): number[] | null {
  let list: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      list = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(list)) return null;
  if (list.length > MAX_PARTY_CHILDREN) return null;
  const ages: number[] = [];
  for (const entry of list) {
    const n = typeof entry === "string" && entry.trim() !== "" ? Number(entry) : entry;
    if (!isValidChildAge(n)) return null;
    ages.push(n);
  }
  return ages;
}

export function buildParty(input: {
  adults: unknown;
  childAges: (number | null)[];
  childrenSeparateRoom?: boolean;
}): Party {
  return {
    adults: clampAdults(input.adults),
    childAges: input.childAges.slice(0, MAX_PARTY_CHILDREN),
    childrenSeparateRoom: input.childrenSeparateRoom === true,
  };
}

/** Every child has an age (a form may not be sent before). */
export function partyAgesComplete(party: Party): boolean {
  return party.childAges.every((age) => age != null);
}

/**
 * Party sent by a form or an action. Null when an age is missing or invalid:
 * the guest is asked again rather than the stay being guessed.
 */
export function parsePartyInput(input: {
  adults: unknown;
  childAges: unknown;
  childrenSeparateRoom?: unknown;
}): Party | null {
  const ages = parseChildAges(input.childAges ?? []);
  if (ages == null) return null;
  const separate = input.childrenSeparateRoom;
  return buildParty({
    adults: input.adults,
    childAges: ages,
    childrenSeparateRoom: separate === true || separate === "1" || separate === "on",
  });
}

/** Field names shared by every booking form (see PartyHiddenInputs). */
export const PARTY_FORM_FIELDS = {
  adults: "num_adults",
  childAges: "child_ages",
  childrenSeparateRoom: "children_separate_room",
} as const;

export function partyFromFormData(form: { get(name: string): unknown }): Party | null {
  return parsePartyInput({
    adults: form.get(PARTY_FORM_FIELDS.adults),
    childAges: form.get(PARTY_FORM_FIELDS.childAges) ?? "",
    childrenSeparateRoom: form.get(PARTY_FORM_FIELDS.childrenSeparateRoom),
  });
}

/** Party of a stored booking. Rows from before ages were asked keep their children as unknown ages. */
export function partyFromBooking(booking: {
  num_adults: number;
  num_children: number;
  children_ages?: number[] | null;
  children_separate_room?: boolean | null;
}): Party {
  const ages =
    booking.children_ages && booking.children_ages.length === booking.num_children
      ? booking.children_ages
      : Array.from({ length: Math.max(0, booking.num_children) }, () => null);
  return buildParty({
    adults: booking.num_adults,
    childAges: ages,
    childrenSeparateRoom: booking.children_separate_room === true,
  });
}

/**
 * The same family some years later: children are older, and those who turn
 * 18 count as adults. Unknown ages stay unknown.
 */
export function partyYearsLater(party: Party, years: number): Party {
  const shift = Math.max(0, Math.floor(years));
  if (shift === 0) return party;
  let adults = party.adults;
  const childAges: (number | null)[] = [];
  for (const age of party.childAges) {
    if (age == null) {
      childAges.push(null);
    } else if (age + shift > MAX_MINOR_AGE) {
      adults += 1;
    } else {
      childAges.push(age + shift);
    }
  }
  return { ...party, adults, childAges };
}

/** Ages ready to store: `null` when any age is unknown. */
export function storableChildAges(party: Party): number[] | null {
  if (party.childAges.some((age) => age == null)) return null;
  return party.childAges as number[];
}

function clampAge(raw: unknown, fallback: number, max: number): number {
  const n = Number(raw);
  if (!Number.isInteger(n)) return fallback;
  return Math.min(max, Math.max(0, n));
}

export function parseChildPolicyRow(
  row: Record<string, unknown> | null | undefined,
): ChildPolicy {
  if (!row) return DEFAULT_CHILD_POLICY;
  const childMaxAge = clampAge(
    row.child_max_age,
    DEFAULT_CHILD_POLICY.childMaxAge,
    MAX_MINOR_AGE,
  );
  const infantRaw = row.infant_max_age;
  const infantMaxAge =
    infantRaw === null
      ? null
      : infantRaw === undefined
        ? DEFAULT_CHILD_POLICY.infantMaxAge
        : clampAge(infantRaw, DEFAULT_CHILD_POLICY.infantMaxAge ?? 2, 5);
  return {
    infantMaxAge:
      infantMaxAge != null && infantMaxAge >= childMaxAge ? null : infantMaxAge,
    childMaxAge,
    infantsWithParents: bool(row.infants_with_parents, DEFAULT_CHILD_POLICY.infantsWithParents),
    childrenShareBed: bool(row.children_share_bed, DEFAULT_CHILD_POLICY.childrenShareBed),
    childWithParents: bool(row.child_with_parents, DEFAULT_CHILD_POLICY.childWithParents),
    loneTeenWithParents: bool(
      row.lone_teen_with_parents,
      DEFAULT_CHILD_POLICY.loneTeenWithParents,
    ),
  };
}

/** Rules sent by the settings form (camelCase), checked like a stored row. */
export function parseChildPolicyInput(raw: unknown): ChildPolicy | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return parseChildPolicyRow({
    child_max_age: r.childMaxAge,
    infant_max_age: r.infantMaxAge,
    infants_with_parents: r.infantsWithParents,
    children_share_bed: r.childrenShareBed,
    child_with_parents: r.childWithParents,
    lone_teen_with_parents: r.loneTeenWithParents,
  });
}

function bool(raw: unknown, fallback: boolean): boolean {
  return raw == null ? fallback : Boolean(raw);
}
