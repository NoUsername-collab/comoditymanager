import { loadStaysPrimaryData } from "@/services/stays-page-data";
import { resolvePostCheckoutEditPolicy } from "@/services/bookings/post-checkout-guard";

export { buildStayListLabels } from "@/services/stay-labels";

const EMPTY_POST_CHECKOUT_POLICY = {
  memberRole: null,
  allowPostCheckoutEdits: false,
  canEditAfterCheckout: false,
} as const;

export async function loadStaysPage() {
  const [staysResult, postCheckoutPolicy] = await Promise.all([
    loadStaysPrimaryData(),
    resolvePostCheckoutEditPolicy().catch(() => EMPTY_POST_CHECKOUT_POLICY),
  ]);
  return { staysResult, postCheckoutPolicy };
}
