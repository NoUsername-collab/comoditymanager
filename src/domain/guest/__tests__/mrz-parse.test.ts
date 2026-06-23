import { describe, expect, it } from "vitest";
import { extractMrzLinesFromOcrText } from "@/domain/guest/mrz-ocr";
import {
  correctTd1Block,
  correctTd2Block,
  correctTd3Block,
  isMrzParseChecksumValid,
  parseMrzLinesBestEffort,
  refineTd1Candidates,
  scoreMrzLines,
  splitTd2GivenNameBlob,
  tryParseMrzBlock,
} from "@/domain/guest/mrz-parse";
import { parseMrzIdentity } from "@/domain/guest/mrz";

const RO_CI_TD1 = [
  "IDROU0321789<<0<<<<<<<<<<<<<<<",
  "9001011M2501017ROU<<<<<<<<<<<8",
  "POPESCU<<ION<<<<<<<<<<<<<<<<<<",
];

const TD3_PASSPORT = [
  "P<UTOSMITH<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<",
  "L898902C36UTO7408122F1204159ZE184226B<<<<<10",
];

describe("parseMrzLinesBestEffort", () => {
  it("accepts only checksum-valid parses", () => {
    expect(isMrzParseChecksumValid(parseMrzLinesBestEffort(RO_CI_TD1)!.parsed)).toBe(true);
    expect(
      parseMrzLinesBestEffort([
        RO_CI_TD1[0]!,
        "9001017M2501017ROU<<<<<<<<<<<0",
        RO_CI_TD1[2]!,
      ]),
    ).toBeNull();
  });
});

describe("tryParseMrzBlock", () => {
  it("parses TD1 block with ICAO checksum", async () => {
    const attempt = tryParseMrzBlock(RO_CI_TD1);
    expect(attempt).not.toBeNull();
    expect(isMrzParseChecksumValid(attempt!.parsed)).toBe(true);
    const parsed = await parseMrzIdentity(RO_CI_TD1);
    expect(parsed.ok).toBe(true);
  });

  it("parses TD3 passport sample", () => {
    const attempt = tryParseMrzBlock(TD3_PASSPORT);
    expect(isMrzParseChecksumValid(attempt!.parsed)).toBe(true);
    expect(attempt?.parsed.format).toBe("TD3");
  });
});

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

describe("correctTd2Block", () => {
  it("restores surname/given separator from single chevron OCR", () => {
    const corrected = correctTd2Block([
      "IDROUPETRIK<CRISTINASIOANASK<LLLLLL<",
      "XB674552<7ROU9604113F310411621257731",
    ]);
    expect(corrected[0]).toContain("PETRIK<<CRISTINA<IOANA<E");
    expect(corrected[0]).not.toContain("LLLLLL");
    expect(corrected[0]?.length).toBe(36);
  });
});

describe("splitTd2GivenNameBlob", () => {
  it("splits merged Romanian given names and initial", () => {
    expect(splitTd2GivenNameBlob("CRISTINASIOANASK")).toBe("CRISTINA<IOANA<E");
  });
});

describe("extractMrzLinesFromOcrText", () => {
  it("returns null for checksum-invalid OCR noise only", () => {
    const text = [
      "GARBAGE",
      "IDROU0321789<<0<<<<<<<<<<<<<<",
      "9001017M2501017ROU<<<<<<<<<<<0",
      "POPESCU<<ION<<<<<<<<<<<<<<<<<",
    ].join("\n");
    expect(extractMrzLinesFromOcrText(text)).toBeNull();
  });

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

  it("refines OCR typo block when checksum validates after correction", async () => {
    const noisy = refineTd1Candidates([
      [
        RO_CI_TD1[0]!,
        "9OO1011M25O1O17ROU<<<<<<<<<<<8",
        RO_CI_TD1[2]!,
      ],
    ]);
    expect(noisy).not.toBeNull();
    const parsed = await parseMrzIdentity(noisy!);
    expect(parsed.ok).toBe(true);
  });
});
