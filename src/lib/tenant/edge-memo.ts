/**
 * A small in-memory cache for the proxy's lookups of a host's property. The
 * proxy runs on every request; without it each page view waited for one or two
 * round trips to the database just to learn which property a host is and
 * whether it is suspended. Found entries live `foundTtlMs`, "no such host"
 * entries `missingTtlMs`; a failed lookup (`undefined`) is not kept and is
 * passed on as undefined, so a passing network error is never remembered nor
 * mistaken for "no such host". Concurrent lookups of one key
 * share a single request. The cache is per server instance: a change (a
 * suspension, a new domain) reaches every instance within the found TTL.
 */
export function createEdgeMemo<T>(options: {
  foundTtlMs: number;
  missingTtlMs: number;
  maxEntries?: number;
}) {
  const maxEntries = options.maxEntries ?? 2000;
  const entries = new Map<string, { value: T | null; expires: number }>();
  const pending = new Map<string, Promise<T | null | undefined>>();

  return async function lookup(
    key: string,
    load: () => Promise<T | null | undefined>,
    now: () => number = Date.now,
  ): Promise<T | null | undefined> {
    const hit = entries.get(key);
    if (hit && hit.expires > now()) return hit.value;

    let inFlight = pending.get(key);
    if (!inFlight) {
      inFlight = load().finally(() => pending.delete(key));
      pending.set(key, inFlight);
    }
    const value = await inFlight;
    if (value === undefined) return undefined;

    if (entries.size >= maxEntries) {
      // Drop the oldest entry; Map keeps insertion order.
      const oldest = entries.keys().next().value;
      if (oldest !== undefined) entries.delete(oldest);
    }
    entries.delete(key);
    entries.set(key, {
      value,
      expires: now() + (value === null ? options.missingTtlMs : options.foundTtlMs),
    });
    return value;
  };
}
