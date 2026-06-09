import { AlphaGateForm } from "@/components/public/AlphaGateForm";
import { sanitizeAlphaGateReturnPath } from "@/lib/auth/alpha-gate";
import { isAlphaGateEnabled } from "@/lib/auth/alpha-gate-edge";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { CSSProperties } from "react";

const gateVars = {
  "--site-bg": "#07060a",
  "--site-fg": "#f3efe3",
  "--site-muted": "#b7af9a",
  "--site-accent": "#d6b55a",
  "--site-accent-fg": "#0b0a0f",
  "--site-card": "#0e0c14",
  "--site-border": "color-mix(in srgb, #d6b55a 22%, #1b1824)",
  backgroundColor: "#07060a",
  color: "#f3efe3",
} as CSSProperties;

export default async function AlphaGatePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!isAlphaGateEnabled()) {
    redirect("/");
  }

  const [t, params] = await Promise.all([
    getTranslations("alphaGate"),
    searchParams,
  ]);
  const nextPath = sanitizeAlphaGateReturnPath(params.next ?? "/");

  return (
    <main
      className="alpha-gate-page ml-content site-themed site-themed--noir flex min-h-dvh items-center justify-center p-4"
      style={gateVars}
    >
      <div
        className="alpha-gate-card w-full max-w-md rounded-xl border border-[var(--site-border)] bg-[var(--site-card)] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-labelledby="alpha-gate-title"
      >
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-accent)]">
          {t("eyebrow")}
        </p>
        <h1 id="alpha-gate-title" className="mt-2 text-xl font-semibold">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-[var(--site-muted)]">{t("lead")}</p>
        <div className="mt-4">
          <AlphaGateForm nextPath={nextPath} />
        </div>
      </div>
    </main>
  );
}
