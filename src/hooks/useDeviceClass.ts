"use client";

import { useEffect, useState } from "react";
import {
  detectDeviceFromUserAgent,
  type DeviceClass,
  isTouchDeviceClass,
} from "@/lib/device";

function readDeviceFromDom(): DeviceClass {
  if (typeof document === "undefined") return "desktop";
  const attr = document.documentElement.getAttribute("data-device");
  if (
    attr === "android" ||
    attr === "ios" ||
    attr === "mobile" ||
    attr === "desktop"
  ) {
    return attr;
  }
  return detectDeviceFromUserAgent(navigator.userAgent);
}

export function useDeviceClass(): DeviceClass {
  const [device, setDevice] = useState<DeviceClass>("desktop");

  useEffect(() => {
    setDevice(readDeviceFromDom());
  }, []);

  return device;
}

export function useIsTouchDevice(): boolean {
  const device = useDeviceClass();
  return isTouchDeviceClass(device);
}
