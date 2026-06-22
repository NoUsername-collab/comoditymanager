import { describe, expect, it } from "vitest";
import { formatTransactionalFromAddress } from "@/domain/email/from-address";

describe("formatTransactionalFromAddress", () => {
  it("formats display name and domain", () => {
    expect(formatTransactionalFromAddress("Casa Emil", "hospira.ro")).toBe(
      "Casa Emil <noreply@hospira.ro>",
    );
  });

  it("strips unsafe characters from display name", () => {
    expect(formatTransactionalFromAddress('Bad <"name>', "pensiune.ro")).toBe(
      "Bad name <noreply@pensiune.ro>",
    );
  });
});
