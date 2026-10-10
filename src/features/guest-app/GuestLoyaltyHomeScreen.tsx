import type { GuestLoyaltySnapshot } from "@/services/guest-app/loyalty";
import { GuestLoyaltyCard } from "@/features/guest-app/GuestLoyaltyCard";
import { GuestLoyaltyRemember } from "@/features/guest-app/GuestLoyaltyRemember";
import { GuestInstallHint } from "@/features/guest-app/GuestInstallHint";
import { getTranslations } from "next-intl/server";

type Props = {
  snapshot: GuestLoyaltySnapshot;
  pensionName: string;
};

export async function GuestLoyaltyHomeScreen({ snapshot, pensionName }: Props) {
  const t = await getTranslations("guestApp.loyalty");
  const firstName = snapshot.guestName.trim().split(/\s+/)[0] || snapshot.guestName;

  return (
    <div className="space-y-6">
      <GuestLoyaltyRemember reference={snapshot.reference} />
      <section className="guest-app__hero">
        <p className="guest-app__hero__eyebrow">
          {t("welcomeBack")}, {firstName}
        </p>
        <h1 className="guest-app__hero__title">{pensionName}</h1>
        <p className="guest-app__hero__desc">{t("homeLead")}</p>
      </section>
      <GuestLoyaltyCard snapshot={snapshot} pensionName={pensionName} />
      <GuestInstallHint variant="loyalty" />
    </div>
  );
}
