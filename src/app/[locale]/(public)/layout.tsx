import { bindTenantContextFromRequest } from "@/lib/tenant/bind-request-context";
import { AdminCorner } from "@/components/public/AdminCorner";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicHeader } from "@/components/public/PublicHeader";
import { MobileShell } from "@/layout/components/MobileShell";
import type { CSSProperties } from "react";
import "@/app/public-site.css";

const publicNoirVars = {
  // Fundal/cifre/texte publice
  "--site-bg": "#07060a",
  "--site-fg": "#f3efe3",
  "--site-muted": "#b7af9a",
  "--site-accent": "#d6b55a",
  "--site-accent-fg": "#0b0a0f",
  "--site-header-bg": "color-mix(in srgb, #07060a 86%, transparent)",
  "--site-card": "#0e0c14",
  "--site-border": "color-mix(in srgb, #d6b55a 22%, #1b1824)",
  // Logo variants (hover)
  "--logo-img-filter": "drop-shadow(0 10px 30px rgba(0, 0, 0, 0.45))",
  "--logo-img-filter-hover": "drop-shadow(0 10px 26px rgba(214, 181, 90, 0.25))",
  // “Hard” fallback (dacă vars sunt ignorate/șterse undeva)
  backgroundColor: "#07060a",
  color: "#f3efe3",
} as CSSProperties;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await bindTenantContextFromRequest();

  return (
    <MobileShell
      surface="public"
      className="site-themed site-themed--noir flex min-h-screen flex-1 flex-col"
      style={publicNoirVars}
    >
      <AdminCorner />
      <PublicHeader />
      <div className="ml-main ml-content flex-1">{children}</div>
      <PublicFooter />
    </MobileShell>
  );
}
