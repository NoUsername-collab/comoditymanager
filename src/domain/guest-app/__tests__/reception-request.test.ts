import { describe, expect, it } from "vitest";
import { guestReceptionRequestInputSchema } from "@/domain/guest-app/stay-action-schemas";

describe("guestReceptionRequestInputSchema", () => {
  it("accepts a short note", () => {
    const parsed = guestReceptionRequestInputSchema.safeParse({
      accessCode: "abcd1234",
      message: "  Prosoape, vă rog  ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.message).toBe("Prosoape, vă rog");
  });

  it("rejects a one-character note", () => {
    expect(
      guestReceptionRequestInputSchema.safeParse({
        accessCode: "abcd1234",
        message: "a",
      }).success,
    ).toBe(false);
  });
});
