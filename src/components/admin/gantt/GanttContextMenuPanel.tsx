"use client";

import { useSearchParams } from "next/navigation"
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  useAdminPending,
  useRunAdminAction,
} from "@/components/admin/feedback/AdminPendingProvider";
import {
  adjustBookingStayNightsAction,
  deleteRoomBlockAction,
  duplicateBookingAsCerereAction,
  releaseRoomHoldAction,
} from "@/app/[locale]/admin/(panel)/calendar/actions";
import {
  cancelBookingAction,
  undoBookingCheckInAction,
  undoBookingCheckOutAction,
} from "@/app/[locale]/admin/(panel)/bookings/actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { AdminPortal } from "@/components/admin/overlay/AdminPortal";
import { GanttCheckTimeDialog } from "@/components/admin/gantt/GanttCheckTimeDialog";
import { useGanttContextMenu } from "@/components/admin/gantt/GanttContextMenuContext";
import { formatStayPeriod } from "@/lib/ro-calendar";
import { mergeAvailabilityPanelSearch } from "@/lib/availability-panel-query";

function MenuItem({
  label,
  hint,
  disabled,
  destructive,
  onClick,
}: {
  label: string;
  hint?: string;
  disabled?: boolean;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        "gantt-ctx-menu__item w-full px-3 py-2 text-left text-sm",
        destructive && "gantt-ctx-menu__item--danger",
        disabled && "gantt-ctx-menu__item--disabled",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
    >
      <span className="block font-medium">{label}</span>
      {hint ? <span className="block text-[10px] opacity-70">{hint}</span> : null}
    </button>
  );
}

function MenuSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="gantt-ctx-menu__section">
      {title ? <p className="gantt-ctx-menu__section-title">{title}</p> : null}
      {children}
    </div>
  );
}

export function GanttContextMenuPanel() {
  const t = useTranslations("admin.common");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { menu, closeMenu, requestCreate, openMoveRoom, openOccDetail } =
    useGanttContextMenu();
  const { showToast, notifyCancel } = useAdminFx();
  const { pending } = useAdminPending();
  const runAdminAction = useRunAdminAction();
  const [checkDialog, setCheckDialog] = useState<{
    mode: "checkin" | "checkout";
    bookingId: string;
    guestName: string;
    plannedCheckIn: string;
    plannedCheckOut: string;
  } | null>(null);

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
    left: Math.min(menu.clientX, window.innerWidth - 260),
    top: Math.min(menu.clientY, window.innerHeight - 420),
  };

  function copyAdminLink(path: string) {
    const url = `${window.location.origin}${path}`;
    void navigator.clipboard.writeText(url).then(() => {
      showToast({ kind: "success", title: t("linkCopied"), message: url });
      closeMenu();
    });
  }

  function openAvailability(dayIso?: string) {
    const rawFeat = searchParams.get("feat");
    const featureFilter = rawFeat === "ac" || rawFeat === "fridge" ? rawFeat : "all";
    const next = mergeAvailabilityPanelSearch(new URLSearchParams(searchParams.toString()), {
      open: true,
      year: dayIso ? Number(dayIso.slice(0, 4)) : undefined,
      month: dayIso ? Number(dayIso.slice(5, 7)) - 1 : undefined,
      day: dayIso ?? null,
      buildingId: searchParams.get("building"),
      view: "month",
      weekStart: null,
      featureFilter,
    });
    closeMenu();
    router.push(`/admin/calendar?${next.toString()}`);
  }

  function cancelBooking(
    bookingId: string,
    guestName: string,
    checkIn: string,
    checkOut: string,
    isCerere: boolean
  ) {
    const period = formatStayPeriod(checkIn, checkOut, locale, true);
    if (!confirm(isCerere ? t("cancelRequestConfirm", { name: guestName, period }) : t("cancelStayConfirm", { name: guestName, period }))) {
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

  function adjustNights(bookingId: string, guestName: string, nightDelta: number) {
    void runAdminAction(async () => {
      const res = await adjustBookingStayNightsAction(bookingId, nightDelta);
      if (!res.ok) {
        showToast({ kind: "error", title: t("error"), message: res.error });
        return;
      }
      showToast({
        kind: "success",
        title: nightDelta > 0 ? t("stayExtended") : t("stayShortened"),
        message: `${guestName} · ${formatStayPeriod(res.check_in, res.check_out, locale, true)}`,
      });
      closeMenu();
      router.refresh();
    });
  }

  function duplicateBooking(bookingId: string, guestName: string) {
    void runAdminAction(async () => {
      const res = await duplicateBookingAsCerereAction(bookingId);
      if (!res.ok) {
        showToast({ kind: "error", title: t("error"), message: res.error });
        return;
      }
      showToast({
        kind: "success",
        title: t("duplicateAsRequest"),
        message: `${guestName} · ${t("openNewRequest")}`,
      });
      closeMenu();
      router.push(`/admin/bookings/${res.id}`);
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
            <MenuSection
              title={
                menu.roomName
                  ? `${menu.roomName} ${t("oneNightMin")}`
                  : `${t("timeline")} · ${formatStayPeriod(menu.checkIn, menu.checkOut, locale, true)}`
              }
            >
              <MenuItem
                label={t("createRequest")}
                hint={!menu.roomId ? t("clickRoomRow") : undefined}
                disabled={!menu.roomId}
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
                hint={!menu.roomId ? t("clickRoomRow") : undefined}
                disabled={!menu.roomId}
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
                hint={!menu.roomId ? t("clickRoomRow") : undefined}
                disabled={!menu.roomId}
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
                hint={!menu.roomId ? t("clickRoomRow") : undefined}
                disabled={!menu.roomId}
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
              <MenuItem
                label={t("openHeatmap")}
                onClick={() => {
                  openAvailability(menu.checkIn);
                }}
              />
            </MenuSection>
            <p className="gantt-ctx-menu__hint px-3 py-2 text-[10px] text-zinc-500">
              {t("dragHint")}
            </p>
          </>
        )}

        {menu.kind === "stay" && (
          <>
            <MenuSection title={menu.guestName}>
              <MenuItem
                label={t("openDetails")}
                onClick={() => {
                  closeMenu();
                  router.push(`/admin/bookings/${menu.bookingId}`);
                }}
              />
              {menu.status === "cerere_noua" && (
                <MenuItem
                  label={t("confirmRequest")}
                  hint={t("confirmRequestHint")}
                  onClick={() => {
                    closeMenu();
                    router.push(`/admin/bookings/${menu.bookingId}`);
                  }}
                />
              )}
              {menu.status === "confirmata" && !menu.actualCheckInAt && (
                <MenuItem
                  label={t("checkInEllipsis")}
                  hint={t("checkInHint")}
                  disabled={pending}
                  onClick={() => {
                    setCheckDialog({
                      mode: "checkin",
                      bookingId: menu.bookingId,
                      guestName: menu.guestName,
                      plannedCheckIn: menu.plannedCheckIn,
                      plannedCheckOut: menu.plannedCheckOut,
                    });
                    closeMenu();
                  }}
                />
              )}
              {menu.status === "confirmata" &&
                menu.actualCheckInAt &&
                !menu.actualCheckOutAt && (
                  <>
                    <MenuItem
                      label={t("checkOutEllipsis")}
                      hint={t("checkOutHint")}
                      disabled={pending}
                      onClick={() => {
                        setCheckDialog({
                          mode: "checkout",
                          bookingId: menu.bookingId,
                          guestName: menu.guestName,
                          plannedCheckIn: menu.plannedCheckIn,
                          plannedCheckOut: menu.plannedCheckOut,
                        });
                        closeMenu();
                      }}
                    />
                    <MenuItem
                      label={t("undoCheckIn")}
                      disabled={pending}
                      onClick={() => {
                        if (
                          !confirm(
                            t("undoCheckInConfirm", { name: menu.guestName })
                          )
                        ) {
                          return;
                        }
                        void runAdminAction(async () => {
                          const fd = new FormData();
                          fd.set("id", menu.bookingId);
                          const res = await undoBookingCheckInAction(fd);
                          if (!res.ok) {
                            showToast({
                              kind: "error",
                              title: t("error"),
                              message: res.error,
                            });
                            return;
                          }
                          showToast({
                            kind: "success",
                            title: t("checkInUndone"),
                            message: menu.guestName,
                          });
                          closeMenu();
                          router.refresh();
                        });
                      }}
                    />
                  </>
                )}
              {menu.status === "confirmata" && menu.actualCheckOutAt && (
                <MenuItem
                  label={t("undoCheckOut")}
                  disabled={pending}
                  onClick={() => {
                    if (
                      !confirm(t("undoCheckOutConfirm", { name: menu.guestName }))
                    ) {
                      return;
                    }
                    void runAdminAction(async () => {
                      const fd = new FormData();
                      fd.set("id", menu.bookingId);
                      const res = await undoBookingCheckOutAction(fd);
                      if (!res.ok) {
                        showToast({
                          kind: "error",
                          title: t("error"),
                          message: res.error,
                        });
                        return;
                      }
                      showToast({
                        kind: "success",
                        title: t("checkOutUndone"),
                        message: menu.guestName,
                      });
                      closeMenu();
                      router.refresh();
                    });
                  }}
                />
              )}
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
                    menu.status === "cerere_noua"
                  )
                }
              />
              <MenuItem
                label={t("moveDates")}
                hint={t("moveDatesHint")}
                onClick={() => {
                  showToast({
                    kind: "info",
                    title: t("moveDates"),
                    message: t("moveDatesToast"),
                  });
                  closeMenu();
                }}
              />
              {menu.canMoveRoom && menu.moveRoomDraft && (
                <MenuItem
                  label={t("moveRoom")}
                  onClick={() => {
                    openMoveRoom(menu.moveRoomDraft!);
                    menu.popover.onMoveRoom?.();
                  }}
                />
              )}
              <MenuItem
                label={t("extendNight")}
                disabled={pending}
                onClick={() => adjustNights(menu.bookingId, menu.guestName, 1)}
              />
              <MenuItem
                label={t("shortenNight")}
                disabled={pending}
                onClick={() => adjustNights(menu.bookingId, menu.guestName, -1)}
              />
              <MenuItem
                label={t("duplicateRebook")}
                disabled={pending}
                onClick={() => duplicateBooking(menu.bookingId, menu.guestName)}
              />
              <MenuItem
                label={t("actionHistory")}
            onClick={() => {
                  closeMenu();
                  router.push(`/admin/bookings/${menu.bookingId}#activitate`);
                }}
              />
              <MenuItem
                label={t("copyAdminLink")}
                onClick={() => copyAdminLink(`/admin/bookings/${menu.bookingId}`)}
              />
            </MenuSection>
            <p className="gantt-ctx-menu__hint px-3 py-2 text-[10px] text-zinc-500">
              {t("mobileHint")}
            </p>
          </>
        )}

        {(menu.kind === "hold" || menu.kind === "block") && (
          <>
            <MenuSection
              title={menu.kind === "hold" ? t("holdOperator") : t("roomBlock")}
            >
              <MenuItem
                label={t("openDetails")}
                onClick={() =>
                  openOccDetail({ segment: menu.segment, roomName: menu.roomName })
                }
              />
              {menu.kind === "hold" && (
                <>
                  <MenuItem
                    label={t("convertHoldRequest")}
                    onClick={() =>
                      requestCreate({
                        roomId: menu.segment.roomId,
                        roomName: menu.roomName,
                        checkIn: menu.segment.checkIn,
                        checkOut: menu.segment.checkOut,
                        hasConflict: false,
                        initialMode: "cerere",
                      })
                    }
                  />
                  <MenuItem
                    label={t("convertHoldDirect")}
                    onClick={() =>
                      requestCreate({
                        roomId: menu.segment.roomId,
                        roomName: menu.roomName,
                        checkIn: menu.segment.checkIn,
                        checkOut: menu.segment.checkOut,
                        hasConflict: false,
                        initialMode: "direct",
                      })
                    }
                  />
                </>
              )}
              <MenuItem
                label={menu.kind === "hold" ? t("cancelHold") : t("cancelBlock")}
                destructive
                disabled={pending}
                onClick={releaseOcc}
              />
            </MenuSection>
            <p className="gantt-ctx-menu__hint px-3 py-2 text-[10px] text-zinc-500">
              {t("mobileHint")}
            </p>
          </>
        )}
      </div>
    </AdminPortal>
    {checkDialog && (
      <GanttCheckTimeDialog
        open
        mode={checkDialog.mode}
        bookingId={checkDialog.bookingId}
        guestName={checkDialog.guestName}
        plannedCheckIn={checkDialog.plannedCheckIn}
        plannedCheckOut={checkDialog.plannedCheckOut}
        onClose={() => setCheckDialog(null)}
        onSuccess={() => router.refresh()}
      />
    )}
    </>
  );
}
