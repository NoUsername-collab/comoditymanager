import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHILD_POLICY,
  buildParty,
  classifyMinor,
  parseChildAges,
  parseChildPolicyRow,
  partyFromBooking,
  partyGroup,
  partyYearsLater,
  partyFromFormData,
  storableChildAges,
} from "@/domain/availability/party";

describe("classifyMinor", () => {
  it("sorts minors into babies, children and teens", () => {
    expect(classifyMinor(0, DEFAULT_CHILD_POLICY)).toBe("infant");
    expect(classifyMinor(2, DEFAULT_CHILD_POLICY)).toBe("infant");
    expect(classifyMinor(3, DEFAULT_CHILD_POLICY)).toBe("child");
    expect(classifyMinor(13, DEFAULT_CHILD_POLICY)).toBe("child");
    expect(classifyMinor(14, DEFAULT_CHILD_POLICY)).toBe("teen");
    expect(classifyMinor(null, DEFAULT_CHILD_POLICY)).toBe("unknown");
  });

  it("treats babies as children when the property has no baby rule", () => {
    expect(classifyMinor(1, { ...DEFAULT_CHILD_POLICY, infantMaxAge: null })).toBe("child");
  });
});

describe("parseChildAges", () => {
  it("reads ages from JSON or arrays", () => {
    expect(parseChildAges("[3, 12]")).toEqual([3, 12]);
    expect(parseChildAges(["0", 17])).toEqual([0, 17]);
    expect(parseChildAges("")).toEqual([]);
  });

  it("refuses missing or adult ages instead of guessing", () => {
    expect(parseChildAges("[3, null]")).toBeNull();
    expect(parseChildAges([18])).toBeNull();
    expect(parseChildAges([-1])).toBeNull();
    expect(parseChildAges(["", 4])).toBeNull();
    expect(parseChildAges("nope")).toBeNull();
  });
});

describe("partyFromBooking", () => {
  it("uses stored ages", () => {
    const party = partyFromBooking({ num_adults: 2, num_children: 2, children_ages: [4, 15] });
    expect(party.childAges).toEqual([4, 15]);
    expect(partyGroup(party, DEFAULT_CHILD_POLICY)).toMatchObject({ children: 1, teens: 1 });
  });

  it("keeps older bookings' children as unknown ages", () => {
    const party = partyFromBooking({ num_adults: 2, num_children: 1, children_ages: null });
    expect(party.childAges).toEqual([null]);
    expect(storableChildAges(party)).toBeNull();
  });

  it("never has fewer than one adult", () => {
    expect(buildParty({ adults: 0, childAges: [] }).adults).toBe(1);
  });
});

describe("parseChildPolicyRow", () => {
  it("falls back to the defaults", () => {
    expect(parseChildPolicyRow(null)).toEqual(DEFAULT_CHILD_POLICY);
    expect(parseChildPolicyRow({})).toEqual(DEFAULT_CHILD_POLICY);
  });

  it("reads stored rules and drops a baby limit above the child limit", () => {
    expect(
      parseChildPolicyRow({
        child_max_age: 11,
        infant_max_age: null,
        infants_with_parents: false,
        children_share_bed: false,
        child_with_parents: true,
        lone_teen_with_parents: false,
      }),
    ).toEqual({
      infantMaxAge: null,
      infantsWithParents: false,
      childMaxAge: 11,
      childrenShareBed: false,
      childWithParents: true,
      loneTeenWithParents: false,
    });
    expect(parseChildPolicyRow({ child_max_age: 2, infant_max_age: 3 }).infantMaxAge).toBeNull();
  });
});

describe("partyYearsLater", () => {
  it("ages the children and counts 18-year-olds as adults", () => {
    const later = partyYearsLater(
      { adults: 2, childAges: [4, 17, null], childrenSeparateRoom: false },
      1,
    );
    expect(later).toEqual({ adults: 3, childAges: [5, null], childrenSeparateRoom: false });
  });
});

describe("partyFromFormData", () => {
  function form(entries: Record<string, string>) {
    return { get: (name: string) => entries[name] ?? null };
  }

  it("reads adults, ages and the separate-room wish", () => {
    expect(
      partyFromFormData(
        form({ num_adults: "2", child_ages: "[4,15]", children_separate_room: "1" }),
      ),
    ).toEqual({ adults: 2, childAges: [4, 15], childrenSeparateRoom: true });
    expect(partyFromFormData(form({ num_adults: "1" }))).toEqual({
      adults: 1,
      childAges: [],
      childrenSeparateRoom: false,
    });
  });

  it("refuses a child without an age", () => {
    expect(partyFromFormData(form({ num_adults: "2", child_ages: "[4,null]" }))).toBeNull();
  });
});
