import { describe, expect, it } from "vitest";
import { extractMrzLinesFromOcrText } from "@/domain/guest/mrz-ocr";
import { correctTd1Block, refineTd1Candidates, scoreMrzLines } from "@/domain/guest/mrz-parse";
import { parseMrzIdentity } from "@/domain/guest/mrz";

const RO_CI_TD1 = [
  "IDROU0321789<<0<<<<<<<<<<<<<<<",
  "9001017M2501017ROU<<<<<<<<<<<6",
  "POPESCU<<ION<<<<<<<<<<<<<<<<<<",
];

describe("scoreMrzLines", () => {
  it("prefers valid checksum over invalid noise", () => {
    const valid = scoreMrzLines(RO_CI_TD1);
    const noise = scoreMrzLines([
      "IDROU0321789<<0<<<<<<<<<<<<<<",
      "9001017M2501017ROU<<<<<<<<<<<",
      "POPESCU<<ION<<<<<<<<<<<<<<<<<",
    ]);
    expect(valid).toBeGreaterThan(noise);
  });
});

describe("correctTd1Block", () => {
  it("fixes common OCR digit confusions on line 2", () => {
    const corrected = correctTd1Block([
      RO_CI_TD1[0]!,
      "9OO1O17M25O1O17ROU<<<<<<<<<<<6".replace(/O/g, "O"),
      RO_CI_TD1[2]!,
    ]);
    expect(corrected[1]?.slice(0, 6)).toBe("900101");
  });
});

describe("extractMrzLinesFromOcrText", () => {
  it("picks valid block among OCR noise duplicates", () => {
    const text = [
      "GARBAGE LINE HERE",
      ...RO_CI_TD1,
      RO_CI_TD1[0],
      "WRONG<<LINE<<2<<TOO<<SHORT",
      RO_CI_TD1[2],
    ].join("\n");
    const lines = extractMrzLinesFromOcrText(text);
    expect(lines).toEqual(RO_CI_TD1);
  });

  it("refines OCR typo block when checksum validates after correction", () => {
    const noisy = refineTd1Candidates([
      [
        RO_CI_TD1[0]!,
        "9OO1017M2501017ROU<<<<<<<<<<<6",
        RO_CI_TD1[2]!,
      ],
    ]);
    expect(noisy).not.toBeNull();
    const parsed = parseMrzIdentity(noisy!);
    expect(parsed.ok).toBe(true);
  });
});
