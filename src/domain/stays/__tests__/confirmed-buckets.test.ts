import { describe, expect, it } from "vitest";
import {
  groupConfirmedStays,
  isConfirmedBucketExpandedByDefault,
} from "@/domain/cazari/confirmed-buckets";

describe("isConfirmedBucketExpandedByDefault", () => {
  it("expands only today when not searching", () => {
    expect(isConfirmedBucketExpandedByDefault("today", false)).toBe(true);
    expect(isConfirmedBucketExpandedByDefault("week", false)).toBe(false);
    expect(isConfirmedBucketExpandedByDefault("month", false)).toBe(false);
    expect(isConfirmedBucketExpandedByDefault("upcoming", false)).toBe(false);
  });

  it("expands all buckets while a search query is active", () => {
    for (const key of ["today", "week", "month", "upcoming"] as const) {
      expect(isConfirmedBucketExpandedByDefault(key, true)).toBe(true);
    }
  });
});

describe("groupConfirmedStays", () => {
  it("places in-house stays in today bucket", () => {
    const buckets = groupConfirmedStays(
      [{ check_in: "2026-06-20", check_out: "2026-06-25" }],
      "2026-06-23"
    );
    expect(buckets.find((b) => b.key === "today")?.stays).toHaveLength(1);
  });
});
