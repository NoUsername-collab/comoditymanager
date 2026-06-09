"use client";

import { useTranslations, useLocale } from "next-intl";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  startTransition,
} from "react";
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

function FlagGB({ size = 20, clipId }: { size?: number; clipId: string }) {
  return (
    <svg viewBox="0 0 60 30" width={size} height={Math.round(size / 2)} aria-hidden>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path
        d="M0,0 L60,30 M60,0 L0,30"
        stroke="#C8102E"
        strokeWidth="4"
        clipPath={`url(#${clipId})`}
      />
      <clipPath id={clipId}>
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

function Flag({ code, size = 20, gbClipId }: { code: string; size?: number; gbClipId: string }) {
  if (code === "ro") return <FlagRO size={size} />;
  if (code === "en") return <FlagGB size={size} clipId={gbClipId} />;
  if (code === "bg") return <FlagBG size={size} />;
  return <span>{code.toUpperCase()}</span>;
}

type MenuPos = { top: number; left: number };

const MENU_ESTIMATE = { width: 52, height: 132 };

type LanguageSwitcherProps = {
  compact?: boolean;
  /** Inline row of flags — reliable inside drawers and nested menus. */
  variant?: "dropdown" | "inline";
};

function useSwitchLocale() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (next: string) => {
      if (next === locale) return;
      startTransition(() => {
        router.replace(pathname, { locale: next });
      });
    },
    [locale, pathname, router]
  );
}

function useLanguageLabels() {
  const tCommon = useTranslations("common");
  return {
    language: tCommon("language"),
    labels: {
      ro: tCommon("romanian"),
      en: tCommon("english"),
      bg: tCommon("bulgarian"),
    } as Record<string, string>,
  };
}

/** Thin router — no hooks here (Rules of Hooks safe). */
export function LanguageSwitcher({
  compact = false,
  variant = "dropdown",
}: LanguageSwitcherProps) {
  if (variant === "inline") {
    return <LanguageSwitcherInline compact={compact} />;
  }
  return <LanguageSwitcherDropdown compact={compact} />;
}

function LanguageSwitcherInline({ compact }: { compact: boolean }) {
  const locale = useLocale();
  const gbClipId = useId();
  const switchLocale = useSwitchLocale();
  const { language, labels } = useLanguageLabels();
  const flagSize = compact ? 18 : 20;

  return (
    <div
      data-language-switcher-root
      className={[
        "language-switcher language-switcher--inline",
        compact && "language-switcher--compact",
      ]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label={language}
    >
      <div className="language-switcher__inline-options">
        {routing.locales.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={l === locale}
            aria-label={labels[l]}
            title={labels[l]}
            onClick={() => switchLocale(l)}
            className={[
              "language-switcher__option language-switcher__option--inline",
              l === locale && "language-switcher__option--active",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <Flag code={l} size={flagSize} gbClipId={`${gbClipId}-${l}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function LanguageSwitcherDropdown({ compact }: { compact: boolean }) {
  const locale = useLocale();
  const gbClipId = useId();
  const switchLocale = useSwitchLocale();
  const { language, labels } = useLanguageLabels();
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
    setMenuPos((prev) =>
      prev && prev.top === pos.top && prev.left === pos.left ? prev : pos
    );
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

  const pickLocale = useCallback(
    (next: string) => {
      setOpen(false);
      switchLocale(next);
    },
    [switchLocale]
  );

  function toggleOpen() {
    if (!open) {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (trigger) {
        setMenuPos(computeFixedDropdownPosition(trigger, MENU_ESTIMATE));
      }
      setOpen(true);
      return;
    }
    setOpen(false);
  }

  const menu = open ? (
    <div
      ref={menuRef}
      data-language-switcher-menu
      role="listbox"
      aria-label={language}
      onPointerDown={(event) => event.stopPropagation()}
      className="language-switcher__menu language-switcher__menu--portal fixed min-w-[44px] rounded-xl border border-[var(--site-border)] bg-[var(--site-card,#fff)] p-1 shadow-lg"
      style={
        menuPos
          ? { top: menuPos.top, left: menuPos.left }
          : { visibility: "hidden", pointerEvents: "none" }
      }
    >
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          role="option"
          aria-selected={l === locale}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            pickLocale(l);
          }}
          aria-label={labels[l]}
          title={labels[l]}
          className={[
            "language-switcher__option flex w-full items-center justify-center rounded-lg px-2 py-1.5 transition",
            l === locale
              ? "bg-[var(--site-accent)]"
              : "hover:bg-[color-mix(in_srgb,var(--site-card)_76%,var(--accent-muted))]",
          ].join(" ")}
        >
          <Flag code={l} gbClipId={`${gbClipId}-${l}`} />
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div
      data-language-switcher-root
      className={[
        "language-switcher relative",
        compact && "language-switcher--compact",
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={language}
        onClick={toggleOpen}
        className={[
          "language-switcher__trigger cursor-pointer rounded-full border border-[var(--site-border)] bg-[var(--site-header-bg)] leading-none flex items-center",
          compact ? "language-switcher__trigger--compact px-1.5 py-0.5" : "px-2 py-1 text-base",
        ].join(" ")}
      >
        <Flag code={locale} gbClipId={gbClipId} />
      </button>

      {portalReady && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
