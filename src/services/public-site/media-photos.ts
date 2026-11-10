import { publicMediaPhoto } from "@/features/public-site/domain/gallery";
import type { PublicMediaPhoto } from "@/features/public-site/domain/types";
import { listMediaForTenant } from "@/services/media-library";

/** The photo library as the public pages show it; none when it cannot be read. */
export async function loadPublicMedia(tenantId: string): Promise<PublicMediaPhoto[]> {
  try {
    return (await listMediaForTenant(tenantId)).map(publicMediaPhoto);
  } catch {
    return [];
  }
}
