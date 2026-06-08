import { describe, expect, it } from "vitest";

/** Pure offset math mirrored from useWindowVirtualRange for regression safety. */
function buildOffsets(count: number, estimateSize: (i: number) => number) {
  const offsets = new Array<number>(count + 1);
  offsets[0] = 0;
  for (let i = 0; i < count; i++) {
    offsets[i + 1] = offsets[i]! + estimateSize(i);
  }
  return offsets;
}

function findVisibleRange(
  offsets: number[],
  scrollMargin: number,
  viewTop: number,
  viewBottom: number
) {
  const totalSize = offsets[offsets.length - 1] ?? 0;
  const relTop = Math.max(0, viewTop - scrollMargin);
  const relBottom = Math.min(totalSize, viewBottom - scrollMargin);
  const count = offsets.length - 1;

  let lo = 0;
  let hi = count;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((offsets[mid + 1] ?? 0) <= relTop) lo = mid + 1;
    else hi = mid;
  }
  const start = lo;

  lo = start;
  hi = count;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((offsets[mid] ?? 0) < relBottom) lo = mid + 1;
    else hi = mid;
  }

  return { start, end: lo };
}

describe("gantt window virtual range", () => {
  it("maps scroll position to visible row indices", () => {
    const offsets = buildOffsets(40, () => 48);
    const scrollMargin = 400;
    const { start, end } = findVisibleRange(offsets, scrollMargin, 500, 900);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    expect(end - start).toBeLessThan(40);
  });

  it("handles mixed building header and room heights", () => {
    const offsets = buildOffsets(10, (i) => (i % 3 === 0 ? 32 : 48));
    expect(offsets[10]).toBe(32 + 48 * 6 + 32 * 3);
  });
});
