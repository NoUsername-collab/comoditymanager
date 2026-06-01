import { PlatformHeader } from "@/components/platform/PlatformHeader";
import { PlatformFooter } from "@/components/platform/PlatformFooter";
import type { CSSProperties } from "react";

const platformVars = {
  "--site-bg": "#f8fafc",
  "--site-fg": "#0f172a",
  "--site-muted": "#64748b",
  "--site-accent": "#2563eb",
  "--site-accent-fg": "#ffffff",
  "--site-header-bg": "color-mix(in srgb, #ffffff 82%, transparent)",
  "--site-card": "#ffffff",
  "--site-border": "#e2e8f0",
  backgroundColor: "#f8fafc",
  color: "#0f172a",
} as CSSProperties;

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="site-themed platform-shell platform-shell--split flex min-h-screen flex-1 flex-col"
      style={platformVars}
    >
      <PlatformHeader variant="split" />
      <div className="flex-1">{children}</div>
      <PlatformFooter />
    </div>
  );
}
