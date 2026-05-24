"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import {
  adjustBookingStayNightsAction,
  deleteRoomBlockAction,
  duplicateBookingAsCerereAction,
  releaseRoomHoldAction,
} from "@/app/admin/(panel)/calendar/actions";
import { cancelBookingAction } from "@/app/admin/(panel)/bookings/actions";
import { useAdminFx } from "@/components/admin/feedback/AdminToastProvider";
import { AdminPortal } from "@/components/admin/overlay/AdminPortal";
import { useGanttContextMenu } from "@/components/admin/gantt/GanttContextMenuContext";
import { formatStayPeriod } from "@/lib/ro-calendar";

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
  const router = useRouter();
  const { menu, closeMenu, requestCreate, openMoveRoom, openOccDetail } =
    useGanttContextMenu();
  const { showToast, notifyCancel } = useAdminFx();
  const [pending, startTransition] = useTransition();

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
      showToast({ kind: "success", title: "Link copiat", message: url });
      closeMenu();
    });
  }

  function cancelBooking(
    bookingId: string,
    guestName: string,
    checkIn: string,
    checkOut: string,
    isCerere: boolean
  ) {
    if (
      !confirm(
        isCerere
          ? `Anulezi cererea ${guestName} · ${formatStayPeriod(checkIn, checkOut, true)}?`
          : `Anulezi cazarea ${guestName} · ${formatStayPeriod(checkIn, checkOut, true)}?`
      )
    ) {
      return;
    }
    const fd = new FormData();
    fd.set("id", bookingId);
    fd.set("return_to", "/admin/calendar");
    startTransition(async () => {
      await cancelBookingAction(fd);
      notifyCancel(isCerere ? "Cerere anulată" : "Cazare anulată", guestName);
      closeMenu();
      router.refresh();
    });
  }

  function adjustNights(bookingId: string, guestName: string, nightDelta: number) {
    startTransition(async () => {
      const res = await adjustBookingStayNightsAction(bookingId, nightDelta);
      if (!res.ok) {
        showToast({ kind: "error", title: "Eroare", message: res.error });
        return;
      }
      showToast({
        kind: "success",
        title: nightDelta > 0 ? "Sejur prelungit" : "Sejur scurtat",
        message: `${guestName} · ${formatStayPeriod(res.check_in, res.check_out, true)}`,
      });
      closeMenu();
      router.refresh();
    });
  }

  function duplicateBooking(bookingId: string, guestName: string) {
    startTransition(async () => {
      const res = await duplicateBookingAsCerereAction(bookingId);
      if (!res.ok) {
        showToast({ kind: "error", title: "Eroare", message: res.error });
        return;
      }
      showToast({
        kind: "success",
        title: "Duplicat ca cerere",
        message: `${guestName} · deschide cererea nouă`,
      });
      closeMenu();
      router.push(`/admin/bookings/${res.id}`);
      router.refresh();
    });
  }

  function releaseOcc() {
    if (menu?.kind !== "hold" && menu?.kind !== "block") return;
    const isHold = menu.kind === "hold";
    startTransition(async () => {
      const res = isHold
        ? await releaseRoomHoldAction(menu.segment.id)
        : await deleteRoomBlockAction(menu.segment.id);
      if (!res.ok) {
        showToast({ kind: "error", title: "Eroare", message: res.error });
        return;
      }
      notifyCancel(isHold ? "Hold eliberat" : "Blocare ștearsă", menu.roomName);
      closeMenu();
      router.refresh();
    });
  }

  return (
    <AdminPortal>
      <button
        type="button"
        className="gantt-ctx-menu-backdrop fixed inset-0 z-[199]"
        aria-label="Închide meniul"
        onClick={closeMenu}
      />
      <div
        className="gantt-ctx-menu fixed z-[200]"
        style={style}
        role="menu"
        aria-label="Master controller Gantt"
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {menu.kind === "create" && (
          <>
            <MenuSection
              title={
                menu.roomName
                  ? `${menu.roomName} · 1 noapte min.`
                  : `Timeline · ${formatStayPeriod(menu.checkIn, menu.checkOut, true)}`
              }
            >
              <MenuItem
                label="Creează cerere"
                hint={!menu.roomId ? "Click pe rând cameră" : undefined}
                disabled={!menu.roomId}
                onClick={() =>
                  menu.roomId &&
                  requestCreate({
                    roomId: menu.roomId,
                    roomName: menu.roomName ?? "Cameră",
                    checkIn: menu.checkIn,
                    checkOut: menu.checkOut,
                    hasConflict: menu.hasConflict,
                    initialMode: "cerere",
                  })
                }
              />
              <MenuItem
                label="Creează cazare directă"
                hint={!menu.roomId ? "Click pe rând cameră" : undefined}
                disabled={!menu.roomId}
                onClick={() =>
                  menu.roomId &&
                  requestCreate({
                    roomId: menu.roomId,
                    roomName: menu.roomName ?? "Cameră",
                    checkIn: menu.checkIn,
                    checkOut: menu.checkOut,
                    hasConflict: menu.hasConflict,
                    initialMode: "direct",
                  })
                }
              />
              <MenuItem
                label="Hold cameră"
                hint={!menu.roomId ? "Click pe rând cameră" : undefined}
                disabled={!menu.roomId}
                onClick={() =>
                  menu.roomId &&
                  requestCreate({
                    roomId: menu.roomId,
                    roomName: menu.roomName ?? "Cameră",
                    checkIn: menu.checkIn,
                    checkOut: menu.checkOut,
                    hasConflict: menu.hasConflict,
                    initialMode: "hold",
                  })
                }
              />
              <MenuItem
                label="Blocare cameră"
                hint={!menu.roomId ? "Click pe rând cameră" : undefined}
                disabled={!menu.roomId}
                onClick={() =>
                  menu.roomId &&
                  requestCreate({
                    roomId: menu.roomId,
                    roomName: menu.roomName ?? "Cameră",
                    checkIn: menu.checkIn,
                    checkOut: menu.checkOut,
                    hasConflict: menu.hasConflict,
                    initialMode: "block",
                  })
                }
              />
              <MenuItem
                label="Vezi disponibilitate săptămână"
                onClick={() => {
                  closeMenu();
                  router.push("/admin/disponibilitate");
                }}
              />
            </MenuSection>
            <p className="gantt-ctx-menu__hint px-3 py-2 text-[10px] text-zinc-500">
              Trage pentru interval · click dreapta / ține apăsat ~400ms
            </p>
          </>
        )}

        {menu.kind === "stay" && (
          <>
            <MenuSection title={menu.guestName}>
              <MenuItem
                label="Deschide detalii"
                onClick={() => {
                  closeMenu();
                  router.push(`/admin/bookings/${menu.bookingId}`);
                }}
              />
              {menu.status === "cerere_noua" && (
                <MenuItem
                  label="Confirmă"
                  hint="Deschide pagina cererii pentru confirmare"
                  onClick={() => {
                    closeMenu();
                    router.push(`/admin/bookings/${menu.bookingId}`);
                  }}
                />
              )}
              <MenuItem
                label="Anulează"
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
                label="Mută date…"
                hint="Alternativ: trage bara stânga/dreapta"
                onClick={() => {
                  showToast({
                    kind: "info",
                    title: "Mută date",
                    message: "Trage bara sejurului stânga/dreapta pe timeline.",
                  });
                  closeMenu();
                }}
              />
              {menu.canMoveRoom && menu.moveRoomDraft && (
                <MenuItem
                  label="Mută cameră…"
                  onClick={() => {
                    openMoveRoom(menu.moveRoomDraft!);
                    menu.popover.onMoveRoom?.();
                  }}
                />
              )}
              <MenuItem
                label="Prelungește (+1 noapte)"
                disabled={pending}
                onClick={() => adjustNights(menu.bookingId, menu.guestName, 1)}
              />
              <MenuItem
                label="Scurtează (−1 noapte)"
                disabled={pending}
                onClick={() => adjustNights(menu.bookingId, menu.guestName, -1)}
              />
              <MenuItem
                label="Duplică (rebook similar)"
                disabled={pending}
                onClick={() => duplicateBooking(menu.bookingId, menu.guestName)}
              />
              <MenuItem
                label="Istoric acțiuni"
            onClick={() => {
                  closeMenu();
                  router.push(`/admin/bookings/${menu.bookingId}#activitate`);
                }}
              />
              <MenuItem
                label="Copiază link admin"
                onClick={() => copyAdminLink(`/admin/bookings/${menu.bookingId}`)}
              />
            </MenuSection>
            <p className="gantt-ctx-menu__hint px-3 py-2 text-[10px] text-zinc-500">
              Click dreapta / ține apăsat ~400ms pe mobil
            </p>
          </>
        )}

        {(menu.kind === "hold" || menu.kind === "block") && (
          <>
            <MenuSection
              title={menu.kind === "hold" ? "Hold operator" : "Blocare cameră"}
            >
              <MenuItem
                label="Deschide detalii"
                onClick={() =>
                  openOccDetail({ segment: menu.segment, roomName: menu.roomName })
                }
              />
              {menu.kind === "hold" && (
                <>
                  <MenuItem
                    label="Convertește hold → cerere"
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
                    label="Convertește hold → cazare directă"
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
                label={menu.kind === "hold" ? "Anulează hold" : "Anulează blocare"}
                destructive
                disabled={pending}
                onClick={releaseOcc}
              />
            </MenuSection>
            <p className="gantt-ctx-menu__hint px-3 py-2 text-[10px] text-zinc-500">
              Click dreapta / ține apăsat ~400ms pe mobil
            </p>
          </>
        )}
      </div>
    </AdminPortal>
  );
}
