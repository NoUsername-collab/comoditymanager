"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const SHELL =
  '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body></body></html>';

const STYLE_SOURCES = 'style, link[rel="stylesheet"]';

/**
 * Renders `children` inside an iframe, so the page's own `@media` rules see the
 * frame's width: a phone-wide frame shows the real phone layout, not the desktop
 * one squeezed. The admin's stylesheets are mirrored in and kept in sync, so
 * lazily loaded CSS and hot reload reach the frame too. React events still
 * bubble out through the portal, so a click handler around the iframe sees them.
 */
export function StudioPreviewIframe({
  title,
  pickable = false,
  children,
}: {
  title: string;
  /** Outlines sections on hover, as a hint that a click opens their editor. */
  pickable?: boolean;
  children: ReactNode;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);

  function attach() {
    const doc = iframeRef.current?.contentDocument;
    // Only our shell, not the about:blank document an iframe starts with.
    if (!doc?.body || !doc.head.querySelector("meta[charset]")) return;
    // next/font exposes its font variables through classes on <html>.
    doc.documentElement.className = document.documentElement.className;
    doc.body.style.margin = "0";
    setBody(doc.body);
  }

  // A srcDoc frame can finish loading before hydration attaches onLoad; then
  // the load event is gone and the preview would stay blank.
  useEffect(() => {
    if (iframeRef.current?.contentDocument?.readyState === "complete") attach();
  }, []);

  useEffect(() => {
    if (!body) return;
    const head = body.ownerDocument.head;
    const clones = new Map<Element, Element>();

    function sync() {
      const sources = Array.from(document.head.querySelectorAll(STYLE_SOURCES));
      for (const [source, clone] of clones) {
        if (sources.includes(source)) continue;
        clone.remove();
        clones.delete(source);
      }
      for (const source of sources) {
        const clone = clones.get(source);
        if (!clone) {
          const next = source.cloneNode(true) as Element;
          head.appendChild(next);
          clones.set(source, next);
        } else if (clone.textContent !== source.textContent) {
          clone.textContent = source.textContent;
        }
      }
    }

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      for (const clone of clones.values()) clone.remove();
    };
  }, [body]);

  return (
    <>
      <iframe
        ref={iframeRef}
        title={title}
        srcDoc={SHELL}
        onLoad={attach}
        className="pub-site-studio__iframe"
      />
      {body
        ? createPortal(
            <div className="pub-site-studio__doc" data-pickable={pickable ? "1" : undefined}>
              {children}
            </div>,
            body,
          )
        : null}
    </>
  );
}
