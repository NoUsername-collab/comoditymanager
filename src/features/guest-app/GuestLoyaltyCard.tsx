import type { GuestLoyaltySnapshot } from "@/services/guest-app/loyalty";
import { GuestAppCopyField } from "@/features/guest-app/GuestAppCopyField";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

type Props = {
  snapshot: GuestLoyaltySnapshot;
  pensionName: string;
  showBookAgain?: boolean;
};

export async function GuestLoyaltyCard({
  snapshot,
  pensionName,
  showBookAgain = true,
}: Props) {
  const t = await getTranslations("guestApp.loyalty");
  const hasPerkCopy =
    snapshot.perkTitle.trim().length > 0 ||
    snapshot.perkDescription.trim().length > 0;
  const showProgress = snapshot.nightsForPerk > 0;

  return (
    <section className="guest-loyalty-card" aria-labelledby="guest-loyalty-title">
      <p className="guest-loyalty-card__eyebrow">{t("eyebrow")}</p>
      <h2 className="guest-loyalty-card__title" id="guest-loyalty-title">
        {t("title", { name: pensionName })}
      </h2>
      <p className="guest-loyalty-card__lead">{t("lead")}</p>

      <GuestAppCopyField label={t("referenceLabel")} value={snapshot.reference} />

      <dl className="guest-loyalty-card__stats">
        <div>
          <dt>{t("stays")}</dt>
          <dd>{snapshot.completedStays}</dd>
        </div>
        <div>
          <dt>{t("nights")}</dt>
          <dd>{snapshot.totalNights}</dd>
        </div>
      </dl>

      {showProgress ? (
        <p className="guest-loyalty-card__progress">
          {snapshot.perkUnlocked
            ? t("perkUnlocked")
            : t("nightsToPerk", { count: snapshot.nightsRemaining })}
        </p>
      ) : null}

      {snapshot.perkUnlocked && hasPerkCopy ? (
        <div className="guest-loyalty-card__perk">
          {snapshot.perkTitle.trim() ? (
            <p className="guest-loyalty-card__perk-title">{snapshot.perkTitle}</p>
          ) : null}
          {snapshot.perkDescription.trim() ? (
            <p className="guest-loyalty-card__perk-body">
              {snapshot.perkDescription}
            </p>
          ) : null}
        </div>
      ) : null}

      {showProgress && !snapshot.perkUnlocked && hasPerkCopy ? (
        <p className="guest-loyalty-card__perk-preview">
          {snapshot.perkTitle.trim()
            ? t("perkWaiting", { perk: snapshot.perkTitle })
            : t("perkWaitingGeneric")}
        </p>
      ) : null}

      {showBookAgain ? (
        <Link href="/calendar" className="guest-app__access-cta">
          {t("bookAgain")}
        </Link>
      ) : null}
    </section>
  );
}
