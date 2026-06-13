import { describe, expect, it } from "vitest";
import { extractMrzLinesFromOcrText } from "@/domain/guest/mrz-ocr";
import { mrzToGuestPatch, mrzToPrecheckinFields, parseMrzIdentity } from "@/domain/guest/mrz";

const TD1_SAMPLE = [
  "I<UTOD23145890<1233<<<<<<<<<<<",
  "7408122F1204159UTO<<<<<<<<<<<2",
  "ERIKSSON<<ANNA<MARIA<<<<<<<<<<",
];

const RO_CI_TD1 = [
  "IDROU0321789<<0<<<<<<<<<<<<<<<",
  "9001017M2501017ROU<<<<<<<<<<<6",
  "POPESCU<<ION<<<<<<<<<<<<<<<<<<",
];

describe("parseMrzIdentity", () => {
  it("parses TD1 sample", () => {
    const result = parseMrzIdentity(TD1_SAMPLE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.lastName).toBe("ERIKSSON");
    expect(result.data.firstName).toBe("ANNA MARIA");
    expect(result.data.birthDate).toBe("1974-08-12");
    expect(result.data.format).toBe("TD1");
  });

  it("maps to guest patch with names", () => {
    const result = parseMrzIdentity(TD1_SAMPLE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const patch = mrzToGuestPatch(result.data);
    expect(patch.last_name).toBe("ERIKSSON");
    expect(patch.first_name).toBe("ANNA MARIA");
    expect(patch.birth_date).toBe("1974-08-12");
  });

  it("rejects empty input", () => {
    expect(parseMrzIdentity("")).toEqual({ ok: false, error: "empty" });
  });

  it("rejects invalid line count", () => {
    expect(parseMrzIdentity("ABC\nDEF")).toEqual({ ok: false, error: "invalid_format" });
  });
});

describe("extractMrzLinesFromOcrText", () => {
  it("finds TD1 block in noisy OCR", () => {
    const text = [
      "SCAN RESULT",
      ...TD1_SAMPLE,
      "END",
    ].join("\n");
    expect(extractMrzLinesFromOcrText(text)).toEqual(TD1_SAMPLE);
  });

  it("finds truncated TD1 lines from OCR", () => {
    const text = [
      "NOISE",
      "IDROU0321789<<0<<<<<<<<<<<<<<", // 29 chars
      "9001017M2501017ROU<<<<<<<<<<<", // 29 chars
      "POPESCU<<ION<<<<<<<<<<<<<<<<<", // 29 chars
    ].join("\n");
    const lines = extractMrzLinesFromOcrText(text);
    expect(lines).not.toBeNull();
    expect(lines?.every((line) => line.length === 30)).toBe(true);
  });

  it("finds Romanian CI TD1 sample", () => {
    const result = parseMrzIdentity(RO_CI_TD1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.lastName).toBe("POPESCU");
    expect(result.data.firstName).toBe("ION");
    expect(result.data.documentType).toBe("ci");
  });

  it("finds MRZ in continuous blob without newlines", () => {
    const blob = RO_CI_TD1.join("");
    expect(extractMrzLinesFromOcrText(blob)).toEqual(RO_CI_TD1);
  });
});

describe("mrzToPrecheckinFields", () => {
  it("maps passport document type", () => {
    const result = parseMrzIdentity(TD1_SAMPLE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const fields = mrzToPrecheckinFields(result.data);
    expect(fields.documentNumber).toBeTruthy();
    expect(fields.notesAppend).toContain("Nume MRZ");
  });
});
