"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Keeps the phone booking bar out of the way while the booking button at the
 * top of the page is on screen, so the two never show at once; it slides in
 * once that button scrolls away. Pages without such a button show it at once.
 */
export function BookingBarReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [heroButtonInView, setHeroButtonInView] = useState(true);

  useEffect(() => {
    const doc = ref.current?.ownerDocument;
    const button = doc?.querySelector(".pub-hero .pub-btn--primary");
    if (!doc || !button || typeof IntersectionObserver === "undefined") {
      setHeroButtonInView(false);
      return;
    }
    // The document as root: right in the studio's preview frame too.
    const observer = new IntersectionObserver(
      ([entry]) => setHeroButtonInView(Boolean(entry?.isIntersecting)),
      { root: doc },
    );
    observer.observe(button);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="pub-mobile-booking-bar"
      data-surface="public"
      data-away={heroButtonInView ? "1" : undefined}
      inert={heroButtonInView}
    >
      {children}
    </div>
  );
}
