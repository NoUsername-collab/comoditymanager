import { describe, expect, it, vi } from "vitest";
import {
  CameraError,
  clearCaptureCanvas,
  hasTorchSupport,
  isUserFacingStream,
  setTorchEnabled,
  stopMediaStream,
} from "@/lib/mrz/camera";

describe("camera helpers", () => {
  it("stopMediaStream stops every track", () => {
    const stop = vi.fn();
    const stream = {
      getTracks: () => [{ stop }, { stop }],
    } as unknown as MediaStream;

    stopMediaStream(stream);
    expect(stop).toHaveBeenCalledTimes(2);
  });

  it("stopMediaStream tolerates null", () => {
    expect(() => stopMediaStream(null)).not.toThrow();
  });

  it("isUserFacingStream reads facingMode", () => {
    const stream = {
      getVideoTracks: () => [
        { label: "camera", getSettings: () => ({ facingMode: "user" }) },
      ],
    } as unknown as MediaStream;
    expect(isUserFacingStream(stream)).toBe(true);
  });

  it("hasTorchSupport checks track capabilities", () => {
    const withTorch = {
      getVideoTracks: () => [
        { getCapabilities: () => ({ torch: true }) },
      ],
    } as unknown as MediaStream;
    const withoutTorch = {
      getVideoTracks: () => [{ getCapabilities: () => ({}) }],
    } as unknown as MediaStream;

    expect(hasTorchSupport(withTorch)).toBe(true);
    expect(hasTorchSupport(withoutTorch)).toBe(false);
  });

  it("setTorchEnabled applies torch constraint", async () => {
    const applyConstraints = vi.fn().mockResolvedValue(undefined);
    const stream = {
      getVideoTracks: () => [{ applyConstraints }],
    } as unknown as MediaStream;

    await expect(setTorchEnabled(stream, true)).resolves.toBe(true);
    expect(applyConstraints).toHaveBeenCalledWith({
      advanced: [{ torch: true }],
    });
  });

  it("clearCaptureCanvas zeroes dimensions", () => {
    const ctx = { clearRect: vi.fn() };
    const canvas = {
      width: 640,
      height: 480,
      getContext: () => ctx,
    } as unknown as HTMLCanvasElement;

    clearCaptureCanvas(canvas);
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 640, 480);
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it("CameraError carries code", () => {
    const err = new CameraError("denied");
    expect(err.code).toBe("denied");
    expect(err.name).toBe("CameraError");
  });
});
