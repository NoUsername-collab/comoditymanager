"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import type {
  PublicSiteEditorTab,
  PublicSiteReadinessItem,
} from "@/features/public-site/editor/model/editor-model";

/**
 * "Publish" in the studio's top bar, with the number of things still missing on
 * it. It opens the checklist, the publish / hide switch and, once online, the
 * address to share, so what is left to do is in sight while editing.
 */
export function PublicSitePublishControl({
  readiness,
  onGoTo,
  onPublish,
  pending,
  dirty,
  published,
  live,
  readOnly,
  siteUrl,
  siteName,
}: {
  readiness: PublicSiteReadinessItem[];
  onGoTo: (tab: PublicSiteEditorTab) => void;
  /** Flip visibility and save in one go. */
  onPublish: (published: boolean) => void;
  pending: boolean;
  dirty: boolean;
  /** The draft's switch. */
  published: boolean;
  /** The saved state: the site is online for visitors now. */
  live: boolean;
  readOnly: boolean;
  siteUrl: string;
  siteName: string;
}) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const required = readiness.filter((item) => !item.optional);
  const missing = required.filter((item) => !item.done).length;

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      // Closes the panel only; the studio's own Escape (leave) must not fire.
      event.preventDefault();
      setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div className="pub-publish" ref={rootRef}>
      <button
        type="button"
        className="pub-publish__trigger"
        data-on={published ? "1" : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="pub-publish__dot" aria-hidden />
        {te(published ? "publishedOnShort" : "publishedOffShort")}
        {missing > 0 ? (
          <span className="pub-publish__badge" aria-label={te("missingCount", { count: missing })}>
            {missing}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="pub-publish__panel" role="dialog" aria-label={te("checklistTitle")}>
          <p className="pub-publish__heading">
            {te("checklistTitle")}
            <small>{te("checklistDone", { done: required.length - missing, total: required.length })}</small>
          </p>
          <ul className="pub-editor-checklist">
            {readiness.map((item) => (
              <li
                key={item.id}
                data-done={item.done ? "1" : undefined}
                data-optional={item.optional ? "1" : undefined}
              >
                <span className="pub-editor-checklist__mark" aria-hidden>
                  {item.done ? "✓" : item.optional ? "○" : "!"}
                </span>
                <span className="pub-editor-checklist__label">{te(`checks.${item.id}`)}</span>
                {!item.done ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onGoTo(item.tab);
                    }}
                  >
                    {te("checkFix")}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          <div className="pub-editor-publish" data-on={published ? "1" : undefined}>
            <p className="pub-editor-publish__text" role="status">
              <strong>{te(published ? "publishedOn" : "publishedOff")}</strong>
              <small>{te(published ? "publishedOnDesc" : "publishedOffDesc")}</small>
            </p>
            {!readOnly ? (
              <>
                <AdminButton
                  type="button"
                  variant={published ? "secondary" : "primary"}
                  className="pub-editor-publish__btn"
                  disabled={pending}
                  onClick={() => onPublish(!published)}
                >
                  {pending ? te("publishing") : te(published ? "unpublishButton" : "publishButton")}
                </AdminButton>
                {!published && missing > 0 ? (
                  <p className="pub-editor-publish__note">{te("publishAnyway", { count: missing })}</p>
                ) : null}
                {dirty ? <p className="pub-editor-publish__note">{te("publishSavesAll")}</p> : null}
              </>
            ) : null}
          </div>

          {live && published ? <SiteShare siteUrl={siteUrl} name={siteName} /> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Once online: the address in plain sight, ready to copy or send. */
function SiteShare({ siteUrl, name }: { siteUrl: string; name: string }) {
  const te = useTranslations("admin.pages.publicSite.editor");
  const [copied, setCopied] = useState(false);
  const shown = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    te("shareMessage", { name, url: siteUrl }),
  )}`;

  function copy() {
    void navigator.clipboard
      .writeText(siteUrl)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  }

  return (
    <div className="pub-editor-share">
      <p className="pub-editor-share__label">{te("shareTitle")}</p>
      <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="pub-editor-share__url">
        {shown}
      </a>
      <div className="pub-editor-share__actions">
        <AdminButton type="button" variant="secondary" size="sm" onClick={copy}>
          {copied ? te("shareCopied") : te("shareCopy")}
        </AdminButton>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="pub-editor-share__whatsapp"
        >
          {te("shareWhatsapp")}
        </a>
      </div>
    </div>
  );
}
