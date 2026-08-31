import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatBookingRef } from "@/lib/booking-admin-links";
import { GuestMergeForm } from "@/features/guests/ui/GuestMergeForm";
import { GuestBlacklistPanel } from "@/features/guests/ui/GuestBlacklistPanel";
import { GuestDedupWarning } from "@/features/guests/ui/GuestDedupWarning";
import { GuestIdentityCard } from "@/features/guests/ui/GuestIdentityCard";
import { GuestIdentityForm } from "@/features/guests/ui/GuestIdentityForm";
import { GuestNotesForm } from "@/features/guests/ui/GuestNotesForm";
import { GuestProfileCards } from "@/features/guests/ui/GuestProfileCards";
import { GuestProfileControlsForm } from "@/features/guests/ui/GuestProfileControlsForm";
import { GuestRebookButtons } from "@/features/guests/ui/GuestRebookButtons";
import { GuestRebookStayCollapse } from "@/features/guests/ui/GuestRebookStayCollapse";
import { GuestProfileSection } from "@/features/guests/ui/GuestProfileSection";
import { GuestStayReviewForm } from "@/features/guests/ui/GuestStayReviewForm";
import { GuestStayStarsInline } from "@/features/guests/ui/GuestStayStarsInline";
import { GUEST_TAG_LABELS } from "@/domain/guest/tags";
import { loadGuestDetailPage } from "@/features/guests/loaders";
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
  const [
    tPage,
    tCommon,
    tGuests,
    tFlow,
    { id },
    { from, tab },
    data,
  ] = await Promise.all([
    getTranslations("admin.pages.guestDetail"),
    getTranslations("admin.common"),
    getTranslations("admin.guests"),
    getTranslations("booking.flowStatus"),
    params,
    searchParams,
    params.then(({ id }) => loadGuestDetailPage(id)),
  ]);
  const activeTab = resolveTab(tab);
  if (!data) notFound();

  const {
    baseGuest,
    guestResult,
    historyResult,
    duplicatesResult,
    dedupCandidates,
    today,
    latestRebookPayload,
  } = data;

  let guest = guestResult;
  let profileError: string | null = null;
  if (!guest) {
    guest = baseGuest;
    profileError = tPage("profileSnapshotError");
  }

  let history = historyResult.ok ? historyResult.data : [];
  let historyError: string | null = null;
  if (!historyResult.ok) {
    historyError =
      historyResult.error instanceof Error
        ? historyResult.error.message
        : tPage("historyLoadError");
  }

  let duplicates = duplicatesResult.ok ? duplicatesResult.data : [];
  let duplicatesError: string | null = null;
  if (!duplicatesResult.ok) {
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
                              <span className="guest-history__period-text">
                                {formatStayPeriod(stay.check_in, stay.check_out, true)}
                              </span>
                              {stay.review && stay.review.stars > 0 ? (
                                <GuestStayStarsInline value={stay.review.stars} />
                              ) : null}
                            </p>
                            <p className="guest-history__meta">
                              {statusLabel(stay.status, tFlow)}
                              {stay.room_names.length > 0 ? ` · ${stay.room_names.join(", ")}` : ""}
                              {stay.total_price != null ? ` · ${stay.total_price} RON` : ""}
                            </p>
                            <p className="guest-history__ref">{formatBookingRef(stay.id)}</p>
                            {stay.review ? (
                              <div className="guest-history__review">
                                <p
                                  className={[
                                    "guest-history__review-note",
                                    stay.review.polarity === "positive"
                                      ? "guest-history__review-note--positive"
                                      : "guest-history__review-note--negative",
                                  ].join(" ")}
                                >
                                  {stay.review.polarity === "positive"
                                    ? tGuests("review.positiveTone")
                                    : tGuests("review.negativeTone")}
                                  {` · ${tGuests("review.intensityValue", { value: stay.review.intensity })}`}
                                  : {stay.review.note}
                                </p>
                              </div>
                            ) : null}
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
