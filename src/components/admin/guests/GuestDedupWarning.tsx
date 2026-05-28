import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import type { DedupCandidate } from "@/domain/guest/dedup-score";
import { dedupAction } from "@/domain/guest/dedup-score";

type Props = {
  candidates: DedupCandidate[];
  currentGuestId?: string | null;
};

function tierIcon(tier: DedupCandidate["tier"]): string {
  switch (tier) {
    case "hard":
      return "🔴";
    case "strong":
      return "🟠";
    case "probable":
      return "🟡";
  }
}

function reasonKey(reason: string): string {
  switch (reason) {
    case "national_id":
      return "nationalId";
    case "phone_lastname":
      return "phoneLastname";
    case "email_lastname":
      return "emailLastname";
    case "doc_number_type":
      return "docNumberType";
    case "name_birthdate":
      return "nameBirthdate";
    case "phone_different_name":
      return "phoneDiffName";
    case "lastname_city_birthyear":
      return "lastnameCityYear";
    default:
      return reason;
  }
}

export async function GuestDedupWarning({ candidates, currentGuestId }: Props) {
  if (candidates.length === 0) return null;

  const t = await getTranslations("admin.guests.dedup");
  const topCandidate = candidates[0];
  const action = dedupAction(topCandidate);

  const borderClass =
    action === "auto_merge"
      ? "dedup-warning--hard"
      : action === "suggest_merge"
        ? "dedup-warning--strong"
        : "dedup-warning--probable";

  return (
    <div className={`dedup-warning ${borderClass}`}>
      <div className="dedup-warning__header">
        <span className="dedup-warning__icon">
          {action === "auto_merge" ? "⚠️" : "🔍"}
        </span>
        <span className="dedup-warning__title">
          {action === "auto_merge"
            ? t("hardMatchTitle")
            : action === "suggest_merge"
              ? t("strongMatchTitle")
              : t("probableMatchTitle")}
        </span>
        <span className="dedup-warning__count">
          {t("matchCount", { count: candidates.length })}
        </span>
      </div>

      <p className="dedup-warning__subtitle">
        {action === "auto_merge"
          ? t("hardMatchDesc")
          : action === "suggest_merge"
            ? t("strongMatchDesc")
            : t("probableMatchDesc")}
      </p>

      <div className="dedup-warning__list">
        {candidates.slice(0, 5).map((c) => (
          <div key={c.guestId} className="dedup-match">
            <div className="dedup-match__header">
              <span className="dedup-match__tier">
                {tierIcon(c.tier)}
              </span>
              <Link
                href={`/admin/guests/${c.guestId}`}
                className="dedup-match__name"
              >
                {c.displayName}
              </Link>
              <span className="dedup-match__score">
                {c.score}%
              </span>
            </div>

            <div className="dedup-match__details">
              {c.phone && (
                <span className="dedup-match__field">📞 {c.phone}</span>
              )}
              {c.email && (
                <span className="dedup-match__field">📧 {c.email}</span>
              )}
              {c.nationalId && (
                <span className="dedup-match__field">🪪 {c.nationalId}</span>
              )}
              {c.birthDate && (
                <span className="dedup-match__field">🎂 {c.birthDate}</span>
              )}
            </div>

            <div className="dedup-match__reasons">
              {c.reasons.map((r) => (
                <span key={r} className="dedup-match__reason">
                  {t(`reasons.${reasonKey(r)}`)}
                </span>
              ))}
            </div>

            {currentGuestId && (
              <Link
                href={`/admin/guests/${currentGuestId}?merge_with=${c.guestId}`}
                className="dedup-match__merge-link"
              >
                {t("mergeLink")} →
              </Link>
            )}
          </div>
        ))}
      </div>

      {candidates.length > 5 && (
        <p className="dedup-warning__more">
          {t("moreMatches", { count: candidates.length - 5 })}
        </p>
      )}
    </div>
  );
}
