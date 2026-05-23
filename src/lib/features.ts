import { RELEASE_CHANNEL } from "@/lib/app-version";

/** Doar facturarea neoficială rămâne în canalul alpha (v0.1.5). */
export function isInvoicingAlphaEnabled(): boolean {
  return RELEASE_CHANNEL === "alpha";
}
