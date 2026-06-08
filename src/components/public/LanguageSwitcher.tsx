"use client";

import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { computeFixedDropdownPosition } from "@/lib/ui/viewport-position";

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

type MenuPos = { top: number; left: number };

const MENU_ESTIMATE = { width: 52, height: 132 };

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  const positionMenu = useCallback(() => {
    const trigger = triggerRef.current?.getBoundingClientRect();
    if (!trigger) return;

    const measured = menuRef.current?.getBoundingClientRect();
    const menuSize = measured
      ? { width: measured.width, height: measured.height }
      : MENU_ESTIMATE;

    const pos = computeFixedDropdownPosition(trigger, menuSize);
    setMenuPos(pos);
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    positionMenu();
  }, [open, positionMenu]);

  useEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    positionMenu();
    const onLayout = () => positionMenu();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    window.visualViewport?.addEventListener("resize", onLayout);
    window.visualViewport?.addEventListener("scroll", onLayout);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
      window.visualViewport?.removeEventListener("resize", onLayout);
      window.visualViewport?.removeEventListener("scroll", onLayout);
    };
  }, [open, positionMenu]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function switchLocale(next: string) {
    setOpen(false);
    if (next === locale) return;
    router.replace(pathname, { locale: next });
  }

  const labels: Record<string, string> = {
    ro: tCommon("romanian"),
    en: tCommon("english"),
    bg: tCommon("bulgarian"),
  };

  const menu =
    open && menuPos ? (
      <div
        ref={menuRef}
        role="listbox"
        aria-label={tCommon("language")}
        className="language-switcher__menu language-switcher__menu--portal fixed min-w-[44px] rounded-xl border border-[var(--site-border)] bg-[var(--site-card,#fff)] p-1 shadow-lg"
        style={{ top: menuPos.top, left: menuPos.left }}
      >
        {routing.locales.map((l) => (
          <button
            key={l}
            type="button"
            role="option"
            aria-selected={l === locale}
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
    ) : null;

  return (
    <div className={["language-switcher relative", compact && "language-switcher--compact"].filter(Boolean).join(" ")}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={tCommon("language")}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        className={[
          "language-switcher__trigger cursor-pointer rounded-full border border-[var(--site-border)] bg-[var(--site-header-bg)] leading-none flex items-center",
          compact ? "language-switcher__trigger--compact px-1.5 py-0.5" : "px-2 py-1 text-base",
        ].join(" ")}
      >
        <Flag code={locale} />
      </button>

      {portalReady && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
