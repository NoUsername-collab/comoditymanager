import { describe, expect, it } from "vitest";
import {
  createStableMrzReader,
  DEFAULT_STABLE_READ_COUNT,
  mrzLinesKey,
} from "@/lib/mrz/stable-read";

const SAMPLE = [
  "IDROU0321789<<0<<<<<<<<<<<<<<<",
  "9001017M2501017ROU<<<<<<<<<<<6",
  "POPESCU<<ION<<<<<<<<<<<<<<<<<<",
];

describe("stable-read", () => {
  it("requires N consecutive identical reads", () => {
    const reader = createStableMrzReader(3);
    expect(reader.push(SAMPLE).stable).toBe(false);
    expect(reader.push(SAMPLE).count).toBe(2);
    expect(reader.push(SAMPLE).stable).toBe(true);
  });

  it("resets count when lines change", () => {
    const reader = createStableMrzReader(DEFAULT_STABLE_READ_COUNT);
    reader.push(SAMPLE);
    reader.push(SAMPLE);
    const changed = [...SAMPLE];
    changed[2] = "POPESCU<<IONA<<<<<<<<<<<<<<<<<";
    expect(reader.push(changed).count).toBe(1);
    expect(reader.push(changed).stable).toBe(false);
  });

  it("clears on null push", () => {
    const reader = createStableMrzReader(2);
    reader.push(SAMPLE);
    expect(reader.push(null).count).toBe(0);
    expect(reader.push(SAMPLE).count).toBe(1);
  });

  it("builds stable key from lines", () => {
    expect(mrzLinesKey(SAMPLE)).toBe(SAMPLE.join("\n"));
  });
});
