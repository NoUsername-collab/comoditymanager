"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collectLayoutMetrics,
  enableLayoutDebugPersist,
  formatLayoutMetrics,
  isLayoutDebugEnabled,
  type LayoutMetrics,
} from "@/lib/ui/layout-metrics";

export function LayoutDebugOverlay() {
  const [visible, setVisible] = useState(false);
  const [metrics, setMetrics] = useState<LayoutMetrics | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(() => {
    setMetrics(collectLayoutMetrics());
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("layout_debug") === "1") {
      enableLayoutDebugPersist();
    }
    if (!isLayoutDebugEnabled()) return;

    setVisible(true);
    refresh();

    const onChange = () => refresh();
    window.addEventListener("resize", onChange);
    window.visualViewport?.addEventListener("resize", onChange);
    window.visualViewport?.addEventListener("scroll", onChange);
    window.addEventListener("orientationchange", onChange);

    return () => {
      window.removeEventListener("resize", onChange);
      window.visualViewport?.removeEventListener("resize", onChange);
      window.visualViewport?.removeEventListener("scroll", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, [refresh]);

  async function copyReport() {
    if (!metrics) return;
    const payload = {
      ...metrics,
      path: window.location.pathname,
      capturedAt: new Date().toISOString(),
    };
    const text = JSON.stringify(payload, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (!visible || !metrics) return null;

  return (
    <div
      className="layout-debug-overlay"
      role="status"
      aria-live="polite"
      aria-label="Layout debug"
    >
      <div className="layout-debug-overlay__header">
        <strong>Layout debug</strong>
        <span className="layout-debug-overlay__hint">?layout_debug=1</span>
      </div>
      <pre className="layout-debug-overlay__body">{formatLayoutMetrics(metrics)}</pre>
      {metrics.displayProfile === "compact-laptop" && (
        <p className="layout-debug-overlay__hint-block">
          Profil <strong>compact-laptop</strong> (tipic 14&quot; 1366×768) — UI folosește
          layout compact (toolbar Gantt pe rânduri, HUD reflow).
        </p>
      )}
      {metrics.hasHorizontalOverflow && (
        <p className="layout-debug-overlay__warn">
          Conținut mai lat decât ecranul — pe unele laptopuri apar scroll orizontal sau
          elemente tăiate.
        </p>
      )}
      <div className="layout-debug-overlay__actions">
        <button type="button" className="layout-debug-overlay__btn" onClick={refresh}>
          Reîmprospătează
        </button>
        <button type="button" className="layout-debug-overlay__btn" onClick={copyReport}>
          {copied ? "Copiat" : "Copiază raport JSON"}
        </button>
      </div>
    </div>
  );
}
