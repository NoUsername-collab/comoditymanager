import { GuestLoyaltyHomeScreen } from "@/features/guest-app/GuestLoyaltyHomeScreen";
import { loadGuestLoyaltyLayout } from "@/features/guest-app/loaders";

export default async function GuestLoyaltyRefPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const loaded = await loadGuestLoyaltyLayout(ref);
  if (!loaded.loyalty.ok) return null;

  return (
    <GuestLoyaltyHomeScreen
      snapshot={loaded.loyalty.snapshot}
      pensionName={loaded.pensionName}
    />
  );
}
