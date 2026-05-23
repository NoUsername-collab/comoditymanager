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

/** Rulează în <head> înainte de paint — desktop rămâne fără atribute extra. */
export const DEVICE_BOOT_SCRIPT = `(function(){try{var ua=navigator.userAgent||"";var d="desktop";if(/Android/i.test(ua))d="android";else if(/iPhone|iPod|iPad/i.test(ua))d="ios";else if(/Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua))d="mobile";document.documentElement.setAttribute("data-device",d);if(d!=="desktop")document.documentElement.classList.add("touch-device");}catch(e){}})();`;
