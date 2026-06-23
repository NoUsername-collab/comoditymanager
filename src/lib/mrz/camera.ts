/** Camera helpers for MRZ scan — secure context, fallbacks, video attach. */

export type CameraErrorCode = "unsupported" | "denied" | "unavailable";

export const MRZ_SCAN_INTERVAL_MS = 1400;

export class CameraError extends Error {
  constructor(readonly code: CameraErrorCode) {
    super(code);
    this.name = "CameraError";
  }
}

const CAMERA_CONSTRAINTS: MediaStreamConstraints[] = [
  {
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  },
  { video: { facingMode: "environment" }, audio: false },
  { video: { facingMode: "user" }, audio: false },
  { video: true, audio: false },
];

function classifyGetUserMediaError(err: unknown): CameraErrorCode {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      return "denied";
    }
    if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
      return "unavailable";
    }
  }
  return "unavailable";
}

/** Request a camera stream with environment → user → default fallbacks. */
export async function requestCameraStream(): Promise<MediaStream> {
  if (typeof window === "undefined") {
    throw new CameraError("unsupported");
  }
  if (!window.isSecureContext) {
    throw new CameraError("unsupported");
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new CameraError("unsupported");
  }

  let lastError: unknown;
  for (const constraints of CAMERA_CONSTRAINTS) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      lastError = err;
    }
  }

  throw new CameraError(classifyGetUserMediaError(lastError));
}

/** iOS/Safari-friendly inline playback attributes. */
export function prepareVideoElement(video: HTMLVideoElement): void {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.setAttribute("muted", "true");
}

/** Attach a MediaStream to a video element and start playback. */
export async function attachStreamToVideo(
  video: HTMLVideoElement,
  stream: MediaStream,
): Promise<void> {
  prepareVideoElement(video);

  if (video.srcObject !== stream) {
    video.srcObject = stream;
  }

  const tryPlay = async (): Promise<void> => {
    await video.play();
  };

  try {
    await tryPlay();
    return;
  } catch {
    // Autoplay policies — wait for metadata then retry.
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      video.removeEventListener("loadedmetadata", onReady);
      reject(new Error("video_metadata_timeout"));
    }, 8000);

    const onReady = () => {
      window.clearTimeout(timeout);
      void tryPlay().then(resolve).catch(reject);
    };

    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      window.clearTimeout(timeout);
      void tryPlay().then(resolve).catch(reject);
    } else {
      video.addEventListener("loadedmetadata", onReady, { once: true });
    }
  });
}

/** Wait until the video element has frame dimensions (needed before canvas capture). */
export async function waitForVideoDimensions(
  video: HTMLVideoElement,
  timeoutMs = 5000,
): Promise<void> {
  if (video.videoWidth > 0 && video.videoHeight > 0) return;

  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("video_dimensions_timeout"));
    }, timeoutMs);

    const onUpdate = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup();
        resolve();
      }
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", onUpdate);
      video.removeEventListener("loadeddata", onUpdate);
      video.removeEventListener("resize", onUpdate);
    };

    video.addEventListener("loadedmetadata", onUpdate);
    video.addEventListener("loadeddata", onUpdate);
    video.addEventListener("resize", onUpdate);
    onUpdate();
  });
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop());
}

export function isUserFacingStream(stream: MediaStream): boolean {
  const track = stream.getVideoTracks()[0];
  if (!track) return false;
  const settings = track.getSettings();
  if (settings.facingMode === "user") return true;
  if (settings.facingMode === "environment") return false;
  const label = track.label.toLowerCase();
  return label.includes("front") || label.includes("user") || label.includes("facetime");
}

export function hasTorchSupport(stream: MediaStream): boolean {
  const track = stream.getVideoTracks()[0];
  if (!track) return false;
  const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & {
    torch?: boolean;
  };
  return Boolean(capabilities?.torch);
}

export async function setTorchEnabled(
  stream: MediaStream,
  enabled: boolean,
): Promise<boolean> {
  const track = stream.getVideoTracks()[0];
  if (!track?.applyConstraints) return false;

  try {
    await track.applyConstraints({
      advanced: [{ torch: enabled } as MediaTrackConstraintSet],
    });
    return true;
  } catch {
    return false;
  }
}

/** Release canvas pixel data after OCR — do not retain document images. */
export function clearCaptureCanvas(canvas: HTMLCanvasElement | null): void {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (ctx && canvas.width > 0 && canvas.height > 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  canvas.width = 0;
  canvas.height = 0;
}
