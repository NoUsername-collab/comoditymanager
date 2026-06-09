/** Resolves Supabase head-count queries without throwing on transient failures. */
export function safeCount(
  query: PromiseLike<{ count: number | null }>
): Promise<number> {
  return Promise.resolve(query)
    .then((result) => result.count ?? 0)
    .catch(() => 0);
}
