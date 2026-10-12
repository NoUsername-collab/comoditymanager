import { describe, expect, it } from "vitest";
import { auditMissingTranslationKeys } from "@/lib/architecture/i18n-keys";

describe("translation keys", () => {
  it("every literal key used in code exists in ro, en and bg", () => {
    const missing = auditMissingTranslationKeys();
    if (missing.length > 0) {
      const report = missing.map((m) => `  ${m.file}: ${m.locale} ${m.key}`).join("\n");
      expect.fail(`Missing translations (${missing.length}):\n${report}`);
    }
  });
}, 60_000);
