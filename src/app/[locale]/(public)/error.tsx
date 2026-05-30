"use client";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isTenantMissing = error.name === "TenantNotFoundError";

  if (isTenantMissing) {
    return (
      <main className="public-section" style={{ textAlign: "center", padding: "4rem 1rem" }}>
        <h1>Pensiune negăsită</h1>
        <p>
          Subdomeniul nu este înregistrat încă. Verifică adresa sau{" "}
          <a href="https://www.hospira.ro/signup">înscrie pensiunea</a>.
        </p>
      </main>
    );
  }

  return (
    <main className="public-section" style={{ textAlign: "center", padding: "4rem 1rem" }}>
      <h1>Eroare</h1>
      <p>{error.message || "Ceva nu a mers bine."}</p>
      <button type="button" onClick={reset}>
        Reîncearcă
      </button>
    </main>
  );
}
