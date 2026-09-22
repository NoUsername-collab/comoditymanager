"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRunAdminAction } from "@/components/admin/feedback/AdminPendingProvider";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import {
  createStaffStayAction,
  type StaffStayIntent,
} from "@/features/bookings/staff-stay-actions";
import { BookingIdentityPanel, useBookingIdentity } from "@/features/bookings/ui/identity";
import {
  StaffStayIntentToggle,
  StaffStayOccupancyFields,
  StaffStayRoomPicker,
  useStaffStayPreview,
} from "@/features/bookings/ui/staff-stay-create";
import { DEFAULT_PARTY_ADULTS } from "@/lib/constants";
import {
  publishGanttLiveBooking,
  removeGanttLiveBooking,
} from "@/lib/gantt/live-bookings";
import { buildSyntheticGanttBookingRow } from "@/services/bookings/synthetic-gantt-row";
import {
  GanttRoomOccupantIdentities,
  type OccupantIdentityValue,
} from "./GanttRoomOccupantIdentities";
import type { GanttQuickCreateDraft, GanttQuickRoomOption } from "./types";

export function StayBody({
  mode,
  checkIn,
  checkOut,
  preferredRoomIds,
  rooms,
  draft = null,
  intervalInvalid,
  pending,
  onClose,
  onError,
  onIntentChange,
}: {
  mode: "request" | "direct";
  checkIn: string;
  checkOut: string;
  preferredRoomIds: string[];
  rooms: GanttQuickRoomOption[];
  draft?: GanttQuickCreateDraft | null;
  intervalInvalid: boolean;
  pending: boolean;
  onClose: () => void;
  onError: (error: string | null) => void;
  onIntentChange?: (intent: StaffStayIntent) => void;
}) {
  const tCommon = useTranslations("admin.common");
  const tGantt = useTranslations("admin.gantt");
  const runAdminAction = useRunAdminAction();
  const { showToast } = useAdminFx();
  const identity = useBookingIdentity();
  const [enterGuestsPerRoom, setEnterGuestsPerRoom] = useState(false);
  const [occupantValues, setOccupantValues] = useState<OccupantIdentityValue[]>(
    []
  );
  const [occupantsReady, setOccupantsReady] = useState(false);
  const [intent, setIntent] = useState<StaffStayIntent>(
    mode === "direct" ? "direct" : "request",
  );
  useEffect(() => {
    if (mode === "request" || mode === "direct") setIntent(mode);
  }, [mode]);
  const [numAdults, setNumAdults] = useState(DEFAULT_PARTY_ADULTS);
  const [numChildren, setNumChildren] = useState(0);

  const stayPreview = useStaffStayPreview({
    checkIn,
    checkOut,
    numAdults,
    numChildren,
    preferredRoomIds,
    enabled: !intervalInvalid,
  });
  const selectedCreateRooms = useMemo(() => {
    return stayPreview.selectedIds.map((id) => ({
      id,
      name:
        stayPreview.rooms.find((room) => room.id === id)?.name ??
        rooms.find((room) => room.id === id)?.name ??
        (id === draft?.roomId ? draft.roomName : id),
    }));
  }, [stayPreview.selectedIds, stayPreview.rooms, rooms, draft]);
  const usePerRoomIdentities =
    enterGuestsPerRoom && selectedCreateRooms.length > 1;
  const identityReady = usePerRoomIdentities
    ? occupantsReady
    : identity.canSubmit;
  const handleOccupantValues = useCallback(
    (values: OccupantIdentityValue[], allReady: boolean) => {
      setOccupantValues(values);
      setOccupantsReady(allReady);
    },
    []
  );
  const hasMultiRoomDraft = (draft?.roomIds?.length ?? 0) > 1;

  function handleIntentChange(next: StaffStayIntent) {
    setIntent(next);
    onIntentChange?.(next);
  }

  function submitGuestCreate(kind: StaffStayIntent) {
    if (intervalInvalid) {
      onError(tGantt("quick.errors.checkoutAfterCheckin"));
      return;
    }
    if (!stayPreview.quote.hostsGuests || stayPreview.selectedIds.length === 0) {
      onError(tGantt("quick.errors.chooseRoomsForGuests"));
      return;
    }
    if (!identityReady) return;
    const titular = usePerRoomIdentities ? occupantValues[0] : identity;
    if (!titular) return;
    onError(null);
    const roomIds = stayPreview.selectedIds;
    const roomNames = selectedCreateRooms.map((room) => room.name);
    const occupants = usePerRoomIdentities
      ? occupantValues.map((occupant) => ({
          roomId: occupant.roomId,
          guestLastName: occupant.guestLastName,
          guestFirstName: occupant.guestFirstName,
          guestEmail: occupant.guestEmail,
          guestPhone: occupant.guestPhone,
        }))
      : undefined;
    const payload = {
      intent: kind,
      roomIds,
      checkIn,
      checkOut,
      guestLastName: titular.guestLastName,
      guestFirstName: titular.guestFirstName,
      guestEmail: titular.guestEmail,
      guestPhone: titular.guestPhone,
      numAdults,
      numChildren,
      occupants,
    };
    const tempId = `optimistic:${crypto.randomUUID()}`;
    publishGanttLiveBooking(
      buildSyntheticGanttBookingRow({
        id: tempId,
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
        status: kind === "request" ? "cerere_noua" : "confirmata",
        guestLastName: payload.guestLastName,
        guestFirstName: payload.guestFirstName,
        guestEmail: payload.guestEmail,
        guestPhone: payload.guestPhone ?? "",
        roomId: roomIds[0],
        roomIds,
        roomName: roomNames.join(", "),
        roomNames,
        numAdults,
        numChildren,
        totalPrice: stayPreview.quote.estimateRon,
      }),
    );
    onClose();
    void runAdminAction(async () => {
      const res = await createStaffStayAction(payload);
      if (!res.ok) {
        removeGanttLiveBooking(tempId);
        showToast({ kind: "error", title: tCommon("error"), message: res.error });
        return;
      }
      removeGanttLiveBooking(tempId);
      if (res.booking) {
        publishGanttLiveBooking(res.booking);
      }
      showToast({
        kind: "success",
        title: kind === "request" ? tGantt("quick.requestCreated") : tGantt("quick.directCreated"),
        message:
          kind === "request"
            ? tGantt("quick.requestAppears")
            : tGantt("quick.bookingAppears"),
      });
    });
  }

  return (
    <>
      <StaffStayIntentToggle
        value={intent}
        onChange={handleIntentChange}
        appearance="admin"
      />
      <StaffStayOccupancyFields
        numAdults={numAdults}
        numChildren={numChildren}
        onAdultsChange={setNumAdults}
        onChildrenChange={setNumChildren}
        appearance="admin"
      />
      <StaffStayRoomPicker
        rooms={stayPreview.rooms}
        quote={stayPreview.quote}
        suggestions={stayPreview.suggestions}
        pending={stayPreview.pending}
        previewError={stayPreview.error}
        onToggle={stayPreview.toggleRoom}
        onApply={stayPreview.applyRooms}
        appearance="admin"
        preferredRoomIds={preferredRoomIds}
      />
      {hasMultiRoomDraft || stayPreview.selectedIds.length > 1 ? (
        <label className="gantt-quick-panel__occupants-toggle">
          <input
            type="checkbox"
            checked={enterGuestsPerRoom}
            onChange={(e) => setEnterGuestsPerRoom(e.target.checked)}
          />
          <span>{tGantt("quick.enterGuestsPerRoom")}</span>
        </label>
      ) : null}
      {usePerRoomIdentities ? (
        <GanttRoomOccupantIdentities
          rooms={selectedCreateRooms}
          onValuesChange={handleOccupantValues}
        />
      ) : (
        <BookingIdentityPanel identity={identity} appearance="admin" />
      )}
      <div className="gantt-quick-panel__actions flex gap-2">
        <AdminButton
          variant="primary"
          size="sm"
          className="gantt-quick-panel__action gantt-quick-panel__action--primary flex-1"
          disabled={
            pending ||
            stayPreview.pending ||
            !identityReady ||
            !stayPreview.quote.hostsGuests ||
            intervalInvalid
          }
          onClick={() => submitGuestCreate(intent)}
        >
          {pending
            ? tCommon("saving")
            : usePerRoomIdentities
              ? !occupantsReady
                ? identity.checkingLabel
                : intent === "request"
                  ? tGantt("quick.createRequest")
                  : tGantt("quick.confirmStay")
              : !identity.identityChecksReady
                ? identity.checkingLabel
                : intent === "request"
                  ? tGantt("quick.createRequest")
                  : tGantt("quick.confirmStay")}
        </AdminButton>
      </div>
    </>
  );
}
