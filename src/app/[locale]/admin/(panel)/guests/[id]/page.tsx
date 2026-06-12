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
import { GuestProfileCards } from "@/components/admin/guests/GuestProfileCards";
import { GuestProfileControlsForm } from "@/components/admin/guests/GuestProfileControlsForm";
import { GuestRebookButtons } from "@/components/admin/guests/GuestRebookButtons";
import { GuestRebookStayCollapse } from "@/components/admin/guests/GuestRebookStayCollapse";
import { loadGuestRebookPanelPayload } from "@/services/guest-rebook";
import { GuestProfileSection } from "@/components/admin/guests/GuestProfileSection";
import { GuestStayReviewForm } from "@/components/admin/guests/GuestStayReviewForm";
import { GUEST_TAG_LABELS } from "@/domain/guest/tags";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
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

type GuestDetailTab = "overview" | "identity" | "profile" | "notes" | "history";

function resolveTab(input: string | undefined): GuestDetailTab {
  if (input === "identity") return "identity";
  if (input === "profile") return "profile";
  if (input === "notes") return "notes";
  if (input === "history") return "history";
  return "overview";
}

function buildGuestDetailHref(input: {
  id: string;
  from?: string;
  tab?: GuestDetailTab;
}): string {
  const params = new URLSearchParams();
  if (input.from?.trim()) params.set("from", input.from.trim());
  if (input.tab && input.tab !== "overview") params.set("tab", input.tab);
  const query = params.toString();
  return query ? `/admin/guests/${input.id}?${query}` : `/admin/guests/${input.id}`;
}

export default async function GuestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; tab?: string }>;
}) {
  const paramsPromise = params;
  const guestIdPromise = paramsPromise.then(({ id: guestId }) => guestId);
  const historyPromise = guestIdPromise.then((guestId) =>
    getGuestBookingHistory(guestId)
      .then((data) => ({ ok: true as const, data }))
      .catch((e) => ({ ok: false as const, error: e }))
  );
  const guestResultPromise = guestIdPromise.then((guestId) =>
    getGuestById(guestId).catch(() => null)
  );
  const duplicatesPromise = guestIdPromise.then((guestId) =>
    findDuplicateGuestsForGuest(guestId)
      .then((data) => ({ ok: true as const, data }))
      .catch((e) => ({ ok: false as const, error: e }))
  );

  const baseGuestPromise = guestIdPromise.then((guestId) =>
    getGuestBaseById(guestId)
  );
  const dedupCandidatesPromise = guestResultPromise.then((guest) =>
    guest
      ? findDedupCandidates(dedupInputFromGuest(guest)).catch(() => [])
      : baseGuestPromise.then((base) =>
          base
            ? findDedupCandidates(dedupInputFromGuest(base)).catch(() => [])
            : []
        )
  );

  const [
    tPage,
    tCommon,
    tGuests,
    tFlow,
    { id },
    { from, tab },
    baseGuest,
    guestResult,
    historyResult,
    duplicatesResult,
    dedupCandidates,
    today,
    latestRebookPayload,
  ] = await Promise.all([
    getTranslations("admin.pages.guestDetail"),
    getTranslations("admin.common"),
    getTranslations("admin.guests"),
    getTranslations("booking.flowStatus"),
    paramsPromise,
    searchParams,
    baseGuestPromise,
    guestResultPromise,
    historyPromise,
    duplicatesPromise,
    dedupCandidatesPromise,
    getEffectiveToday(),
    historyPromise.then((result) =>
      result.ok && result.data[0]
        ? guestIdPromise.then((guestId) =>
            loadGuestRebookPanelPayload(guestId, result.data[0].id).catch(
              () => null
            )
          )
        : null
    ),
  ]);
  const activeTab = resolveTab(tab);
  if (!baseGuest) notFound();

  let guest = guestResult;
  let profileError: string | null = null;
  if (!guest) {
    guest = baseGuest;
    profileError = tPage("profileSnapshotError");
  }

  let history = [] as Awaited<ReturnType<typeof getGuestBookingHistory>>;
  let historyError: string | null = null;
  if (historyResult.ok) {
    history = historyResult.data;
  } else {
    historyError =
      historyResult.error instanceof Error
        ? historyResult.error.message
        : tPage("historyLoadError");
  }

  let duplicates = [] as Awaited<ReturnType<typeof findDuplicateGuestsForGuest>>;
  let duplicatesError: string | null = null;
  if (duplicatesResult.ok) {
    duplicates = duplicatesResult.data;
  } else {
    duplicatesError =
      duplicatesResult.error instanceof Error
        ? duplicatesResult.error.message
        : tPage("duplicatesLoadError");
  }

  const backHref = from?.startsWith("/admin/guests") ? from : "/admin/guests";
  const reviewedHistoryCount = history.filter((stay) => stay.review != null).length;
  const latestStay = history[0] ?? null;

  const completedStaysHistory = history.filter(
    (stay) => stay.status === "confirmata" && stay.check_out < today,
  );

  const tabs: { id: GuestDetailTab; label: string }[] = [
    { id: "overview", label: tPage("tabOverview") },
    { id: "identity", label: tPage("tabIdentity") },
    { id: "profile", label: tPage("tabProfile") },
    { id: "notes", label: tPage("tabNotes") },
    { id: "history", label: tPage("tabHistory") },
  ];

  return (
    <main className="guest-profile-page ml-content">
      <Link href={backHref} className="guest-profile-page__back">
        ← {tCommon("clients")}
      </Link>

      {profileError && <p className="guest-profile-page__warn">{profileError}</p>}

      <div className="guest-profile-page__grid">
        <aside className="guest-profile-page__profile">
          <GuestIdentityCard
            guest={guest}
            completedStays={completedStaysHistory.map((stay) => ({
              id: stay.id,
              check_in: stay.check_in,
              check_out: stay.check_out,
              room_names: stay.room_names,
            }))}
            historyHref={buildGuestDetailHref({ id: guest.id, from: backHref, tab: "history" })}
          />
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
          <GuestProfileSection title={tPage("tabHistory")} aside>
            {latestStay ? (
              <div className="guest-history-compact">
                <p className="guest-history-compact__period">
                  {formatStayPeriod(latestStay.check_in, latestStay.check_out, true)}
                </p>
                <p className="guest-history-compact__meta">
                  {statusLabel(latestStay.status, tFlow)}
                  {latestStay.room_names.length > 0 ? ` · ${latestStay.room_names.join(", ")}` : ""}
                </p>
                <GuestRebookStayCollapse
                  guestId={guest.id}
                  bookingId={latestStay.id}
                  compact
                  initialPayload={latestRebookPayload}
                  today={today}
                />
                <Link
                  href={buildGuestDetailHref({ id: guest.id, from: backHref, tab: "history" })}
                  className="guest-history-compact__link"
                >
                  {tPage("openFullHistory")} →
                </Link>
              </div>
            ) : (
              <p className="guest-panel__hint">{tPage("noLinkedStays")}</p>
            )}
          </GuestProfileSection>
        </aside>

        <div className="guest-profile-page__workspace">
          <nav className="guest-profile-tabs" aria-label={tPage("tabNavAria")}>
            {tabs.map((item) => (
              <Link
                key={item.id}
                href={buildGuestDetailHref({ id: guest.id, from: backHref, tab: item.id })}
                className={[
                  "guest-profile-tabs__item",
                  activeTab === item.id && "guest-profile-tabs__item--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="guest-profile-page__tab-panel">
          {activeTab === "overview" && (
            <>
              <GuestProfileSection title={tPage("guestReview")}>
                <GuestProfileCards profile={guest.profile} showDetails={false} />
              </GuestProfileSection>
              {dedupCandidates.length > 0 && (
                <GuestProfileSection title={tPage("similarProfiles")}>
                  <GuestDedupWarning
                    candidates={dedupCandidates}
                    currentGuestId={guest.id}
                  />
                </GuestProfileSection>
              )}
            </>
          )}

          {activeTab === "identity" && (
            <GuestProfileSection title={tPage("identityData")}>
              <GuestIdentityForm
                key={`identity-${guest.id}-${guest.updated_at}`}
                guest={guest}
              />
            </GuestProfileSection>
          )}

          {activeTab === "profile" && (
            <>
              <GuestProfileSection title={tPage("operatorAdjustments")}>
                <GuestProfileControlsForm
                  key={`profile-controls-${guest.id}-${guest.profile?.updated_at ?? "none"}`}
                  guestId={guest.id}
                  profile={guest.profile}
                />
              </GuestProfileSection>
              {(duplicates.length > 0 || duplicatesError) && (
                <GuestProfileSection title={tPage("similarProfiles")}>
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
            </>
          )}

          {activeTab === "notes" && (
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
          )}

          {activeTab === "history" && (
            <GuestProfileSection title={tPage("historyTitle", { count: history.length })}>
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
                                </p>
                                {stay.review.positive_note ? (
                                  <p className="guest-history__review-note guest-history__review-note--positive">
                                    {tGuests("review.positiveNote")}
                                    {stay.review.positive_stars != null
                                      ? ` · ${tGuests("review.starsOption", { count: stay.review.positive_stars })}`
                                      : ""}
                                    : {stay.review.positive_note}
                                  </p>
                                ) : null}
                                {stay.review.negative_note ? (
                                  <p className="guest-history__review-note guest-history__review-note--negative">
                                    {tGuests("review.negativeNote")}
                                    {stay.review.negative_stars != null
                                      ? ` · ${tGuests("review.starsOption", { count: stay.review.negative_stars })}`
                                      : ""}
                                    : {stay.review.negative_note}
                                  </p>
                                ) : null}
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
                        <GuestRebookStayCollapse
                          guestId={guest.id}
                          bookingId={stay.id}
                          today={today}
                        />
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
          )}
          </div>
        </div>
      </div>
    </main>
  );
}
