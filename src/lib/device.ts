/** Clase dispozitiv pentru UI adaptat (setat pe <html data-device>). */
export type DeviceClass = "android" | "ios" | "mobile" | "desktop";

export function detectDeviceFromUserAgent(
  userAgent: string | null | undefined
): DeviceClass {
  const ua = userAgent ?? "";
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPod|iPad/i.test(ua)) return "ios";
  if (/Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return "mobile";
  return "desktop";
}

export function isTouchDeviceClass(device: DeviceClass): boolean {
  return device !== "desktop";
}

/** Rulează în <head> înainte de paint — device UA + display profile viewport. */
export { CLIENT_LAYOUT_BOOT_SCRIPT as DEVICE_BOOT_SCRIPT } from "@/lib/ui/display-profile";
