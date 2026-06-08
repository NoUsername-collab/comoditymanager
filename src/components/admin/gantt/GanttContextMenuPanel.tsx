"use client";

import { useEffect } from "react";
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
} from "@/app/[locale]/admin/(panel)/calendar/actions";
import { cancelBookingAction } from "@/app/[locale]/admin/(panel)/bookings/actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { AdminPortal } from "@/components/admin/overlay/AdminPortal";
import { useGanttContextMenu } from "@/components/admin/gantt/GanttContextMenuContext";
import { useGanttOperativeCheck } from "@/components/admin/gantt/GanttOperativeCheckProvider";
import { canOfferOperativeCheckIn } from "@/domain/booking/operative-checkin";
import { formatStayPeriod } from "@/lib/ro-calendar";

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
  const { menu, closeMenu, requestCreate } = useGanttContextMenu();
  const { showToast, notifyCancel } = useAdminFx();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const { requestCheckIn, requestCheckOut } = useGanttOperativeCheck();

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu, closeMenu]);

  if (!menu) return null;

  const style = {
    left: Math.min(menu.clientX, window.innerWidth - 240),
    top: Math.min(menu.clientY, window.innerHeight - 320),
  };

  function openBooking(bookingId: string) {
    closeMenu();
    router.push(`/admin/bookings/${bookingId}`);
  }

  function cancelBooking(
    bookingId: string,
    guestName: string,
    checkIn: string,
    checkOut: string,
    isCerere: boolean
  ) {
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
    const fd = new FormData();
    fd.set("id", bookingId);
    fd.set("return_to", "/admin/calendar");
    void runAdminAction(async () => {
      await cancelBookingAction(fd);
      notifyCancel(isCerere ? t("requestCancelled") : t("stayCancelled"), guestName);
      closeMenu();
      router.refresh();
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
      router.refresh();
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
          className="gantt-ctx-menu fixed z-[200]"
          style={style}
          role="menu"
          aria-label={t("masterController")}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {menu.kind === "create" && (
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

          {menu.kind === "stay" && (
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
                      cancelBooking(
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
                      cancelBooking(
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

          {(menu.kind === "hold" || menu.kind === "block") && (
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
