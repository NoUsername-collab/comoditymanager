"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";
import {
  deleteRoomBlockAction,
  extendRoomBlockAction,
  extendRoomHoldAction,
  quickConfirmCerereFromGanttAction,
  releaseRoomHoldAction,
} from "@/features/calendar/actions";
import { cancelBookingOperativeAction } from "@/features/bookings/actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { AdminPortal } from "@/components/admin/overlay/AdminPortal";
import { useGanttContextMenu } from "@/components/admin/gantt/GanttContextMenuContext";
import { useGanttOperativeCheck } from "@/components/admin/gantt/GanttOperativeCheckProvider";
import { canOfferOperativeCheckIn } from "@/domain/booking/operative-checkin";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { computeFixedPointerMenuPosition } from "@/lib/ui/viewport-position";
import { deferGanttBackgroundRefresh, removeGanttLiveBooking } from "@/lib/gantt/live-bookings";
import { publishCazariStayCancelled } from "@/lib/cazari/live-stays";
import { useCompactLayoutHints } from "@/hooks/useMobileLayout";

const GANTT_CTX_MENU_BOUNDS = { width: 260, height: 320 };

type CancelConfirmState = {
  bookingId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  isCerere: boolean;
};

function MenuItem({
  label,
  disabled,
  destructive,
  primary,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  destructive?: boolean;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        "gantt-ctx-menu__item",
        destructive && "gantt-ctx-menu__item--danger",
        primary && "gantt-ctx-menu__item--primary",
        disabled && "gantt-ctx-menu__item--disabled",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function MenuDivider() {
  return <div className="gantt-ctx-menu__divider" role="separator" />;
}

export function GanttContextMenuPanel() {
  const t = useTranslations("admin.common");
  const locale = useLocale();
  const router = useRouter();
  const { menu, closeMenu, requestCreate, openMoveRoom } = useGanttContextMenu();
  const { showToast, notifyCancel } = useAdminFx();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const { requestCheckIn, requestCheckOut } = useGanttOperativeCheck();
  const { compactChrome } = useCompactLayoutHints();
  const [cancelConfirm, setCancelConfirm] = useState<CancelConfirmState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCancelConfirm(null);
  }, [menu]);

  useEffect(() => {
    if (!menu || !compactChrome) return;
    const panel = menuRef.current;
    panel?.querySelector<HTMLElement>(".gantt-ctx-menu__item:not([disabled])")?.focus();
  }, [menu, compactChrome, cancelConfirm]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, closeMenu]);

  if (!menu) return null;

  const sheetMode = compactChrome;
  const style = sheetMode
    ? undefined
    : computeFixedPointerMenuPosition(
        menu.clientX,
        menu.clientY,
        GANTT_CTX_MENU_BOUNDS
      );

  function openBooking(bookingId: string) {
    closeMenu();
    router.push(`/admin/bookings/${bookingId}`);
  }

  function requestCancelBooking(
    bookingId: string,
    guestName: string,
    checkIn: string,
    checkOut: string,
    isCerere: boolean
  ) {
    if (sheetMode) {
      setCancelConfirm({ bookingId, guestName, checkIn, checkOut, isCerere });
      return;
    }
    const period = formatStayPeriod(checkIn, checkOut, locale, true);
    if (
      !confirm(
        isCerere
          ? t("cancelRequestConfirm", { name: guestName, period })
          : t("cancelStayConfirm", { name: guestName, period })
      )
    ) {
      return;
    }
    void executeCancelBooking(bookingId, guestName, isCerere);
  }

  function executeCancelBooking(
    bookingId: string,
    guestName: string,
    isCerere: boolean
  ) {
    void runAdminAction(async () => {
      const res = await cancelBookingOperativeAction(bookingId);
      if (!res.ok) {
        showToast({ kind: "error", title: t("error"), message: res.error });
        return;
      }
      publishCazariStayCancelled(bookingId);
      removeGanttLiveBooking(bookingId);
      notifyCancel(isCerere ? t("requestCancelled") : t("stayCancelled"), guestName);
      setCancelConfirm(null);
      closeMenu();
      deferGanttBackgroundRefresh(router);
    });
  }

  function quickAccept(bookingId: string, guestName: string) {
    void runAdminAction(async () => {
      const res = await quickConfirmCerereFromGanttAction(bookingId);
      if (!res.ok) {
        showToast({ kind: "error", title: t("error"), message: res.error });
        if (res.error.includes("room") || res.error.includes("camer")) {
          openBooking(bookingId);
        }
        return;
      }
      showToast({
        kind: "success",
        title: t("stayConfirmedQuick"),
        message: guestName,
      });
      closeMenu();
      deferGanttBackgroundRefresh(router);
    });
  }

  function releaseOcc() {
    if (menu?.kind !== "hold" && menu?.kind !== "block") return;
    const isHold = menu.kind === "hold";
    void runAdminAction(async () => {
      const res = isHold
        ? await releaseRoomHoldAction(menu.segment.id)
        : await deleteRoomBlockAction(menu.segment.id);
      if (!res.ok) {
        showToast({ kind: "error", title: t("error"), message: res.error });
        return;
      }
      notifyCancel(isHold ? t("holdReleased") : t("blockRemoved"), menu.roomName);
      closeMenu();
      router.refresh();
    });
  }

  function extendOcc() {
    if (menu?.kind !== "hold" && menu?.kind !== "block") return;
    const isHold = menu.kind === "hold";
    void runAdminAction(async () => {
      const res = isHold
        ? await extendRoomHoldAction(menu.segment.id)
        : await extendRoomBlockAction(menu.segment.id);
      if (!res.ok) {
        showToast({ kind: "error", title: t("error"), message: res.error });
        return;
      }
      showToast({
        kind: "success",
        title: isHold ? t("extendHold") : t("extendBlock"),
        message: formatStayPeriod(menu.segment.checkIn, res.check_out, locale, true),
      });
      closeMenu();
      router.refresh();
    });
  }

  return (
    <>
      <AdminPortal>
        <button
          type="button"
          disabled={pending}
          className="gantt-ctx-menu-backdrop fixed inset-0 z-[199] disabled:cursor-wait"
          aria-label={t("closeMenu")}
          onClick={closeMenu}
        />
        <div
          ref={menuRef}
          className={[
            "gantt-ctx-menu fixed z-[200]",
            sheetMode && "gantt-ctx-menu--sheet",
          ]
            .filter(Boolean)
            .join(" ")}
          style={style}
          role="menu"
          aria-label={t("masterController")}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {cancelConfirm ? (
            <>
              <p className="gantt-ctx-menu__head gantt-ctx-menu__confirm-msg">
                {cancelConfirm.isCerere
                  ? t("cancelRequestConfirm", {
                      name: cancelConfirm.guestName,
                      period: formatStayPeriod(
                        cancelConfirm.checkIn,
                        cancelConfirm.checkOut,
                        locale,
                        true
                      ),
                    })
                  : t("cancelStayConfirm", {
                      name: cancelConfirm.guestName,
                      period: formatStayPeriod(
                        cancelConfirm.checkIn,
                        cancelConfirm.checkOut,
                        locale,
                        true
                      ),
                    })}
              </p>
              <MenuItem
                label={t("confirmCancel")}
                destructive
                disabled={pending}
                onClick={() =>
                  executeCancelBooking(
                    cancelConfirm.bookingId,
                    cancelConfirm.guestName,
                    cancelConfirm.isCerere
                  )
                }
              />
              <MenuDivider />
              <MenuItem
                label={t("dismiss")}
                onClick={() => setCancelConfirm(null)}
              />
            </>
          ) : null}

          {!cancelConfirm && menu.kind === "create" && (
            <>
              <p className="gantt-ctx-menu__head">
                {menu.roomName
                  ? `${menu.roomName} · ${formatStayPeriod(menu.checkIn, menu.checkOut, locale, true)}`
                  : formatStayPeriod(menu.checkIn, menu.checkOut, locale, true)}
              </p>
              <MenuItem
                label={t("createRequest")}
                disabled={!menu.roomId || pending}
                onClick={() =>
                  menu.roomId &&
                  requestCreate({
                    roomId: menu.roomId,
                    roomName: menu.roomName ?? t("room"),
                    checkIn: menu.checkIn,
                    checkOut: menu.checkOut,
                    hasConflict: menu.hasConflict,
                    initialMode: "cerere",
                  })
                }
              />
              <MenuItem
                label={t("createDirectStay")}
                disabled={!menu.roomId || pending}
                onClick={() =>
                  menu.roomId &&
                  requestCreate({
                    roomId: menu.roomId,
                    roomName: menu.roomName ?? t("room"),
                    checkIn: menu.checkIn,
                    checkOut: menu.checkOut,
                    hasConflict: menu.hasConflict,
                    initialMode: "direct",
                  })
                }
              />
              <MenuItem
                label={t("holdRoom")}
                disabled={!menu.roomId || pending}
                onClick={() =>
                  menu.roomId &&
                  requestCreate({
                    roomId: menu.roomId,
                    roomName: menu.roomName ?? t("room"),
                    checkIn: menu.checkIn,
                    checkOut: menu.checkOut,
                    hasConflict: menu.hasConflict,
                    initialMode: "hold",
                  })
                }
              />
              <MenuItem
                label={t("blockRoom")}
                disabled={!menu.roomId || pending}
                onClick={() =>
                  menu.roomId &&
                  requestCreate({
                    roomId: menu.roomId,
                    roomName: menu.roomName ?? t("room"),
                    checkIn: menu.checkIn,
                    checkOut: menu.checkOut,
                    hasConflict: menu.hasConflict,
                    initialMode: "block",
                  })
                }
              />
            </>
          )}

          {!cancelConfirm && menu.kind === "stay" && (
            <>
              <p className="gantt-ctx-menu__head">{menu.guestName}</p>
              {menu.occupancyPhase === "past" ? (
                <MenuItem
                  label={t("viewDetails")}
                  onClick={() => openBooking(menu.bookingId)}
                />
              ) : menu.status === "cerere_noua" ? (
                <>
                  <MenuItem
                    label={t("openDetails")}
                    onClick={() => openBooking(menu.bookingId)}
                  />
                  {menu.canMoveRoom && menu.moveRoomDraft ? (
                    <MenuItem
                      label={t("moveRoom")}
                      disabled={pending}
                      onClick={() => openMoveRoom(menu.moveRoomDraft!)}
                    />
                  ) : null}
                  <MenuItem
                    label={t("quickAccept")}
                    primary
                    disabled={pending}
                    onClick={() => quickAccept(menu.bookingId, menu.guestName)}
                  />
                  <MenuDivider />
                  <MenuItem
                    label={t("cancel")}
                    destructive
                    disabled={pending}
                    onClick={() =>
                      requestCancelBooking(
                        menu.bookingId,
                        menu.guestName,
                        menu.popover.checkIn,
                        menu.popover.checkOut,
                        true
                      )
                    }
                  />
                </>
              ) : (
                <>
                  <MenuItem
                    label={t("openDetails")}
                    onClick={() => openBooking(menu.bookingId)}
                  />
                  {menu.canMoveRoom && menu.moveRoomDraft ? (
                    <MenuItem
                      label={t("moveRoom")}
                      disabled={pending}
                      onClick={() => openMoveRoom(menu.moveRoomDraft!)}
                    />
                  ) : null}
                  {canOfferOperativeCheckIn({
                    status: "confirmata",
                    plannedCheckIn: menu.plannedCheckIn,
                    today: menu.today,
                    actualCheckInAt: menu.actualCheckInAt,
                    actualCheckOutAt: menu.actualCheckOutAt,
                  }) && (
                    <MenuItem
                      label={t("checkInEllipsis")}
                      primary
                      disabled={pending}
                      onClick={() => {
                        requestCheckIn({
                          bookingId: menu.bookingId,
                          guestName: menu.guestName,
                          plannedCheckIn: menu.plannedCheckIn,
                          plannedCheckOut: menu.plannedCheckOut,
                          status: menu.status,
                          actualCheckInAt: menu.actualCheckInAt,
                          actualCheckOutAt: menu.actualCheckOutAt,
                          today: menu.today,
                        });
                        closeMenu();
                      }}
                    />
                  )}
                  {menu.actualCheckInAt && !menu.actualCheckOutAt && (
                    <MenuItem
                      label={t("checkOutEllipsis")}
                      primary
                      disabled={pending}
                      onClick={() => {
                        requestCheckOut({
                          bookingId: menu.bookingId,
                          guestName: menu.guestName,
                          plannedCheckIn: menu.plannedCheckIn,
                          plannedCheckOut: menu.plannedCheckOut,
                          actualCheckInAt: menu.actualCheckInAt,
                          actualCheckOutAt: menu.actualCheckOutAt,
                        });
                        closeMenu();
                      }}
                    />
                  )}
                  <MenuDivider />
                  <MenuItem
                    label={t("cancel")}
                    destructive
                    disabled={pending}
                    onClick={() =>
                      requestCancelBooking(
                        menu.bookingId,
                        menu.guestName,
                        menu.popover.checkIn,
                        menu.popover.checkOut,
                        false
                      )
                    }
                  />
                </>
              )}
            </>
          )}

          {!cancelConfirm && (menu.kind === "hold" || menu.kind === "block") && (
            <>
              <p className="gantt-ctx-menu__head">
                {menu.kind === "hold" ? t("holdOperator") : t("roomBlock")}
                {" · "}
                {menu.roomName}
              </p>
              <MenuItem
                label={menu.kind === "hold" ? t("extendHold") : t("extendBlock")}
                disabled={pending}
                onClick={extendOcc}
              />
              <MenuDivider />
              <MenuItem
                label={menu.kind === "hold" ? t("cancelHold") : t("cancelBlock")}
                destructive
                disabled={pending}
                onClick={releaseOcc}
              />
            </>
          )}
        </div>
      </AdminPortal>
    </>
  );
}
