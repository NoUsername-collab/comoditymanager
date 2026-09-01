import { loadCazariPrimaryData } from "@/services/cazari-page-data";
import { resolvePostCheckoutEditPolicy } from "@/services/bookings/post-checkout-guard";

export { buildCazariLabels } from "@/services/cazari-labels";

const EMPTY_POST_CHECKOUT_POLICY = {
  memberRole: null,
  allowPostCheckoutEdits: false,
  canEditAfterCheckout: false,
} as const;

export async function loadCazariPage() {
  const [cazariResult, postCheckoutPolicy] = await Promise.all([
    loadCazariPrimaryData(),
    resolvePostCheckoutEditPolicy().catch(() => EMPTY_POST_CHECKOUT_POLICY),
  ]);
  return { cazariResult, postCheckoutPolicy };
}
