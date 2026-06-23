import { CameraError } from "@/lib/mrz/camera";

type MrzErrorT = (key: string) => string;

/** Map camera failures to specific MRZ i18n error keys. */
export function mrzCameraErrorMessage(t: MrzErrorT, err: unknown): string {
  if (err instanceof CameraError) {
    if (err.code === "denied") return t("errors.cameraDenied");
    if (err.code === "unsupported") return t("errors.cameraUnsupported");
    return t("errors.cameraUnavailable");
  }
  return t("errors.camera");
}
