import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatBookingRef } from "@/lib/booking-admin-links";
import { GuestMergeForm } from "@/components/admin/guests/GuestMergeForm";
import { GuestBlacklistPanel } from "@/components/admin/guests/GuestBlacklistPanel";
import { GuestDedupWarning } from "@/components/admin/guests/GuestDedupWarning";
import { GuestIdentityCard } from "@/components/admin/guests/GuestIdentityCard";
import { GuestIdentityForm } from "@/components/admin/guests/GuestIdentityForm";
import { GuestNotesForm } from "@/components/admin/guests/GuestNotesForm";
import { GuestProfileBadges } from "@/components/admin/guests/GuestProfileBadges";
import { GuestProfileCards } from "@/components/admin/guests/GuestProfileCards";
import { GuestProfileControlsForm } from "@/components/admin/guests/GuestProfileControlsForm";
import { GuestRebookButtons } from "@/components/admin/guests/GuestRebookButtons";
import { GuestProfileSection } from "@/components/admin/guests/GuestProfileSection";
import { GuestStayReviewForm } from "@/components/admin/guests/GuestStayReviewForm";
import { GUEST_TAG_LABELS } from "@/domain/guest/tags";
import { todayIso } from "@/lib/stay-dates";
import {
  findDuplicateGuestsForGuest,
  getGuestBaseById,
  getGuestBookingHistory,
  getGuestById,
} from "@/services/guests";
import { dedupInputFromGuest, findDedupCandidates } from "@/services/guest-dedup";
import { getTranslations } from "next-intl/server";

function statusLabel(status: string, tFlow: (key: string) => string): string {
  if (status === "confirmata") return tFlow("confirmata");
  if (status === "cerere_noua") return tFlow("cerere_noua");
  if (status === "anulata") return tFlow("anulata");
  return status;
}

export default async function GuestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const tPage = await getTranslations("admin.pages.guestDetail");
  const tCommon = await getTranslations("admin.common");
  const tGuests = await getTranslations("admin.guests");
  const tFlow = await getTranslations("booking.flowStatus");
  const { id } = await params;
  const { from } = await searchParams;
  const baseGuest = await getGuestBaseById(id);
  if (!baseGuest) notFound();

  let guest = await getGuestById(id).catch(() => null);
  let profileError: string | null = null;
  if (!guest) {
    guest = baseGuest;
    profileError = tPage("profileSnapshotError");
  }

  let history = [] as Awaited<ReturnType<typeof getGuestBookingHistory>>;
  let historyError: string | null = null;
  try {
    history = await getGuestBookingHistory(id);
  } catch (e) {
    historyError = e instanceof Error ? e.message : tPage("historyLoadError");
  }

  let duplicates = [] as Awaited<ReturnType<typeof findDuplicateGuestsForGuest>>;
  let duplicatesError: string | null = null;
  try {
    duplicates = await findDuplicateGuestsForGuest(id);
  } catch (e) {
    duplicatesError = e instanceof Error ? e.message : tPage("duplicatesLoadError");
  }

  // Smart dedup scoring — multi-layer matching
  const dedupCandidates = await findDedupCandidates(
    dedupInputFromGuest(guest)
  ).catch(() => []);

  const today = todayIso();
  const backHref = from?.startsWith("/admin/guests") ? from : "/admin/guests";
  const reviewedHistoryCount = history.filter((stay) => stay.review != null).length;
  const latestStay = history[0] ?? null;

  return (
    <main className="guest-profile-page">
      <Link href={backHref} className="guest-profile-page__back">
        ← {tCommon("clients")}
      </Link>

      <GuestIdentityCard guest={guest} />

      {profileError && <p className="guest-profile-page__warn">{profileError}</p>}

      {guest.profile && (
        <div className="guest-profile-page__badges">
          <GuestProfileBadges profile={guest.profile} />
        </div>
      )}

      {dedupCandidates.length > 0 && (
        <div className="mb-4">
          <GuestDedupWarning
            candidates={dedupCandidates}
            currentGuestId={guest.id}
          />
        </div>
      )}

      <div className="guest-profile-page__grid">
        <div className="guest-profile-page__main">
          <GuestProfileSection title={tPage("identityData")}>
            <GuestIdentityForm
              key={`identity-${guest.id}-${guest.updated_at}`}
              guest={guest}
            />
          </GuestProfileSection>

          <GuestProfileSection title={tPage("guestReview")}>
            <GuestProfileCards profile={guest.profile} />
          </GuestProfileSection>

          <GuestProfileSection title={tPage("operatorTraits")}>
            <GuestProfileControlsForm
              key={`profile-controls-${guest.id}-${guest.profile?.updated_at ?? "none"}`}
              guestId={guest.id}
              profile={guest.profile}
            />
          </GuestProfileSection>

          <GuestProfileSection title={tPage("notesContext")}>
            <div className="guest-notes-grid">
              <div className="guest-note-box">
                <p className="guest-note-box__label">{tPage("profileNote")}</p>
                <p className="guest-note-box__text">
                  {guest.profile?.manual_note?.trim() || tPage("noProfileNote")}
                </p>
              </div>
              <div className="guest-note-box">
                <p className="guest-note-box__label">{tPage("generalNotes")}</p>
                <p className="guest-note-box__text">
                  {guest.notes?.trim() || tPage("noGeneralNotes")}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <GuestNotesForm
                key={`guest-notes-${guest.id}-${guest.updated_at}-${guest.notes ?? ""}`}
                guestId={guest.id}
                initialNotes={guest.notes ?? ""}
              />
            </div>
          </GuestProfileSection>
        </div>

        <div className="guest-profile-page__sidebar">
          <GuestProfileSection title={tPage("quickActions")} aside>
            <div className="space-y-3">
              <GuestBlacklistPanel
                key={`blacklist-${guest.id}-${guest.profile?.updated_at ?? "none"}-${guest.profile?.flag_level ?? "normal"}`}
                guestId={guest.id}
                profile={guest.profile}
              />
              <div>
                <p className="guest-panel__subtitle">{tPage("quickRebook")}</p>
                <GuestRebookButtons guestId={guest.id} disabled={history.length === 0} />
                {history.length === 0 && !historyError && (
                  <p className="guest-panel__hint">{tPage("quickRebookHint")}</p>
                )}
              </div>
              {guest.tags.length > 0 && (
                <div className="guest-legacy-tags">
                  <p className="guest-legacy-tags__label">{tPage("legacyTags")}</p>
                  <p className="guest-legacy-tags__text">
                    {guest.tags.map((t) => GUEST_TAG_LABELS[t]).join(", ")}
                  </p>
                </div>
              )}
            </div>
          </GuestProfileSection>

          {(duplicates.length > 0 || duplicatesError) && (
            <GuestProfileSection title={tPage("similarProfiles")} aside>
              {duplicatesError ? (
                <p className="guest-panel__warn">{duplicatesError}</p>
              ) : (
                <div className="space-y-3">
                  <p className="guest-panel__hint">{tPage("similarProfilesHelp")}</p>
                  <GuestMergeForm guestId={guest.id} duplicates={duplicates} />
                </div>
              )}
            </GuestProfileSection>
          )}

          <GuestProfileSection
            title={tPage("historyTitle", { count: history.length })}
            aside
          >
            {historyError ? (
              <p className="guest-panel__warn">{historyError}</p>
            ) : history.length === 0 ? (
              <p className="guest-panel__hint">{tPage("noLinkedStays")}</p>
            ) : (
              <div className="guest-history">
                <div className="guest-history__summary">
                  <span className="guest-history__pill">
                    {tPage("staysCount", { count: history.length })}
                  </span>
                  <span className="guest-history__pill">
                    {tPage("reviewsCount", { count: reviewedHistoryCount })}
                  </span>
                  {latestStay && (
                    <span className="guest-history__latest">
                      {tPage("latestStay", {
                        period: formatStayPeriod(latestStay.check_in, latestStay.check_out, true),
                      })}
                    </span>
                  )}
                </div>
                <ul className="guest-history__list">
                  {history.map((stay) => (
                    <li key={stay.id} className="guest-history__item">
                      <div className="guest-history__item-top">
                        <div>
                          <p className="guest-history__period">
                            {formatStayPeriod(stay.check_in, stay.check_out, true)}
                          </p>
                          <p className="guest-history__meta">
                            {statusLabel(stay.status, tFlow)}
                            {stay.room_names.length > 0 ? ` · ${stay.room_names.join(", ")}` : ""}
                            {stay.total_price != null ? ` · ${stay.total_price} RON` : ""}
                          </p>
                          <p className="guest-history__ref">{formatBookingRef(stay.id)}</p>
                          {stay.review && (
                            <div className="guest-history__review">
                              <p className="guest-history__review-stars">
                                {tPage("reviewSummary", { stars: stay.review.stars })}
                                {stay.review.problem_details ? ` · ${tPage("reviewHasDetails")}` : ""}
                              </p>
                              {(stay.review.positive_traits.length > 0 ||
                                stay.review.negative_traits.length > 0) && (
                                <p className="guest-history__review-traits">
                                  {stay.review.positive_traits
                                    .map((trait) => tGuests(`traits.positive.${trait}` as never))
                                    .join(" · ")}
                                  {stay.review.positive_traits.length > 0 &&
                                  stay.review.negative_traits.length > 0
                                    ? " | "
                                    : ""}
                                  {stay.review.negative_traits
                                    .map((trait) => tGuests(`traits.negative.${trait}` as never))
                                    .join(" · ")}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <Link
                          href={`/admin/bookings/${stay.id}`}
                          className="guest-history__detail-link"
                        >
                          {tCommon("details")} →
                        </Link>
                      </div>
                      {stay.segments.length > 1 && (
                        <ul className="guest-history__segments">
                          {stay.segments.map((seg) => (
                            <li key={seg.id}>
                              {tPage("segmentLabel")}{" "}
                              {formatStayPeriod(seg.segment_start, seg.segment_end, true)}
                              {seg.nightly_rate != null ? ` · ${seg.nightly_rate} ${tPage("ronPerNight")}` : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                      {stay.status === "confirmata" && stay.check_out < today && (
                        <GuestStayReviewForm
                          guestId={guest.id}
                          bookingId={stay.id}
                          review={stay.review}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </GuestProfileSection>
        </div>
      </div>
    </main>
  );
}
