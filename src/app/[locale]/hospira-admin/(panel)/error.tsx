"use client";

export default function HospiraAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="max-w-md rounded-lg border border-red-900 bg-red-950/30 p-6 text-center">
        <p className="text-lg font-semibold text-red-300">Eroare Admin Panel</p>
        <p className="mt-2 text-sm text-red-400/80">
          {error.message || "A apărut o eroare neașteptată."}
        </p>
        {error.digest && (
          <p className="mt-1 font-mono text-xs text-neutral-600">
            {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="mt-4 rounded-md bg-red-800 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          Reîncearcă
        </button>
      </div>
    </div>
  );
}
