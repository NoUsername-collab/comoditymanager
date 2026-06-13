"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { extractMrzLinesFromOcrTexts } from "@/domain/guest/mrz-ocr";
import { parseMrzIdentity, type MrzMappedIdentity } from "@/domain/guest/mrz";
import { runMrzOcrOnImage } from "@/lib/mrz/run-mrz-ocr";

type TabId = "paste" | "camera";
export type MrzScanVariant = "admin" | "guest";

type Props = {
  open: boolean;
  variant: MrzScanVariant;
  translationNamespace: "admin.checkIn.mrz" | "guestApp.precheckin.mrz";
  onClose: () => void;
  onApply: (data: MrzMappedIdentity) => void;
};

function prefix(variant: MrzScanVariant): string {
  return variant === "guest" ? "guest-app__mrz" : "mrz-scan";
}

export function MrzScanPanel({
  open,
  variant,
  translationNamespace,
  onClose,
  onApply,
}: Props) {
  const t = useTranslations(translationNamespace);
  const tCommon = useTranslations(variant === "guest" ? "common" : "admin.common");
  const p = prefix(variant);
  const [tab, setTab] = useState<TabId>("paste");
  const [pasteValue, setPasteValue] = useState("");
  const [preview, setPreview] = useState<MrzMappedIdentity | null>(null);
  const [parsedLines, setParsedLines] = useState<string[]>([]);
  const [checksumValid, setChecksumValid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [pending, startTransition] = useTransition();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const resetState = useCallback(() => {
    setPasteValue("");
    setPreview(null);
    setParsedLines([]);
    setChecksumValid(true);
    setError(null);
    setCameraReady(false);
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      resetState();
      setTab("paste");
    }
  }, [open, resetState, stopCamera]);

  useEffect(() => {
    if (!open || tab !== "camera") {
      stopCamera();
      return;
    }

    let cancelled = false;
    void navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        void video.play().then(() => setCameraReady(true));
      })
      .catch(() => {
        if (!cancelled) setError(t("errors.camera"));
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, tab, stopCamera, t]);

  function showParseResult(
    lines: string[],
    result: ReturnType<typeof parseMrzIdentity>,
  ) {
    if (!result.ok) {
      setPreview(null);
      setParsedLines([]);
      setError(t(`errors.${result.error}`));
      return;
    }
    setParsedLines(lines);
    setPreview(result.data);
    setChecksumValid(result.data.checksumValid);
    setError(result.data.checksumValid ? null : t("errors.checksumInvalid"));
  }

  function handleParsePaste() {
    setError(null);
    const lines = pasteValue
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    showParseResult(lines, parseMrzIdentity(pasteValue));
  }

  function handleParseLines(lines: string[]) {
    setError(null);
    showParseResult(lines, parseMrzIdentity(lines));
  }

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !cameraReady) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    startTransition(async () => {
      try {
        setError(null);
        const texts = await runMrzOcrOnImage(canvas);
        const lines = extractMrzLinesFromOcrTexts(texts);
        if (!lines) {
          setPreview(null);
          setParsedLines([]);
          setError(t("errors.ocrNoMrz"));
          return;
        }
        setPasteValue(lines.join("\n"));
        handleParseLines(lines);
      } catch {
        setPreview(null);
        setError(t("errors.ocrFailed"));
      }
    });
  }

  function handleApply() {
    if (!preview || !checksumValid) return;
    onApply(preview);
    onClose();
  }

  const secondaryBtn =
    variant === "guest"
      ? `${p}__btn ${p}__btn--secondary`
      : "checkin-stepper__btn checkin-stepper__btn--secondary";
  const primaryBtn =
    variant === "guest"
      ? `${p}__btn ${p}__btn--primary`
      : "checkin-stepper__btn checkin-stepper__btn--primary";

  return (
    <>
      <p className={`${p}__intro`}>{t("intro")}</p>

      <div className={`${p}__tabs`} role="tablist">
        <button
          type="button"
          role="tab"
          className={
            tab === "paste" ? `${p}__tab ${p}__tab--active` : `${p}__tab`
          }
          onClick={() => setTab("paste")}
        >
          {t("tabPaste")}
        </button>
        <button
          type="button"
          role="tab"
          className={
            tab === "camera" ? `${p}__tab ${p}__tab--active` : `${p}__tab`
          }
          onClick={() => setTab("camera")}
        >
          {t("tabCamera")}
        </button>
      </div>

      {tab === "paste" ? (
        <div className={`${p}__pane`}>
          <label className={`${p}__field`}>
            <span className={`${p}__label`}>{t("pasteLabel")}</span>
            <textarea
              className={`${p}__textarea`}
              rows={5}
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value.toUpperCase())}
              placeholder={t("pastePlaceholder")}
              spellCheck={false}
            />
          </label>
          <button
            type="button"
            className={`${secondaryBtn} ${p}__parse-btn`}
            onClick={handleParsePaste}
          >
            {t("parse")}
          </button>
        </div>
      ) : (
        <div className={`${p}__pane`}>
          <div className={`${p}__camera-wrap`}>
            <video ref={videoRef} className={`${p}__video`} playsInline muted />
            <canvas ref={canvasRef} className="sr-only" />
          </div>
          <p className={`${p}__hint`}>{t("cameraHint")}</p>
          <button
            type="button"
            className={`${secondaryBtn} ${p}__parse-btn`}
            disabled={!cameraReady || pending}
            onClick={handleCapture}
          >
            {pending ? tCommon("loading") : t("capture")}
          </button>
        </div>
      )}

      {preview ? (
        <div className={`${p}__preview`}>
          <p className={`${p}__preview-title`}>{t("previewTitle")}</p>
          {parsedLines.length > 0 ? (
            <pre className={`${p}__raw-lines`}>{parsedLines.join("\n")}</pre>
          ) : null}
          <dl className={`${p}__preview-dl`}>
            <div>
              <dt>{t("fieldName")}</dt>
              <dd>
                {[preview.lastName, preview.firstName].filter(Boolean).join(" ") || "—"}
              </dd>
            </div>
            <div>
              <dt>{t("fieldDocument")}</dt>
              <dd>{preview.documentNumber ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("fieldNationalId")}</dt>
              <dd>{preview.nationalId ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("fieldBirthDate")}</dt>
              <dd>{preview.birthDate ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("fieldNationality")}</dt>
              <dd>{preview.nationality || "—"}</dd>
            </div>
          </dl>
          {!checksumValid ? <p className={`${p}__warn`}>{t("checksumWarning")}</p> : null}
          {preview.usedAutocorrect && checksumValid ? (
            <p className={`${p}__warn`}>{t("autocorrectWarning")}</p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className={`${p}__error`}>{error}</p> : null}

      <div className={`${p}__actions`}>
        <button type="button" className={secondaryBtn} onClick={onClose}>
          {tCommon("cancel")}
        </button>
        <button
          type="button"
          className={primaryBtn}
          disabled={!preview || !checksumValid}
          onClick={handleApply}
        >
          {t("apply")}
        </button>
      </div>
    </>
  );
}
