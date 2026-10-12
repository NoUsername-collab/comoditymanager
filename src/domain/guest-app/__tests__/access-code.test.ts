import { describe, expect, it } from "vitest";
import { accessCodeCandidates } from "@/domain/guest-app/access-code";

describe("accessCodeCandidates", () => {
  it("looks a code up as typed and lower-cased", () => {
    expect(accessCodeCandidates(" AbC123-_xyz ")).toEqual(["AbC123-_xyz", "abc123-_xyz"]);
  });

  it("rejects LIKE wildcards and other characters", () => {
    for (const raw of ["%", "a%", "abc%def", "a b c d e f", "../../etc", "", "abc"]) {
      expect(accessCodeCandidates(raw)).toBeNull();
    }
  });
});
