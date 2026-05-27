"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useRef } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

function FlagRO({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 30 20" width={size} height={Math.round(size * 2 / 3)} aria-hidden>
      <rect x="0" y="0" width="10" height="20" fill="#002B7F" />
      <rect x="10" y="0" width="10" height="20" fill="#FCD116" />
      <rect x="20" y="0" width="10" height="20" fill="#CE1126" />
    </svg>
  );
}

function FlagGB({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 60 30" width={size} height={Math.round(size / 2)} aria-hidden>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#gbclip)" />
      <clipPath id="gbclip">
        <path d="M30,0 L30,15 60,15 60,30 30,30 30,15 0,15 0,0Z" />
      </clipPath>
      <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}

function FlagBG({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 30 18" width={size} height={Math.round(size * 18 / 30)} aria-hidden>
      <rect x="0" y="0" width="30" height="6" fill="#fff" />
      <rect x="0" y="6" width="30" height="6" fill="#00966E" />
      <rect x="0" y="12" width="30" height="6" fill="#D62612" />
    </svg>
  );
}

const FLAG_COMPONENTS: Record<string, (props: { size?: number }) => React.JSX.Element> = {
  ro: FlagRO,
  en: FlagGB,
  bg: FlagBG,
};

function Flag({ code, size = 20 }: { code: string; size?: number }) {
  const Comp = FLAG_COMPONENTS[code];
  if (!Comp) return <span>{code.toUpperCase()}</span>;
  return <Comp size={size} />;
}

export function LanguageSwitcher() {
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function switchLocale(next: string) {
    if (next === locale) {
      if (detailsRef.current) detailsRef.current.open = false;
      return;
    }
    router.replace(pathname, { locale: next });
    if (detailsRef.current) detailsRef.current.open = false;
  }

  const labels: Record<string, string> = {
    ro: tCommon("romanian"),
    en: tCommon("english"),
    bg: tCommon("bulgarian"),
  };

  return (
    <details ref={detailsRef} className="relative">
      <summary
        aria-label={tCommon("language")}
        className="list-none cursor-pointer rounded-full border border-[var(--site-border)] bg-[var(--site-header-bg)] px-2 py-1 text-base leading-none flex items-center"
      >
        <Flag code={locale} />
      </summary>

      <div className="absolute right-0 z-50 mt-2 min-w-[44px] rounded-xl border border-[var(--site-border)] bg-[var(--site-header-bg)] p-1 shadow-lg">
        {routing.locales.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => switchLocale(l)}
            aria-label={labels[l]}
            title={labels[l]}
            className={[
              "flex w-full items-center justify-center rounded-lg px-2 py-1.5 transition",
              l === locale
                ? "bg-[var(--site-accent)]"
                : "hover:bg-[color-mix(in_srgb,var(--site-card)_76%,var(--accent-muted))]",
            ].join(" ")}
          >
            <Flag code={l} />
          </button>
        ))}
      </div>
    </details>
  );
}
