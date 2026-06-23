import { resolveContactWithPrimary } from "@/domain/settings/pension-identity";
import type { PensionContact } from "@/domain/settings/pension-identity";
import type { PublicContactConfig } from "@/features/public-site/domain/types";

export function resolvePreviewContact(
  primary: PensionContact,
  override: PublicContactConfig,
  usePrimary: boolean,
): PublicContactConfig {
  return resolveContactWithPrimary(primary, override, usePrimary);
}
