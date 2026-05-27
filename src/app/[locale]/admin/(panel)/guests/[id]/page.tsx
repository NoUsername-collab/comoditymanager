import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { formatBookingRef } from "@/lib/booking-admin-links";
import { GuestMergeForm } from "@/components/admin/guests/GuestMergeForm";
import { GuestBlacklistPanel } from "@/components/admin/guests/GuestBlacklistPanel";
import { GuestIdentityCard } from "@/components/admin/guests/GuestIdentityCard";
import { GuestNotesForm } from "@/components/admin/guests/GuestNotesForm";
import { GuestProfileBadges } from "@/components/admin/guests/GuestProfileBadges";
import { GuestProfileCards } from "@/components/admin/guests/GuestProfileCards";
import { GuestProfileControlsForm } from "@/components/admin/guests/GuestProfileControlsForm";
import { GuestRebookButtons } from "@/components/admin/guests/GuestRebookButtons";
import { GuestStayReviewForm } from "@/components/admin/guests/GuestStayReviewForm";
import { AdminRetroPageFrame } from "@/components/admin/retro/AdminRetroPageFrame";
import { RetroXpWindow } from "@/components/admin/retro/RetroXpWindow";
import { GUEST_TAG_LABELS } from "@/domain/guest/tags";
import { todayIso } from "@/lib/stay-dates";
import {
  findDuplicateGuestsForGuest,
  getGuestBaseById,
  getGuestBookingHistory,
  getGuestById,
} from "@/services/guests";
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
  const today = todayIso();
  const backHref = from?.startsWith("/admin/guests") ? from : "/admin/guests";
  const reviewedHistoryCount = history.filter((stay) => stay.review != null).length;
  const latestStay = history[0] ?? null;

  return (
    <AdminRetroPageFrame
      title={`${tCommon("clients")} — ${guest.display_name}`}
      backHref={backHref}
      backLabel={tCommon("clients")}
      className="max-w-none pl-3 pr-4 xl:pr-5"
    >
      <div className="grid gap-6 xl:grid-cols-[510px_minmax(0,1fr)] 2xl:grid-cols-[540px_minmax(0,1.2fr)]">
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <GuestIdentityCard guest={guest} />

          {guest.profile && (
            <RetroXpWindow title={tPage("summary")}>
              <GuestProfileBadges profile={guest.profile} />
            </RetroXpWindow>
          )}

          <RetroXpWindow title={tPage("quickActions")}>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <GuestBlacklistPanel
                  key={`blacklist-${guest.id}-${guest.profile?.updated_at ?? "none"}-${guest.profile?.flag_level ?? "normal"}`}
                  guestId={guest.id}
                  profile={guest.profile}
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                  {tPage("quickRebook")}
                </p>
                <GuestRebookButtons guestId={guest.id} disabled={history.length === 0} />
                {history.length === 0 && !historyError && (
                  <p className="text-xs text-zinc-500">
                    {tPage("quickRebookHint")}
                  </p>
                )}
              </div>

              {guest.tags.length > 0 && (
                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                    {tPage("legacyTags")}
                  </p>
                  <p className="mt-1 text-xs text-zinc-700">
                    {guest.tags.map((t) => GUEST_TAG_LABELS[t]).join(", ")}
                  </p>
                </div>
              )}
            </div>
          </RetroXpWindow>
        </aside>

        <div className="space-y-4">
          <RetroXpWindow title={tPage("guestReview")}>
            <div className="space-y-3">
              {profileError && <p className="text-xs text-amber-800">{profileError}</p>}
              <GuestProfileCards profile={guest.profile} />
            </div>
          </RetroXpWindow>

          <RetroXpWindow title={tPage("operatorTraits")}>
            <GuestProfileControlsForm
              key={`profile-controls-${guest.id}-${guest.profile?.updated_at ?? "none"}`}
              guestId={guest.id}
              profile={guest.profile}
            />
          </RetroXpWindow>

          <RetroXpWindow title={tPage("notesContext")}>
            <div className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                    {tPage("profileNote")}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                    {guest.profile?.manual_note?.trim() || tPage("noProfileNote")}
                  </p>
                </div>
                <div className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                    {tPage("generalNotes")}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">
                    {guest.notes?.trim() || tPage("noGeneralNotes")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <GuestNotesForm
                  key={`guest-notes-${guest.id}-${guest.updated_at}-${guest.notes ?? ""}`}
                  guestId={guest.id}
                  initialNotes={guest.notes ?? ""}
                />
              </div>
            </div>
          </RetroXpWindow>

          {(duplicates.length > 0 || duplicatesError) && (
            <RetroXpWindow title={tPage("similarProfiles")}>
              {duplicatesError ? (
                <p className="text-sm text-amber-800">{duplicatesError}</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-zinc-600">
                    {tPage("similarProfilesHelp")}
                  </p>
                  <GuestMergeForm guestId={guest.id} duplicates={duplicates} />
                </div>
              )}
            </RetroXpWindow>
          )}

          <RetroXpWindow title={tPage("historyTitle", { count: history.length })}>
            {historyError ? (
              <p className="text-sm text-amber-800">{historyError}</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-zinc-500">{tPage("noLinkedStays")}</p>
            ) : (
              <details>
                <summary className="cursor-pointer list-none rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-zinc-900">{tPage("openFullHistory")}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {latestStay
                          ? tPage("latestStay", {
                              period: formatStayPeriod(
                                latestStay.check_in,
                                latestStay.check_out,
                                true
                              ),
                            })
                          : tPage("noStays")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-1 font-semibold text-zinc-700">
                        {tPage("staysCount", { count: history.length })}
                      </span>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-1 font-semibold text-zinc-700">
                        {tPage("reviewsCount", { count: reviewedHistoryCount })}
                      </span>
                    </div>
                  </div>
                </summary>

                <div className="mt-4">
                  <ul className="space-y-3">
                    {history.map((stay) => (
                      <li
                        key={stay.id}
                        className="border border-zinc-200 bg-white px-4 py-3 text-sm"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">
                              {formatStayPeriod(stay.check_in, stay.check_out, true)}
                            </p>
                            <p className="text-zinc-600">
                              {statusLabel(stay.status, tFlow)}
                              {stay.room_names.length > 0
                                ? ` · ${stay.room_names.join(", ")}`
                                : ""}
                              {stay.total_price != null ? ` · ${stay.total_price} RON` : ""}
                            </p>
                            <p className="text-xs font-mono text-zinc-400">
                              {formatBookingRef(stay.id)}
                            </p>
                            {stay.review && (
                              <div className="mt-2 space-y-1 text-xs">
                                <p className="font-semibold text-violet-800">
                                  {tPage("reviewSummary", {
                                    stars: stay.review.stars,
                                  })}
                                  {stay.review.problem_details
                                    ? ` · ${tPage("reviewHasDetails")}`
                                    : ""}
                                </p>
                                {(stay.review.positive_traits.length > 0 ||
                                  stay.review.negative_traits.length > 0) && (
                                  <p className="text-zinc-600">
                                    {stay.review.positive_traits.map(
                                      (trait) => tGuests(`traits.positive.${trait}` as never)
                                    ).join(" · ")}
                                    {stay.review.positive_traits.length > 0 &&
                                    stay.review.negative_traits.length > 0
                                      ? " | "
                                      : ""}
                                    {stay.review.negative_traits.map(
                                      (trait) => tGuests(`traits.negative.${trait}` as never)
                                    ).join(" · ")}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <Link
                            href={`/admin/bookings/${stay.id}`}
                            className="text-sm font-semibold text-emerald-700 hover:underline"
                          >
                            {tCommon("details")} →
                          </Link>
                        </div>
                        {stay.segments.length > 1 && (
                          <ul className="mt-2 space-y-1 border-t border-zinc-100 pt-2 text-xs text-zinc-600">
                            {stay.segments.map((seg) => (
                              <li key={seg.id}>
                                {tPage("segmentLabel")}{" "}
                                {formatStayPeriod(seg.segment_start, seg.segment_end, true)}
                                {seg.nightly_rate != null
                                  ? ` · ${seg.nightly_rate} ${tPage("ronPerNight")}`
                                  : ""}
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
              </details>
            )}
          </RetroXpWindow>
        </div>
      </div>
    </AdminRetroPageFrame>
  );
}
