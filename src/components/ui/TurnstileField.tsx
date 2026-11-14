"use client";

import { useEffect, useRef, useState } from "react";
import { turnstileCoversHost, turnstilePlatformDomain } from "@/lib/security/turnstile-hosts";

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      language?: string;
      theme?: "auto" | "light" | "dark";
      size?: "normal" | "flexible" | "compact";
      "response-field-name"?: string;
      appearance?: "always" | "execute" | "interaction-only";
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<TurnstileApi> | null = null;

/** Cloudflare's script, loaded once per page and only where a form needs it. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile")));
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("turnstile"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * The anti-bot check inside a form: Cloudflare adds a hidden
 * "cf-turnstile-response" field the server verifies. Most visitors never see
 * a puzzle (it shows only when Cloudflare needs one). Nothing renders when no
 * site key is set. A token works once: change `resetKey` after each attempt.
 */
export function TurnstileField({ locale, resetKey = 0 }: { locale: string; resetKey?: number }) {
  const configuredKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  // Known only in the browser: the widget loads where the server also asks for it.
  const [covered, setCovered] = useState(false);
  useEffect(() => setCovered(turnstileCoversHost(window.location.host, turnstilePlatformDomain())), []);
  const siteKey = covered ? configuredKey : undefined;
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || !container.current) return;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !container.current || widgetId.current) return;
        widgetId.current = api.render(container.current, {
          sitekey: siteKey,
          language: locale,
          theme: "auto",
          size: "flexible",
          appearance: "interaction-only",
        });
      })
      .catch(() => {
        /* The script did not load; the server lets the form through only if Cloudflare is down for it too. */
      });
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey, locale]);

  useEffect(() => {
    if (resetKey > 0 && widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  }, [resetKey]);

  if (!siteKey) return null;
  return <div ref={container} className="turnstile-field" />;
}
