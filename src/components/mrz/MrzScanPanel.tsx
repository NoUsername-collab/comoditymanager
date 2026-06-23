"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type RefCallback,
} from "react";
import { useTranslations } from "next-intl";
import { extractMrzLinesFromOcrTexts } from "@/domain/guest/mrz-ocr";
import type { MrzMappedIdentity, MrzParseResult } from "@/domain/guest/mrz";
import {
  attachStreamToVideo,
  clearCaptureCanvas,
  hasTorchSupport,
  isUserFacingStream,
  MRZ_SCAN_INTERVAL_MS,
  requestCameraStream,
  setTorchEnabled,
  stopMediaStream,
  waitForVideoDimensions,
} from "@/lib/mrz/camera";
import { mrzCameraErrorMessage } from "@/lib/mrz/camera-error-message";
import {
  createStableMrzReader,
} from "@/lib/mrz/stable-read";

type TabId = "paste" | "camera";
export type MrzScanVariant = "admin" | "guest";

type CameraPhase = "idle" | "starting" | "ready" | "scanning" | "success";

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

function prefersCameraTab(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
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
  const [tab, setTab] = useState<TabId>(() =>
    prefersCameraTab() ? "camera" : "paste",
  );
  const [pasteValue, setPasteValue] = useState("");
  const [preview, setPreview] = useState<MrzMappedIdentity | null>(null);
  const [parsedLines, setParsedLines] = useState<string[]>([]);
  const [checksumValid, setChecksumValid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraPhase, setCameraPhase] = useState<CameraPhase>("idle");
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [mirrorVideo, setMirrorVideo] = useState(false);
  const [stableProgress, setStableProgress] = useState<{
    count: number;
    required: number;
  } | null>(null);
  const [pending, startTransition] = useTransition();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanBusyRef = useRef(false);
  const lastScanAtRef = useRef(0);
  const stableReaderRef = useRef(createStableMrzReader());
  const cameraErrorT = useRef(t);
  cameraErrorT.current = t;

  const cameraReady = cameraPhase === "ready" || cameraPhase === "scanning" || cameraPhase === "success";

  const resetState = useCallback(() => {
    setPasteValue("");
    setPreview(null);
    setParsedLines([]);
    setChecksumValid(true);
    setError(null);
    setCameraPhase("idle");
    setTorchOn(false);
    setTorchAvailable(false);
    setMirrorVideo(false);
    scanBusyRef.current = false;
    lastScanAtRef.current = 0;
    stableReaderRef.current.reset();
    setStableProgress(null);
  }, []);

  const stopCamera = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    setCameraPhase("idle");
    setTorchOn(false);
    setTorchAvailable(false);
    setMirrorVideo(false);
    scanBusyRef.current = false;
  }, []);

  const bindStreamToVideo = useCallback(async (video: HTMLVideoElement) => {
    const stream = streamRef.current;
    if (!stream) return;

    try {
      await attachStreamToVideo(video, stream);
      if (streamRef.current !== stream) return;

      setMirrorVideo(isUserFacingStream(stream));
      setTorchAvailable(hasTorchSupport(stream));
      setCameraPhase("ready");
      setError(null);
    } catch (err) {
      if (streamRef.current === stream) {
        setCameraPhase("idle");
        setError(mrzCameraErrorMessage(cameraErrorT.current, err));
      }
    }
  }, []);

  const setVideoRef: RefCallback<HTMLVideoElement> = useCallback(
    (node) => {
      const prev = videoRef.current;
      if (prev && prev !== node) {
        prev.srcObject = null;
      }
      videoRef.current = node;
      setVideoEl(node);
      if (node && streamRef.current) {
        void bindStreamToVideo(node);
      }
    },
    [bindStreamToVideo],
  );

  useEffect(() => {
    if (!open) {
      stopCamera();
      resetState();
      setVideoEl(null);
      setTab(prefersCameraTab() ? "camera" : "paste");
      void import("@/lib/mrz/run-mrz-ocr").then((m) => m.terminateMrzOcrWorker());
    }
  }, [open, resetState, stopCamera]);

  useEffect(() => {
    if (!open || tab !== "camera") {
      stopCamera();
      return;
    }
    if (!videoEl) return;

    let cancelled = false;
    setCameraPhase("starting");
    setError(null);

    void (async () => {
      try {
        const stream = await requestCameraStream();
        if (cancelled) {
          stopMediaStream(stream);
          return;
        }

        streamRef.current = stream;
        await bindStreamToVideo(videoEl);
      } catch (err) {
        if (cancelled) return;
        setCameraPhase("idle");
        setError(mrzCameraErrorMessage(cameraErrorT.current, err));
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, tab, videoEl, stopCamera, bindStreamToVideo]);

  function showParseResult(lines: string[], result: MrzParseResult) {
    if (!result.ok) {
      setPreview(null);
      setParsedLines(lines.length > 0 ? lines : []);
      setError(t(`errors.${result.error}`));
      setCameraPhase(cameraReady ? "ready" : "idle");
      return;
    }
    setParsedLines(lines);
    setPreview(result.data);
    setChecksumValid(true);
    setError(null);
    setStableProgress(null);
    stableReaderRef.current.reset();
    setCameraPhase("success");
  }

  async function handleParsePaste() {
    setError(null);
    const lines = pasteValue
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const { parseMrzIdentity } = await import("@/domain/guest/mrz");
    showParseResult(lines, await parseMrzIdentity(pasteValue));
  }

  const captureFrame = useCallback(
    async (manual: boolean): Promise<boolean> => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !cameraReady || scanBusyRef.current) {
        return false;
      }

      const now = Date.now();
      if (!manual && now - lastScanAtRef.current < MRZ_SCAN_INTERVAL_MS) {
        return false;
      }

      scanBusyRef.current = true;
      lastScanAtRef.current = now;
      if (manual) {
        setCameraPhase("scanning");
      }
      setError(null);

      try {
        await waitForVideoDimensions(video);

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          if (manual) setError(t("errors.ocrFailed"));
          setCameraPhase("ready");
          return false;
        }
        ctx.drawImage(video, 0, 0);

        const { runMrzOcrOnImage } = await import("@/lib/mrz/run-mrz-ocr");
        const texts = await runMrzOcrOnImage(canvas);
        clearCaptureCanvas(canvas);

        const lines = extractMrzLinesFromOcrTexts(texts);
        if (!lines) {
          stableReaderRef.current.push(null);
          setStableProgress(null);
          if (manual) {
            setPreview(null);
            setParsedLines([]);
            setError(t("errors.ocrNoMrz"));
          }
          setCameraPhase("ready");
          return false;
        }

        const { parseMrzIdentity } = await import("@/domain/guest/mrz");
        const result = await parseMrzIdentity(lines);
        if (!result.ok) {
          stableReaderRef.current.push(null);
          setStableProgress(null);
          if (manual) {
            showParseResult(lines, result);
          } else if (result.error === "checksum_failed") {
            setError(t("errors.checksum_failed"));
          }
          setCameraPhase("ready");
          return false;
        }

        if (!manual) {
          const state = stableReaderRef.current.push(lines);
          setStableProgress({ count: state.count, required: state.required });
          if (!state.stable) {
            setCameraPhase("ready");
            return false;
          }
        } else {
          stableReaderRef.current.reset();
          setStableProgress(null);
        }

        setPasteValue(lines.join("\n"));
        showParseResult(lines, result);
        return true;
      } catch {
        if (manual) {
          setPreview(null);
          setError(t("errors.ocrFailed"));
        }
        setCameraPhase("ready");
        return false;
      } finally {
        scanBusyRef.current = false;
      }
    },
    [cameraReady, t],
  );

  useEffect(() => {
    if (!open || tab !== "camera" || cameraPhase !== "ready" || preview) {
      return;
    }

    let cancelled = false;
    let timerId = 0;

    const schedule = () => {
      timerId = window.setTimeout(async () => {
        if (cancelled) return;
        await captureFrame(false);
        if (!cancelled && !preview) schedule();
      }, MRZ_SCAN_INTERVAL_MS);
    };

    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [open, tab, cameraPhase, preview, captureFrame]);

  function handleCapture() {
    startTransition(() => {
      void captureFrame(true);
    });
  }

  async function handleTorchToggle() {
    const stream = streamRef.current;
    if (!stream || !torchAvailable) return;
    const next = !torchOn;
    const ok = await setTorchEnabled(stream, next);
    if (ok) setTorchOn(next);
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

  const statusMessage =
    cameraPhase === "starting"
      ? t("cameraStarting")
      : cameraPhase === "scanning"
        ? t("cameraScanning")
        : stableProgress && stableProgress.count < stableProgress.required
          ? t("stabilizing", {
              count: stableProgress.count,
              required: stableProgress.required,
            })
          : cameraPhase === "success" && checksumValid
            ? t("scanSuccess")
            : null;

  function retryCamera() {
    stopCamera();
    setTab("camera");
  }

  return (
    <>
      <p className={`${p}__intro`}>{t("intro")}</p>

      <div
        className="sr-only"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {error ?? (preview && checksumValid ? t("previewTitle") : "")}
      </div>

      <div className={`${p}__tabs`} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "paste"}
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
          aria-selected={tab === "camera"}
          className={
            tab === "camera" ? `${p}__tab ${p}__tab--active` : `${p}__tab`
          }
          onClick={() => setTab("camera")}
        >
          {t("tabCamera")}
        </button>
      </div>

      {tab === "paste" ? (
        <div className={`${p}__pane`} role="tabpanel">
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
            onClick={() => void handleParsePaste()}
          >
            {t("parse")}
          </button>
        </div>
      ) : (
        <div className={`${p}__pane`} role="tabpanel">
          <div
            className={`${p}__camera-wrap`}
            data-phase={cameraPhase}
            aria-busy={cameraPhase === "starting" || cameraPhase === "scanning"}
          >
            <video
              ref={setVideoRef}
              className={
                mirrorVideo ? `${p}__video ${p}__video--mirror` : `${p}__video`
              }
              autoPlay
              playsInline
              muted
            />
            <div className={`${p}__frame-guide`} aria-hidden>
              <span className={`${p}__frame-guide-label`}>{t("frameGuide")}</span>
            </div>
            {cameraPhase === "starting" ? (
              <div className={`${p}__camera-status`} role="status">
                {t("cameraStarting")}
              </div>
            ) : null}
            {cameraPhase === "scanning" ? (
              <div className={`${p}__camera-status ${p}__camera-status--scan`} role="status">
                {t("cameraScanning")}
              </div>
            ) : null}
            {cameraPhase === "success" && checksumValid ? (
              <div className={`${p}__camera-status ${p}__camera-status--ok`} role="status">
                {t("scanSuccess")}
              </div>
            ) : null}
            {torchAvailable ? (
              <button
                type="button"
                className={`${p}__torch-btn`}
                aria-pressed={torchOn}
                aria-label={torchOn ? t("torchOff") : t("torchOn")}
                onClick={() => void handleTorchToggle()}
              >
                {torchOn ? t("torchOff") : t("torchOn")}
              </button>
            ) : null}
            <canvas ref={canvasRef} className="sr-only" aria-hidden />
          </div>
          <p className={`${p}__hint`}>{t("cameraHint")}</p>
          {statusMessage ? (
            <p className={`${p}__status`} role="status">
              {statusMessage}
            </p>
          ) : null}
          <div className={`${p}__camera-actions`}>
            <button
              type="button"
              className={`${secondaryBtn} ${p}__parse-btn`}
              disabled={!cameraReady || pending}
              onClick={handleCapture}
            >
              {pending ? tCommon("loading") : t("capture")}
            </button>
            {cameraReady ? (
              <button
                type="button"
                className={`${secondaryBtn} ${p}__stop-btn`}
                onClick={stopCamera}
              >
                {t("cameraStop")}
              </button>
            ) : null}
            {error && tab === "camera" && cameraPhase === "idle" ? (
              <button
                type="button"
                className={`${secondaryBtn} ${p}__retry-btn`}
                onClick={retryCamera}
              >
                {t("cameraRetry")}
              </button>
            ) : null}
            <button
              type="button"
              className={`${p}__manual-link`}
              onClick={() => setTab("paste")}
            >
              {t("manualFallback")}
            </button>
          </div>
        </div>
      )}

      {tab === "paste" ? (
        <button
          type="button"
          className={`${p}__manual-link ${p}__manual-link--below-tabs`}
          onClick={() => setTab("camera")}
        >
          {t("tabCamera")}
        </button>
      ) : null}

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
          {tab === "camera" && !checksumValid ? (
            <button
              type="button"
              className={`${secondaryBtn} ${p}__parse-btn`}
              onClick={() => {
                setPreview(null);
                setParsedLines([]);
                setError(null);
                setCameraPhase("ready");
              }}
            >
              {t("scanRetry")}
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className={`${p}__error`} role="alert">
          {error}
        </p>
      ) : null}

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
