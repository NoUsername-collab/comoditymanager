"use client";

export default function OfflinePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-geist-sans, system-ui, sans-serif)",
        background: "var(--admin-bg, #0f0e14)",
        color: "var(--admin-text, #e8e8f0)",
        padding: "2rem",
        textAlign: "center",
        gap: "1rem",
      }}
    >
      <span style={{ fontSize: "3rem", lineHeight: 1 }}>📡</span>
      <h1
        style={{
          fontSize: "1.375rem",
          fontWeight: 700,
          margin: 0,
          letterSpacing: "-0.02em",
        }}
      >
        Fără conexiune
      </h1>
      <p
        style={{
          fontSize: "0.9375rem",
          color: "#8888aa",
          margin: 0,
          maxWidth: "320px",
          lineHeight: 1.6,
        }}
      >
        Verifică conexiunea la internet și încearcă din nou.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          marginTop: "0.5rem",
          padding: "0.65rem 1.5rem",
          borderRadius: "0.65rem",
          border: "none",
          background: "#7c3aed",
          color: "#fff",
          fontSize: "0.9375rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Reîncearcă
      </button>
      <p style={{ fontSize: "0.75rem", color: "#44445a", margin: 0 }}>
        Zalmox — Software pentru pensiuni
      </p>
    </main>
  );
}
