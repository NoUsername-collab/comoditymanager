import { describe, expect, it } from "vitest";
import { formatTransactionalFromAddress } from "@/domain/email/from-address";

describe("formatTransactionalFromAddress", () => {
  it("formats display name and domain", () => {
    expect(formatTransactionalFromAddress("Casa Emil", "nestio.ro")).toBe(
      "Casa Emil <noreply@nestio.ro>",
    );
  });

  it("strips unsafe characters from display name", () => {
    expect(formatTransactionalFromAddress('Bad <"name>', "pensiune.ro")).toBe(
      "Bad name <noreply@pensiune.ro>",
    );
  });
});
