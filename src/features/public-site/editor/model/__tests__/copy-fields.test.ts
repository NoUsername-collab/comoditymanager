import { describe, expect, it } from "vitest";
import { buildPublicSiteConfigFromInput } from "@/domain/public-site/resolve-config";
import { EMPTY_PENSION_CONTACT } from "@/domain/settings/pension-identity";
import { buildDefaultPublicSiteConfig } from "@/features/public-site/domain/defaults";
import { seedPublicHomeCopy } from "@/features/public-site/domain/seed-copy";
import { PUBLIC_LOCALES } from "@/features/public-site/domain/types";
import {
  CHROME_COPY,
  HERO_COPY,
  PAGES_COPY,
  readFlatCopy,
  SEO_COPY,
  type FlatCopyKey,
} from "@/features/public-site/editor/model/copy-fields";
import {
  buildPublicSiteStudioDraft,
  mergeStudioToInput,
} from "@/features/public-site/editor/model/studio-draft";

const ALL_KEYS = [
  ...Object.keys(HERO_COPY),
  ...Object.keys(SEO_COPY),
  ...Object.keys(CHROME_COPY),
  ...Object.keys(PAGES_COPY),
] as FlatCopyKey[];

describe("copy fields", () => {
  it("saves every single-line field and reads it back, in every language", () => {
    const config = buildDefaultPublicSiteConfig({
      displayName: "Casa Test",
      checkInTime: "14:00",
      checkOutTime: "11:00",
      copy: seedPublicHomeCopy(),
    });
    const draft = buildPublicSiteStudioDraft(config, "ro");
    for (const locale of PUBLIC_LOCALES) {
      for (const key of ALL_KEYS) draft.copies[locale][key] = `${key} ${locale}`;
    }

    const saved = buildPublicSiteConfigFromInput(
      config,
      mergeStudioToInput({ config, draft }),
      EMPTY_PENSION_CONTACT,
    );

    for (const locale of PUBLIC_LOCALES) {
      const read = readFlatCopy(saved, locale);
      for (const key of ALL_KEYS) expect(read[key]).toBe(`${key} ${locale}`);
    }
  });
});
