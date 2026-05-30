import { PlatformHeader } from "@/components/platform/PlatformHeader";
import { PlatformFooter } from "@/components/platform/PlatformFooter";
import type { CSSProperties } from "react";

const platformVars = {
  "--site-bg": "#07060a",
  "--site-fg": "#f3efe3",
  "--site-muted": "#b7af9a",
  "--site-accent": "#d6b55a",
  "--site-accent-fg": "#0b0a0f",
  "--site-header-bg": "color-mix(in srgb, #07060a 86%, transparent)",
  "--site-card": "#0e0c14",
  "--site-border": "color-mix(in srgb, #d6b55a 22%, #1b1824)",
  backgroundColor: "#07060a",
  color: "#f3efe3",
} as CSSProperties;

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="site-themed site-themed--noir flex min-h-screen flex-1 flex-col"
      style={platformVars}
    >
      <PlatformHeader />
      <div className="flex-1">{children}</div>
      <PlatformFooter />
    </div>
  );
}
