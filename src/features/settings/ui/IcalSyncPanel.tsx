"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput } from "@/components/admin/ui/AdminInput";
import {
  addIcalFeedAction,
  removeIcalFeedAction,
  rotateIcalExportAction,
  syncIcalNowAction,
} from "@/features/settings/actions/ical";
import type { RoomIcalFeed, RoomIcalOverview } from "@/services/ical-sync";

type Props = {
  rooms: RoomIcalOverview[];
  /** Origin the export addresses are built on (the property's own host). */
  origin: string;
};

function CopyField({ value, label }: { value: string; label: string }) {
  const t = useTranslations("admin.ical");
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the address stays visible to copy by hand */
    }
  }
  return (
    <div className="flex min-w-0 items-center gap-2">
      <input
        className="admin-field__input admin-field__input--sm min-w-0 flex-1 font-mono text-xs"
        value={value}
        readOnly
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
      />
      <AdminButton type="button" size="sm" variant="secondary" onClick={copy}>
        {copied ? t("copied") : t("copy")}
      </AdminButton>
    </div>
  );
}

function FeedStatus({ feed }: { feed: RoomIcalFeed }) {
  const t = useTranslations("admin.ical");
  const format = useFormatter();
  if (!feed.lastSyncedAt) {
    return <span className="text-xs text-[var(--admin-text-muted)]">{t("statusNever")}</span>;
  }
  const when = format.relativeTime(new Date(feed.lastSyncedAt));
  if (feed.lastStatus === "error") {
    const key = feed.lastError?.replace(/^ical\./, "") ?? "unreachable";
    return (
      <span className="text-xs text-[var(--admin-danger,#b91c1c)]" role="status">
        {t("statusError", {
          when,
          reason: t.has(`errors.${key}`) ? t(`errors.${key}`) : t("errors.unreachable"),
        })}
      </span>
    );
  }
  return (
    <span className="text-xs text-[var(--admin-text-muted)]">
      {t("statusOk", { when, count: feed.lastEventCount ?? 0 })}
      {feed.lastConflictCount ? (
        <strong className="ml-1 text-[var(--admin-danger,#b91c1c)]">
          {t("conflicts", { count: feed.lastConflictCount })}
        </strong>
      ) : null}
    </span>
  );
}

function RoomCard({ room, origin }: { room: RoomIcalOverview; origin: string }) {
  const t = useTranslations("admin.ical");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const exportUrl = `${origin}/api/ical/${room.exportToken}.ics`;

  function add() {
    setMessage(null);
    startTransition(async () => {
      const result = await addIcalFeedAction({ roomId: room.roomId, url, name });
      if (!result.ok) {
        setMessage({ tone: "error", text: t(`errors.${result.error}`) });
        return;
      }
      setUrl("");
      setName("");
      setMessage(
        result.syncError
          ? {
              tone: "error",
              text: t("addedButFailed", {
                reason: t(`errors.${result.syncError.replace(/^ical\./, "")}`),
              }),
            }
          : { tone: "ok", text: t("added") },
      );
    });
  }

  function remove(feed: RoomIcalFeed) {
    if (!window.confirm(t("removeConfirm", { name: feed.name }))) return;
    startTransition(async () => {
      await removeIcalFeedAction(feed.id);
    });
  }

  function rotate() {
    if (!window.confirm(t("rotateConfirm"))) return;
    startTransition(async () => {
      await rotateIcalExportAction(room.roomId);
    });
  }

  return (
    <li className="settings-section rounded-xl border border-[var(--admin-border)] p-4">
      <h3 className="m-0 text-base font-semibold">
        {room.roomName}
        {room.buildingName ? (
          <span className="ml-2 text-sm font-normal text-[var(--admin-text-muted)]">
            {room.buildingName}
          </span>
        ) : null}
      </h3>

      <div className="mt-3 flex flex-col gap-1">
        <span className="text-sm font-medium">{t("exportLabel")}</span>
        <span className="text-xs text-[var(--admin-text-muted)]">{t("exportHint")}</span>
        <CopyField value={exportUrl} label={t("exportLabel")} />
        <button
          type="button"
          className="self-start text-xs text-[var(--admin-text-muted)] underline"
          onClick={rotate}
          disabled={pending}
        >
          {t("rotate")}
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <span className="text-sm font-medium">{t("importLabel")}</span>
        {room.feeds.length === 0 ? (
          <span className="text-xs text-[var(--admin-text-muted)]">{t("importEmpty")}</span>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {room.feeds.map((feed) => (
              <li key={feed.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm">{feed.name}</span>
                  <FeedStatus feed={feed} />
                </span>
                <AdminButton
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(feed)}
                  disabled={pending}
                >
                  {t("remove")}
                </AdminButton>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <AdminInput
            fieldSize="sm"
            className="min-w-0 flex-[3]"
            type="url"
            inputMode="url"
            placeholder={t("urlPlaceholder")}
            aria-label={t("urlLabel")}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <AdminInput
            fieldSize="sm"
            className="min-w-0 flex-1"
            placeholder={t("namePlaceholder")}
            aria-label={t("nameLabel")}
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
          <AdminButton
            type="button"
            size="sm"
            variant="primary"
            onClick={add}
            disabled={pending || !url.trim()}
          >
            {pending ? t("adding") : t("add")}
          </AdminButton>
        </div>
        {message ? (
          <p
            className={`m-0 text-xs ${message.tone === "error" ? "text-[var(--admin-danger,#b91c1c)]" : "text-[var(--admin-text-muted)]"}`}
            role="status"
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function IcalSyncPanel({ rooms, origin }: Props) {
  const t = useTranslations("admin.ical");
  const [pending, startTransition] = useTransition();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const feedCount = rooms.reduce((sum, room) => sum + room.feeds.length, 0);

  function syncNow() {
    setSyncMessage(null);
    startTransition(async () => {
      const result = await syncIcalNowAction();
      setSyncMessage(
        !result.ok
          ? t(`errors.${result.error}`)
          : result.failed > 0
            ? t("syncedWithErrors", { count: result.failed })
            : t("synced"),
      );
    });
  }

  if (rooms.length === 0) {
    return <p className="settings-empty">{t("noRooms")}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <ol className="m-0 flex flex-col gap-1 pl-5 text-sm text-[var(--admin-text-muted)]">
        <li>{t("howExport")}</li>
        <li>{t("howImport")}</li>
        <li>{t("howOften")}</li>
      </ol>

      {feedCount > 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <AdminButton
            type="button"
            size="sm"
            variant="secondary"
            onClick={syncNow}
            disabled={pending}
          >
            {pending ? t("syncing") : t("syncNow")}
          </AdminButton>
          {syncMessage ? (
            <span className="text-xs text-[var(--admin-text-muted)]" role="status">
              {syncMessage}
            </span>
          ) : null}
        </div>
      ) : null}

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {rooms.map((room) => (
          <RoomCard key={room.roomId} room={room} origin={origin} />
        ))}
      </ul>
    </div>
  );
}
