import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="ro">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0f14",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: "#e8eaf0",
        }}
      >
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>⚡</div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#6b7280",
              marginBottom: 12,
            }}
          >
            Zalmox · 404
          </div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              margin: "0 0 12px",
              color: "#fff",
            }}
          >
            Pagina nu există
          </h1>
          <p
            style={{
              fontSize: 15,
              color: "#6b7280",
              margin: "0 0 32px",
              maxWidth: 340,
              lineHeight: 1.6,
            }}
          >
            Linkul pe care l-ai accesat nu mai există sau a fost mutat.
          </p>
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "#6c3fff",
              color: "#fff",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Înapoi acasă
          </Link>
        </div>
      </body>
    </html>
  );
}
