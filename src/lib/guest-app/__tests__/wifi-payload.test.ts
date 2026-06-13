import { describe, expect, it } from "vitest";
import { buildWifiQrPayload } from "../wifi-payload";

describe("buildWifiQrPayload", () => {
  it("builds WPA payload", () => {
    expect(buildWifiQrPayload("CasaEmil-Guest", "secret123")).toBe(
      "WIFI:T:WPA;S:CasaEmil-Guest;P:secret123;;",
    );
  });

  it("escapes special characters", () => {
    expect(buildWifiQrPayload('Cafe;Bar', 'p:a"ss')).toBe(
      'WIFI:T:WPA;S:Cafe\\;Bar;P:p\\:a\\"ss;;',
    );
  });

  it("builds open network payload without password", () => {
    expect(buildWifiQrPayload("OpenNet", "")).toBe("WIFI:T:nopass;S:OpenNet;;");
  });
});
