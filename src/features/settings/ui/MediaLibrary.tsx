"use client";

import Image from "next/image";
import { useRef, useState, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import {
  deleteMediaAction,
  reorderMediaAction,
  updateMediaAction,
  uploadMediaAction,
} from "@/features/settings/actions";
import { isOptimizablePublicImageUrl, PUBLIC_SITE_MEDIA_MAX_BYTES } from "@/domain/public-site/media";
import {
  MEDIA_ALBUMS,
  mediaFocus,
  type MediaAlbum,
  type MediaAsset,
  type MediaText,
} from "@/domain/media/types";

const ACCEPT = "image/jpeg,image/png,image/webp";
const LOCALES = ["ro", "en", "bg"] as const;

export type RoomTypeChoice = { id: string; name: string };

/**
 * The property's photos as a grid: albums as tabs, upload several at once (or
 * drop them), drag to reorder, and a photo's details beside the grid. With
 * `roomType` it shows and adds only that room type's photos.
 */
export function MediaLibrary({
  initial,
  roomTypes,
  roomType = null,
}: {
  initial: MediaAsset[];
  roomTypes: RoomTypeChoice[];
  /** Only this room type's photos: new ones go to the rooms album under it. */
  roomType?: RoomTypeChoice | null;
}) {
  const t = useTranslations("admin.pages.settings.photos");
  const [assets, setAssets] = useState(initial);
  const [album, setAlbum] = useState<MediaAlbum | "all">(roomType ? "rooms" : "all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropOver, setDropOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const visible = assets
    .filter((a) => (roomType ? a.roomTypeId === roomType.id : album === "all" || a.album === album))
    .sort((a, b) => (a.album === b.album ? a.sortOrder - b.sortOrder : MEDIA_ALBUMS.indexOf(a.album) - MEDIA_ALBUMS.indexOf(b.album)));
  const selected = assets.find((a) => a.id === selectedId) ?? null;
  const canReorder = roomType != null || album !== "all";

  async function upload(files: File[]) {
    const images = files.filter((f) => ACCEPT.split(",").includes(f.type));
    if (images.length === 0) return;
    setErrors([]);
    setUploading({ done: 0, total: images.length });
    const failed: string[] = [];
    for (const [index, file] of images.entries()) {
      if (file.size > PUBLIC_SITE_MEDIA_MAX_BYTES) {
        failed.push(t("tooLarge", { name: file.name }));
      } else {
        const body = new FormData();
        body.set("file", file);
        body.set("album", roomType ? "rooms" : album === "all" ? "other" : album);
        if (roomType) body.set("roomTypeId", roomType.id);
        const res = await uploadMediaAction(body);
        if (res.ok) setAssets((list) => [...list, res.value]);
        else failed.push(`${file.name}: ${res.error}`);
      }
      setUploading({ done: index + 1, total: images.length });
    }
    setUploading(null);
    setErrors(failed);
  }

  async function patch(id: string, change: Partial<MediaAsset>) {
    const before = assets;
    setAssets((list) => list.map((a) => (a.id === id ? { ...a, ...change } : a)));
    const res = await updateMediaAction(id, {
      album: change.album,
      roomTypeId: change.roomTypeId,
      alt: change.alt,
      focalX: change.focalX,
      focalY: change.focalY,
    });
    if (!res.ok) {
      setAssets(before);
      setErrors([res.error]);
    }
  }

  async function remove(asset: MediaAsset) {
    if (!window.confirm(t("deleteConfirm"))) return;
    const before = assets;
    setAssets((list) => list.filter((a) => a.id !== asset.id));
    setSelectedId(null);
    const res = await deleteMediaAction(asset.id);
    if (!res.ok) {
      setAssets(before);
      setErrors([res.error]);
    }
  }

  async function moveTo(dragged: string, target: string) {
    if (dragged === target) return;
    const ids = visible.map((a) => a.id);
    const from = ids.indexOf(dragged);
    const to = ids.indexOf(target);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]!);
    const before = assets;
    setAssets((list) => list.map((a) => (ids.includes(a.id) ? { ...a, sortOrder: ids.indexOf(a.id) } : a)));
    const res = await reorderMediaAction(ids);
    if (!res.ok) {
      setAssets(before);
      setErrors([res.error]);
    }
  }

  function onDropFiles(e: DragEvent) {
    e.preventDefault();
    setDropOver(false);
    if (e.dataTransfer.files.length > 0) void upload([...e.dataTransfer.files]);
  }

  const roomTypeName = (id: string | null) => roomTypes.find((r) => r.id === id)?.name ?? null;

  return (
    <div className="media-lib">
      {roomType ? null : (
        <div className="media-lib__tabs" role="tablist" aria-label={t("albums")}>
          {(["all", ...MEDIA_ALBUMS] as const).map((key) => {
            const count = key === "all" ? assets.length : assets.filter((a) => a.album === key).length;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={album === key}
                className="media-lib__tab"
                onClick={() => {
                  setAlbum(key);
                  setSelectedId(null);
                }}
              >
                {t(`album.${key}`)} <span>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div
        className="media-lib__drop"
        data-over={dropOver ? "1" : undefined}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDropOver(true);
          }
        }}
        onDragLeave={() => setDropOver(false)}
        onDrop={onDropFiles}
      >
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          multiple
          hidden
          onChange={(e) => {
            void upload([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
        <button type="button" className="media-lib__upload" onClick={() => fileInput.current?.click()} disabled={uploading != null}>
          {uploading ? t("uploading", { done: uploading.done, total: uploading.total }) : t("upload")}
        </button>
        <span>
          {roomType
            ? t("dropHintRoom", { room: roomType.name })
            : album === "all"
              ? t("dropHintAll")
              : t("dropHintAlbum", { album: t(`album.${album}`) })}
        </span>
      </div>

      {errors.length > 0 ? (
        <ul className="media-lib__errors" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      {visible.length === 0 ? (
        <p className="media-lib__empty">{roomType ? t("emptyRoom") : t("empty")}</p>
      ) : (
        <>
          {canReorder && visible.length > 1 ? <p className="media-lib__hint">{t("reorderHint")}</p> : null}
          <ul className="media-lib__grid">
            {visible.map((asset, index) => (
              <li
                key={asset.id}
                className="media-lib__cell"
                data-selected={asset.id === selectedId ? "1" : undefined}
                data-dragging={asset.id === dragId ? "1" : undefined}
                draggable={canReorder}
                onDragStart={(e) => {
                  setDragId(asset.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => {
                  if (dragId) e.preventDefault();
                }}
                onDrop={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  e.stopPropagation();
                  void moveTo(dragId, asset.id);
                  setDragId(null);
                }}
              >
                <button
                  type="button"
                  className="media-lib__thumb"
                  aria-pressed={asset.id === selectedId}
                  aria-label={t("open", { index: index + 1 })}
                  onClick={() => setSelectedId(asset.id === selectedId ? null : asset.id)}
                >
                  <Image
                    src={asset.url}
                    alt={asset.alt.ro ?? ""}
                    fill
                    sizes="180px"
                    style={{ objectFit: "cover", objectPosition: mediaFocus(asset) }}
                    unoptimized={!isOptimizablePublicImageUrl(asset.url)}
                  />
                  {index === 0 && canReorder ? <span className="media-lib__cover">{t("cover")}</span> : null}
                  {!roomType && roomTypeName(asset.roomTypeId) ? (
                    <span className="media-lib__tag">{roomTypeName(asset.roomTypeId)}</span>
                  ) : null}
                  {!asset.alt.ro && !asset.alt.en && !asset.alt.bg ? (
                    <span className="media-lib__missing" title={t("noAlt")}>
                      !
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {selected ? (
        <MediaDetails
          key={selected.id}
          asset={selected}
          roomTypes={roomTypes}
          lockRoomType={roomType != null}
          onPatch={(change) => patch(selected.id, change)}
          onDelete={() => remove(selected)}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}

function MediaDetails({
  asset,
  roomTypes,
  lockRoomType,
  onPatch,
  onDelete,
  onClose,
}: {
  asset: MediaAsset;
  roomTypes: RoomTypeChoice[];
  lockRoomType: boolean;
  onPatch: (change: Partial<MediaAsset>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const t = useTranslations("admin.pages.settings.photos");
  const [alt, setAlt] = useState<MediaText>(asset.alt);
  const altChanged = LOCALES.some((l) => (alt[l] ?? "") !== (asset.alt[l] ?? ""));

  return (
    <section className="media-lib__details" aria-label={t("details")}>
      <div className="media-lib__details-head">
        <h3>{t("details")}</h3>
        <button type="button" onClick={onClose}>
          {t("close")}
        </button>
      </div>

      <div className="media-lib__details-body">
        <div>
          <button
            type="button"
            className="media-lib__focus"
            aria-label={t("focusHint")}
            title={t("focusHint")}
            onClick={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              const x = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
              const y = Math.min(1, Math.max(0, (e.clientY - box.top) / box.height));
              onPatch({ focalX: Number(x.toFixed(3)), focalY: Number(y.toFixed(3)) });
            }}
          >
            <Image
              src={asset.url}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 360px"
              style={{ objectFit: "contain" }}
              unoptimized={!isOptimizablePublicImageUrl(asset.url)}
            />
            <span
              className="media-lib__focus-dot"
              style={{ left: `${asset.focalX * 100}%`, top: `${asset.focalY * 100}%` }}
              aria-hidden
            />
          </button>
          <p className="media-lib__hint">{t("focusHint")}</p>
        </div>

        <div className="admin-settings-fields">
          <label>
            <span>{t("albumLabel")}</span>
            <select value={asset.album} onChange={(e) => onPatch({ album: e.target.value as MediaAlbum })}>
              {MEDIA_ALBUMS.map((a) => (
                <option key={a} value={a}>
                  {t(`album.${a}`)}
                </option>
              ))}
            </select>
          </label>
          {lockRoomType ? null : (
            <label>
              <span>{t("roomTypeLabel")}</span>
              <select
                value={asset.roomTypeId ?? ""}
                onChange={(e) => onPatch({ roomTypeId: e.target.value || null })}
              >
                <option value="">{t("noRoomType")}</option>
                {roomTypes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {LOCALES.map((locale) => (
            <label key={locale}>
              <span>{t("altLabel", { language: locale.toUpperCase() })}</span>
              <input
                value={alt[locale] ?? ""}
                maxLength={300}
                placeholder={t("altPlaceholder")}
                onChange={(e) => setAlt((current) => ({ ...current, [locale]: e.target.value }))}
              />
            </label>
          ))}
          <div className="media-lib__details-actions">
            <button type="button" className="media-lib__save" disabled={!altChanged} onClick={() => onPatch({ alt })}>
              {t("saveAlt")}
            </button>
            <button type="button" className="media-lib__delete" onClick={onDelete}>
              {t("delete")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
