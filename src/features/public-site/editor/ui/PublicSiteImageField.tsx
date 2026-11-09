"use client";

import { useId, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { PublicSiteMediaKind } from "@/domain/public-site/media";
import { isOptimizablePublicImageUrl } from "@/domain/public-site/media";
import {
  PUBLIC_IMAGE_ACCEPT,
  uploadPublicImage,
} from "@/features/public-site/editor/ui/upload-public-image";
import { SettingsFieldError } from "@/components/admin/settings/SettingsFieldError";
import { SettingsFieldHint } from "@/components/admin/settings/SettingsFieldHint";

export function PublicSiteImageField({
  value,
  onChange,
  kind,
  label,
  hint,
  error,
  disabled,
  allowUrl = true,
  fit = "cover",
}: {
  value: string;
  onChange: (url: string) => void;
  kind: PublicSiteMediaKind;
  label: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  /** Hide the paste-URL control. Owners upload a file. */
  allowUrl?: boolean;
  fit?: "cover" | "contain";
}) {
  const t = useTranslations("admin.pages.publicSite");
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(() => Boolean(value) && !isLikelyUploadedUrl(value));
  const displayError = error || localError;

  async function handleFile(file: File | undefined) {
    if (!file || disabled) return;
    setLocalError(null);
    setPending(true);
    try {
      const result = await uploadPublicImage(file, kind, t("mediaTooLarge"));
      if (!result.ok) {
        setLocalError(result.error);
        return;
      }
      onChange(result.url);
    } finally {
      setPending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="pub-image-field">
      <span className="pub-image-field__label">{label}</span>
      <div className="pub-image-field__row">
        <div
          className={
            fit === "contain"
              ? "pub-image-field__preview pub-image-field__preview--contain"
              : "pub-image-field__preview"
          }
          data-empty={!value || undefined}
        >
          {value ? (
            // A small resized copy: the original can be several megabytes.
            <Image
              src={value}
              alt=""
              fill
              sizes="96px"
              unoptimized={!isOptimizablePublicImageUrl(value)}
            />
          ) : (
            <span>{t("imageEmpty")}</span>
          )}
        </div>
        <div className="pub-image-field__actions">
          <input
            ref={fileRef}
            id={inputId}
            type="file"
            accept={PUBLIC_IMAGE_ACCEPT}
            hidden
            disabled={disabled || pending}
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <button
            type="button"
            className="pub-image-field__upload"
            disabled={disabled || pending}
            onClick={() => fileRef.current?.click()}
          >
            {pending ? t("uploadingPhoto") : value ? t("replacePhoto") : t("uploadPhoto")}
          </button>
          {value ? (
            <button
              type="button"
              className="pub-image-field__clear"
              disabled={disabled || pending}
              onClick={() => {
                setLocalError(null);
                onChange("");
              }}
            >
              {t("removePhoto")}
            </button>
          ) : null}
        </div>
      </div>
      {displayError ? (
        <SettingsFieldError>{displayError}</SettingsFieldError>
      ) : hint ? (
        <SettingsFieldHint>{hint}</SettingsFieldHint>
      ) : null}
      {allowUrl ? (
        <button
          type="button"
          className="pub-image-field__advanced"
          disabled={disabled}
          onClick={() => setShowUrl((open) => !open)}
        >
          {t("pasteUrlAdvanced")}
        </button>
      ) : null}
      {allowUrl && showUrl ? (
        <label className="pub-image-field__url">
          <span>{t("galleryUrlLabel")}</span>
          <input
            value={value}
            aria-invalid={!!error}
            disabled={disabled || pending}
            onChange={(event) => {
              setLocalError(null);
              onChange(event.target.value);
            }}
            placeholder="https://..."
          />
        </label>
      ) : null}
    </div>
  );
}

function isLikelyUploadedUrl(url: string): boolean {
  return url.includes("/storage/v1/object/public/public-site-media/");
}
