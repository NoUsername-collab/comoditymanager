/** Escape special chars for WIFI: QR payload (ZXing format). */
function escapeWifiField(value: string): string {
  return value.replace(/([\\;,":])/g, "\\$1");
}

export function buildWifiQrPayload(networkName: string, password?: string | null): string {
  const ssid = escapeWifiField(networkName.trim());
  if (!password?.trim()) {
    return `WIFI:T:nopass;S:${ssid};;`;
  }
  return `WIFI:T:WPA;S:${ssid};P:${escapeWifiField(password.trim())};;`;
}
