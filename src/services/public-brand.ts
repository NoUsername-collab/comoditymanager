import { cache } from "react";
import { getPensionSettings } from "@/services/pension-settings";

/** Pension display name for public chrome — deduped when header + footer load together. */
export const getPublicPensionDisplayName = cache(
  async (fallback: string): Promise<string> => {
    try {
      const settings = await getPensionSettings();
      return settings?.display_name?.trim() || fallback;
    } catch {
      return fallback;
    }
  }
);
