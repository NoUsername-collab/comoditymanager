import { describe, expect, it } from "vitest";
import { extractMrzLinesFromOcrText } from "@/domain/guest/mrz-ocr";
import { mrzToGuestPatch, mrzToPrecheckinFields, parseMrzIdentity } from "@/domain/guest/mrz";

const TD1_SAMPLE = [
  "I<SWED23145890<1233<<<<<<<<<<<",
  "7408122F1204159SWE<<<<<<<<<<<2",
  "ERIKSSON<<ANNA<MARIA<<<<<<<<<<",
];

const RO_CI_TD1 = [
  "IDROU0321789<<0<<<<<<<<<<<<<<<",
  "9001011M2501017ROU<<<<<<<<<<<8",
  "POPESCU<<ION<<<<<<<<<<<<<<<<<<",
];

/** CI electronic RO — OCR tipic: «<» în loc de «<<», «L» în loc de filler. */
const RO_EID_TD2_OCR = [
  "IDROUPETRIK<CRISTINASIOANASK<LLLLLL<",
  "XB674552<7ROU9604113F310411621257731",
];

describe("parseMrzIdentity", () => {
  it("parses TD1 sample", async () => {
    const result = await parseMrzIdentity(TD1_SAMPLE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.lastName).toBe("ERIKSSON");
    expect(result.data.firstName).toBe("ANNA MARIA");
    expect(result.data.birthDate).toBe("1974-08-12");
    expect(result.data.format).toBe("TD1");
  });

  it("maps to guest patch with names", async () => {
    const result = await parseMrzIdentity(TD1_SAMPLE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const patch = mrzToGuestPatch(result.data);
    expect(patch.last_name).toBe("ERIKSSON");
    expect(patch.first_name).toBe("ANNA MARIA");
    expect(patch.birth_date).toBe("1974-08-12");
  });

  it("rejects empty input", async () => {
    expect(await parseMrzIdentity("")).toEqual({ ok: false, error: "empty" });
  });

  it("rejects invalid line count", async () => {
    expect(await parseMrzIdentity("ABC\nDEF")).toEqual({ ok: false, error: "invalid_format" });
  });

  it("rejects corrupt checksum on Romanian CI", async () => {
    const corrupt = [
      RO_CI_TD1[0]!,
      "9001017M2501017ROU<<<<<<<<<<<0",
      RO_CI_TD1[2]!,
    ];
    expect(await parseMrzIdentity(corrupt)).toEqual({ ok: false, error: "checksum_failed" });
  });

  it("parses Romanian eID TD2 with noisy OCR on name line", async () => {
    const result = await parseMrzIdentity(RO_EID_TD2_OCR);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.lastName).toBe("PETRIK");
    expect(result.data.firstName).toBe("CRISTINA IOANA E");
    expect(result.data.documentNumber).toBe("XB674552");
    expect(result.data.birthDate).toBe("1996-04-11");
    expect(result.data.nationality).toBe("România");
    expect(result.data.format).toBe("TD2");
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
      RO_CI_TD1[0]!.slice(0, -1),
      RO_CI_TD1[1],
      RO_CI_TD1[2]!.slice(0, -1),
    ].join("\n");
    const lines = extractMrzLinesFromOcrText(text);
    expect(lines).not.toBeNull();
    expect(lines?.every((line) => line.length === 30)).toBe(true);
  });

  it("finds Romanian CI TD1 sample", async () => {
    const result = await parseMrzIdentity(RO_CI_TD1);
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
  it("maps passport document type", async () => {
    const result = await parseMrzIdentity(TD1_SAMPLE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const fields = mrzToPrecheckinFields(result.data);
    expect(fields.documentNumber).toBeTruthy();
    expect(fields.notesAppend).toContain("Nume MRZ");
  });
});
