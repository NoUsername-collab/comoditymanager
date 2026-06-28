import React from "react";

const Pulse = ({ className, style }: { className: string; style?: React.CSSProperties }) => (
  <div className={`animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800 ${className}`} style={style} />
);

export function PublicHeroSkeleton() {
  return (
    <section aria-hidden="true" className="public-section" style={{ padding: "5rem 1rem 3rem" }}>
      <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
        <Pulse className="mx-auto mb-4 h-6 w-32" />
        <Pulse className="mx-auto mb-3 h-12 w-3/4" />
        <Pulse className="mx-auto mb-2 h-12 w-2/3" />
        <Pulse className="mx-auto mb-6 h-5 w-1/2" />
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Pulse className="h-11 w-36" style={{ borderRadius: 9999 }} />
          <Pulse className="h-11 w-36" style={{ borderRadius: 9999 }} />
        </div>
        <div style={{ display: "flex", gap: "2rem", justifyContent: "center", marginTop: "2rem" }}>
          <Pulse className="h-8 w-20" />
          <Pulse className="h-8 w-20" />
          <Pulse className="h-8 w-20" />
        </div>
      </div>
    </section>
  );
}

export function PublicCardsSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <section aria-hidden="true" className="public-section" style={{ padding: "3rem 1rem" }}>
      <Pulse className="mx-auto mb-8 h-8 w-48" />
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(cards, 3)}, 1fr)`, gap: "1rem", maxWidth: 900, margin: "0 auto" }}>
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} style={{ padding: "1.5rem", border: "1px solid #e5e7eb", borderRadius: 12 }}>
            <Pulse className="mb-3 h-10 w-10" style={{ borderRadius: 10 }} />
            <Pulse className="mb-2 h-5 w-3/4" />
            <Pulse className="h-4 w-full" />
            <Pulse className="mt-1 h-4 w-2/3" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function PublicCalendarSkeleton() {
  return (
    <section aria-hidden="true" style={{ padding: "2rem 1rem" }}>
      <Pulse className="mx-auto mb-6 h-8 w-56" />
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
          <Pulse className="h-8 w-24" />
          <Pulse className="h-8 w-32" />
          <Pulse className="h-8 w-24" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
          {Array.from({ length: 35 }).map((_, i) => (
            <Pulse key={i} className="h-10" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PublicTextPageSkeleton() {
  return (
    <section aria-hidden="true" style={{ padding: "3rem 1rem", maxWidth: 720, margin: "0 auto" }}>
      <Pulse className="mb-6 h-9 w-64" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Pulse key={i} className={`mb-3 h-4 ${i % 3 === 2 ? "w-2/3" : "w-full"}`} />
      ))}
      <div style={{ marginTop: "2rem" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Pulse key={i} className={`mb-3 h-4 ${i % 3 === 2 ? "w-3/4" : "w-full"}`} />
        ))}
      </div>
    </section>
  );
}

export function PublicFormSkeleton() {
  return (
    <section aria-hidden="true" style={{ padding: "3rem 1rem", maxWidth: 480, margin: "0 auto" }}>
      <Pulse className="mx-auto mb-6 h-8 w-48" />
      <Pulse className="mb-3 h-4 w-24" />
      <Pulse className="mb-4 h-11 w-full" style={{ borderRadius: 8 }} />
      <Pulse className="mb-3 h-4 w-24" />
      <Pulse className="mb-6 h-11 w-full" style={{ borderRadius: 8 }} />
      <Pulse className="h-11 w-full" style={{ borderRadius: 9999 }} />
    </section>
  );
}
