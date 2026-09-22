"use client";

import type { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  bookingRooms,
  groupGuestsByRoom,
  type CheckinIdentityScope,
} from "@/domain/checkin/guest-layout";
import { GuestIdentityCard } from "@/features/checkin/ui/GuestIdentityCard";
import type { MrzMappedIdentity } from "@/domain/guest/mrz";
import type {
  BookingForCheckin,
  CheckinGuestInput,
  CheckinSettings,
} from "@/domain/checkin/types";

export const IDENTITY_SCOPES: CheckinIdentityScope[] = [
  "rep",
  "individual",
  "per_room",
];

export function StepIdentity({
  guests,
  settings,
  booking,
  identityScope,
  operatorCanChoose,
  onScopeChange,
  onRemoveGuest,
  updateGuest,
  onApplyMrz,
  registeredOnly,
  emptyRegistered,
  t,
  continuationHint,
  repAllRoomsHint,
}: {
  guests: CheckinGuestInput[];
  settings: CheckinSettings;
  booking: BookingForCheckin;
  identityScope: CheckinIdentityScope;
  operatorCanChoose: boolean;
  onScopeChange: (scope: CheckinIdentityScope) => void;
  onRemoveGuest?: (index: number) => void;
  updateGuest: (i: number, f: keyof CheckinGuestInput, v: string | boolean | null) => void;
  onApplyMrz: (index: number, data: MrzMappedIdentity) => void;
  registeredOnly: boolean;
  emptyRegistered: boolean;
  t: ReturnType<typeof useTranslations>;
  continuationHint?: string;
  repAllRoomsHint?: string;
}) {
  const rooms = bookingRooms(booking);
  const roomGroups = groupGuestsByRoom(guests);
  const partyHint = t("identityScope.partyHint", {
    adults: booking.num_adults,
    children: booking.num_children,
  });

  if (emptyRegistered) {
    return (
      <div className="checkin-step-identity checkin-step-identity--empty">
        <p className="checkin-registered-empty__title">{t("registeredGuests.emptyTitle")}</p>
        <p className="checkin-registered-empty__hint">{t("registeredGuests.emptyHint")}</p>
        {booking.guest_id ? (
          <Link
            href={`/admin/guests/${booking.guest_id}`}
            className="checkin-registered-empty__link"
          >
            {t("registeredGuests.openProfile")}
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="checkin-step-identity">
      {registeredOnly ? (
        <p className="checkin-registered-only-hint">{t("registeredGuests.onlyHint")}</p>
      ) : null}
      {continuationHint ? (
        <p className="checkin-continuation-hint">{continuationHint}</p>
      ) : null}
      {repAllRoomsHint ? (
        <p className="checkin-rep-all-rooms-hint">{repAllRoomsHint}</p>
      ) : null}
      <p className="checkin-legal-hint">{t("touristSheet.legalHint")}</p>
      <p className="checkin-party-hint">{partyHint}</p>

      {operatorCanChoose && (
        <div className="checkin-identity-scope" role="radiogroup" aria-label={t("identityScope.title")}>
          <p className="checkin-identity-scope__title">{t("identityScope.title")}</p>
          <div className="checkin-identity-scope__options">
            {IDENTITY_SCOPES.map((scope) => (
              <label
                key={scope}
                className={[
                  "checkin-identity-scope__option",
                  identityScope === scope && "checkin-identity-scope__option--active",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <input
                  type="radio"
                  name="checkin-identity-scope"
                  checked={identityScope === scope}
                  onChange={() => onScopeChange(scope)}
                />
                <span className="checkin-identity-scope__label">{t(`identityScope.${scope}`)}</span>
                <span className="checkin-identity-scope__desc">{t(`identityScope.${scope}Desc`)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {!operatorCanChoose && (
        <p className="checkin-identity-scope__fixed">
          {t("identityScope.fixedMode", { mode: t(`identityScope.${identityScope}`) })}
        </p>
      )}

      {roomGroups.map((group) => (
        <section key={group.room} className="checkin-room-group">
          <header className="checkin-room-group__head">
            <span className="checkin-room-group__icon" aria-hidden>
              🛏
            </span>
            <div>
              <p className="checkin-room-group__title">{group.room}</p>
              <p className="checkin-room-group__meta">
                {t("identityScope.guestsInRoom", { count: group.guests.length })}
              </p>
            </div>
          </header>

          {group.guests.map(({ guest, index: idx }) => (
            <GuestIdentityCard
              key={idx}
              guest={guest}
              idx={idx}
              identityScope={identityScope}
              rooms={rooms}
              canRemove={
                !registeredOnly &&
                identityScope === "individual" &&
                guests.length > 1
              }
              onRemove={onRemoveGuest}
              updateGuest={updateGuest}
              onApplyMrz={(data) => onApplyMrz(idx, data)}
              cnpRule={settings.checkin_cnp_rule}
              t={t}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
