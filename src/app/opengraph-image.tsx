import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Zalmox — Software pentru pensiuni";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#0d0f14",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            background: "linear-gradient(135deg, #6c3fff, #a855f7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 52,
            marginBottom: 32,
          }}
        >
          ⚡
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.02em",
            marginBottom: 16,
          }}
        >
          Zalmox
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "#9ca3af",
            fontWeight: 500,
            letterSpacing: "0.01em",
          }}
        >
          Software modern pentru pensiuni
        </div>

        {/* Domain pill */}
        <div
          style={{
            marginTop: 40,
            padding: "10px 24px",
            background: "#1a1d2a",
            borderRadius: 100,
            fontSize: 18,
            color: "#6b7280",
            fontWeight: 600,
          }}
        >
          zalmox.app
        </div>
      </div>
    ),
    { ...size }
  );
}
