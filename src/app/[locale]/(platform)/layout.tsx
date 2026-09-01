import { PlatformHeader } from "@/features/signup/ui/PlatformHeader";
import { PlatformFooter } from "@/features/signup/ui/PlatformFooter";
import { MobileShell } from "@/layout/components/MobileShell";
import type { CSSProperties } from "react";
import "@/styles/features/platform/signup.css";
import "@/styles/features/platform/landing.css";
import "@/styles/features/platform/landing-premium.css";
import "@/styles/features/platform/platform.css";
import "@/styles/features/platform/platform-split.css";
import "@/styles/features/layout/mobile-public.css";
import "@/styles/features/platform/zalmox-brand.css";

const platformVars = {
  "--site-bg": "#eef0f5",
  "--site-fg": "#1a1d2e",
  "--site-muted": "#5a6080",
  "--site-accent": "#3d5aab",
  "--site-accent-fg": "#ffffff",
  "--site-header-bg": "color-mix(in srgb, #ffffff 88%, transparent)",
  "--site-card": "#ffffff",
  "--site-border": "#d5dbe8",
  backgroundColor: "#eef0f5",
  color: "#1a1d2e",
} as CSSProperties;

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MobileShell
      surface="platform"
      className="site-themed platform-shell platform-shell--split flex min-h-screen flex-1 flex-col"
      style={platformVars}
    >
      <PlatformHeader variant="split" />
      <div className="ml-main ml-content flex-1">{children}</div>
      <PlatformFooter />
    </MobileShell>
  );
}
