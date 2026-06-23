import { parse } from "mrz";

const TD1_LEN = 30;
const TD2_LEN = 36;
const TD3_LEN = 44;

/** Checksum valid, fără autocorrect. */
export const MRZ_SCORE_VALID = 1000;
/** Checksum valid după autocorrect ICAO. */
export const MRZ_SCORE_VALID_AUTOCORRECT = 700;
/** Scor minim pentru acceptarea unui bloc MRZ. */
export const MRZ_MIN_ACCEPT_SCORE = 650;

const MRZ_CHECK_DIGIT_FIELDS = [
  "documentNumberCheckDigit",
  "birthDateCheckDigit",
  "expirationDateCheckDigit",
  "compositeCheckDigit",
] as const;

/** Checksum ICAO valid — toate cifrele de control trec (ignoră cod țară invalid ex. UTO). */
export function isMrzParseChecksumValid(parsed: ReturnType<typeof parse>): boolean {
  if (parsed.valid) return true;

  const detailsByField = new Map(parsed.details.map((detail) => [detail.field, detail]));
  return MRZ_CHECK_DIGIT_FIELDS.every((field) => detailsByField.get(field)?.valid === true);
}

export function isAcceptableMrzScore(score: number): boolean {
  return score >= MRZ_MIN_ACCEPT_SCORE;
}

/** Scor pentru a alege cel mai probabil bloc MRZ din zgomot OCR. */
export function scoreMrzLines(lines: string[]): number {
  if (lines.length < 2) return 0;

  const attempts: Array<{ score: number }> = [];

  for (const autocorrect of [false, true]) {
    try {
      const parsed = parse(lines, { autocorrect });
      if (parsed.valid) {
        attempts.push({ score: autocorrect ? MRZ_SCORE_VALID_AUTOCORRECT : MRZ_SCORE_VALID });
      } else if (isMrzParseChecksumValid(parsed)) {
        attempts.push({ score: autocorrect ? 650 : 900 });
      } else {
        attempts.push({ score: autocorrect ? 80 : 120 });
      }
    } catch {
      attempts.push({ score: 0 });
    }
  }

  return attempts.reduce((best, item) => Math.max(best, item.score), 0);
}

export type MrzParseAttempt = {
  parsed: ReturnType<typeof parse>;
  usedAutocorrect: boolean;
};

/** Parsează MRZ — preferă varianta strictă cu checksum valid. */
export function parseMrzLinesBestEffort(lines: string[]): MrzParseAttempt | null {
  for (const usedAutocorrect of [false, true]) {
    try {
      const parsed = parse(lines, { autocorrect: usedAutocorrect });
      if (parsed.valid || isMrzParseChecksumValid(parsed)) {
        return { parsed, usedAutocorrect };
      }
    } catch {
      // try next mode
    }
  }

  return null;
}

function uniqueLineVariants(lines: string[][]): string[][] {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const variant of lines) {
    const key = variant.join("\n");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(variant);
  }
  return out;
}

function reorderTd1LinesIfUpsideDown(lines: string[]): string[] {
  if (lines.length !== 3) return lines;
  if (/^[IPAC]/.test(lines[0] ?? "")) return lines;

  const docIdx = lines.findIndex((line) => /^[IPAC]/.test(line));
  const nameIdx = lines.findIndex((line) => line.includes("<<") && !/^[IPAC]/.test(line));
  if (docIdx === -1 || nameIdx === -1) return lines;

  const dateIdx = [0, 1, 2].find((idx) => idx !== docIdx && idx !== nameIdx);
  if (dateIdx === undefined) return lines;

  return [lines[docIdx]!, lines[dateIdx]!, lines[nameIdx]!];
}

/** Încearcă parse strict pe bloc + corecții OCR + orientare inversată. */
export function tryParseMrzBlock(lines: string[]): MrzParseAttempt | null {
  const variants: string[][] = [lines];

  if (lines.length === 3) {
    const reversed = [...lines].reverse();
    variants.push(
      correctTd1Block(lines),
      correctTd1Block(reversed),
      reorderTd1LinesIfUpsideDown(lines),
      reorderTd1LinesIfUpsideDown(reversed),
    );
  } else if (lines.length === 2) {
    const isTd3 =
      /^P[A-Z<]/.test(lines[0] ?? "") ||
      lines.every((line) => line.length >= TD3_LEN - 4);
    variants.push(
      isTd3 ? correctTd3Block(lines) : correctTd2Block(lines),
      [...lines].reverse(),
    );
  }

  for (const candidate of uniqueLineVariants(variants)) {
    const attempt = parseMrzLinesBestEffort(candidate);
    if (attempt) return attempt;
  }

  return null;
}

/** TD1 linia 2: poziții cu cifre / sex / naționalitate. */
function correctTd1Line2(line: string): string {
  const chars = line.padEnd(TD1_LEN, "<").slice(0, TD1_LEN).split("");

  const digitPositions = new Set([0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29]);
  const letterPositions = new Set([15, 16, 17]);

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i] ?? "<";
    if (i === 7) {
      chars[i] = ch === "N" ? "M" : ch === "F" || ch === "M" || ch === "<" ? ch : "M";
      continue;
    }
    if (digitPositions.has(i)) {
      chars[i] = fixOcrDigit(ch);
      continue;
    }
    if (letterPositions.has(i)) {
      chars[i] = fixOcrLetter(ch);
    }
  }

  return chars.join("");
}

function correctTd1Line1(line: string): string {
  const chars = line.padEnd(TD1_LEN, "<").slice(0, TD1_LEN).split("");
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i] ?? "<";
    if (i <= 4 || i === 29) {
      if (i >= 2 && i <= 4) chars[i] = fixOcrLetter(ch);
      else if (i === 29) chars[i] = fixOcrDigit(ch);
      else chars[i] = fixOcrMrzChar(ch);
    } else if (i >= 5 && i <= 13) {
      chars[i] = fixOcrMrzChar(ch);
    } else {
      chars[i] = fixOcrFiller(ch);
    }
  }
  if (!/^[IPAC]/.test(chars.join(""))) {
    const joined = chars.join("");
    if (joined.startsWith("1D")) chars[0] = "I";
    if (joined.startsWith("LD")) chars[0] = "I";
  }
  return chars.join("");
}

function correctTd1Line3(line: string): string {
  return line
    .padEnd(TD1_LEN, "<")
    .slice(0, TD1_LEN)
    .split("")
    .map((ch) => fixOcrNameChar(ch))
    .join("");
}

function fixOcrDigit(ch: string): string {
  switch (ch) {
    case "O":
    case "D":
    case "Q":
      return "0";
    case "I":
    case "L":
    case "|":
      return "1";
    case "Z":
      return "2";
    case "S":
      return "5";
    case "G":
      return "6";
    case "B":
      return "8";
    default:
      return ch;
  }
}

function fixOcrLetter(ch: string): string {
  if (ch === "0") return "O";
  if (ch === "1") return "I";
  if (ch === "5") return "S";
  if (ch === "8") return "B";
  return fixOcrMrzChar(ch);
}

function fixOcrNameChar(ch: string): string {
  if (ch === "0") return "O";
  if (ch === "1") return "I";
  if (ch === "|") return "I";
  return fixOcrMrzChar(ch);
}

function fixOcrFiller(ch: string): string {
  if (ch === "K" || ch === "X" || ch === "|" || ch === "\\" || ch === "/") return "<";
  return fixOcrMrzChar(ch);
}

function fixOcrMrzChar(ch: string): string {
  if (ch === "«" || ch === "»" || ch === "‹" || ch === "›") return "<";
  if (ch === "|" || ch === "\\" || ch === "/") return "<";
  return ch;
}

/** Prenume frecvente RO — prefix matching când OCR lipește separatorii «<». */
const RO_GIVEN_NAME_PREFIXES = [
  "CRISTINA",
  "ALEXANDRA",
  "ALEXANDRU",
  "ANDREEA",
  "CONSTANTIN",
  "DANIELA",
  "ELISABETA",
  "FLORINA",
  "GABRIELA",
  "GEORGETA",
  "LAURENTIU",
  "MADALINA",
  "MIHAELA",
  "PETRONELA",
  "RUXANDRA",
  "SIMONA",
  "STEFAN",
  "CATALIN",
  "CIPRIAN",
  "GHEORGHE",
  "IOANA",
  "MARIA",
  "ELENA",
  "ALINA",
  "MONICA",
  "LAURA",
  "DIANA",
  "MIRELA",
  "ADRIANA",
  "CARMEN",
  "ROXANA",
  "CORINA",
  "LUCIA",
  "STELA",
  "GEORGE",
  "ANDREI",
  "MARIUS",
  "FLORIN",
  "BOGDAN",
  "DRAGOS",
  "NICOLAE",
  "ADRIAN",
  "DANIEL",
  "MATEI",
  "ANA",
  "ION",
  "VASILE",
  "RADU",
];

function decodeMrzInitialOcr(chunk: string): string {
  const raw = chunk.toUpperCase();
  if (/^SK$/i.test(raw) || /^KS$/i.test(raw)) return "E";
  if (/^K$/i.test(raw)) return "E";
  const trimmed = raw.replace(/^S+/, "");
  if (trimmed.length === 1) return trimmed;
  return trimmed;
}

function stripGivenNameSeparator(rest: string): string {
  if (/^S[A-Z]{4,}/.test(rest)) return rest.slice(1);
  return rest;
}

/** Desparte prenume lipite de OCR (ex. CRISTINASIOANASK → CRISTINA<IOANA<E). */
export function splitTd2GivenNameBlob(blob: string): string {
  let rest = blob.replace(/^S+/, "");

  if (!rest) return blob;

  const parts: string[] = [];
  let guard = 0;

  while (rest.length > 0 && guard++ < 8) {
    const prefix = RO_GIVEN_NAME_PREFIXES.filter((name) => rest.startsWith(name)).sort(
      (a, b) => b.length - a.length,
    )[0];

    if (prefix) {
      parts.push(prefix);
      rest = stripGivenNameSeparator(rest.slice(prefix.length));
      continue;
    }

    if (rest.length <= 3) {
      const initial = decodeMrzInitialOcr(rest);
      if (initial) parts.push(initial);
      break;
    }

    break;
  }

  if (parts.length <= 1) return blob;
  return parts.join("<");
}

/** Corecții OCR specifice TD1 (buletin RO) pe poziții ICAO. */
export function correctTd1Block(lines: string[]): string[] {
  if (lines.length < 3) return lines;
  return [
    correctTd1Line1(lines[0] ?? ""),
    correctTd1Line2(lines[1] ?? ""),
    correctTd1Line3(lines[2] ?? ""),
  ];
}

/**
 * TD2 linia 1: câmp nume (poziții 5–35).
 * OCR confundă «<<» cu «<» și filler «<» cu «L» — parserul duplică numele.
 */
function correctTd2Line1(line: string): string {
  const prefix = line.padEnd(TD2_LEN, "<").slice(0, 5);
  let nameField = line.padEnd(TD2_LEN, "<").slice(5, TD2_LEN);

  nameField = nameField
    .split("")
    .map((ch) => fixOcrNameChar(ch))
    .join("");

  nameField = nameField.replace(/L+(?=<|$)/g, (run) => "<".repeat(run.length));

  if (!/^[A-Z]{2,}<<[A-Z]/.test(nameField)) {
    nameField = nameField.replace(
      /^([A-Z]{2,})<([A-Z]{2,})/,
      (_match, surname: string, given: string) => `${surname}<<${given}`,
    );
  }

  const sepIdx = nameField.indexOf("<<");
  if (sepIdx !== -1) {
    const surname = nameField.slice(0, sepIdx);
    const givenRaw = nameField.slice(sepIdx + 2);
    const givenAlpha = givenRaw.match(/^[A-Z]+/)?.[0] ?? "";
    const fillerTail = givenRaw.slice(givenAlpha.length);

    if (givenAlpha.length >= 8) {
      const expanded = splitTd2GivenNameBlob(givenAlpha);
      if (expanded.includes("<")) {
        nameField = `${surname}<<${expanded}${fillerTail}`;
      }
    }
  }

  return prefix + nameField.padEnd(TD2_LEN - 5, "<").slice(0, TD2_LEN - 5);
}

/** Corecții OCR pe bloc TD2 (CI electronic 2×36). */
export function correctTd2Block(lines: string[]): string[] {
  if (lines.length < 2) return lines;
  return [correctTd2Line1(lines[0] ?? ""), lines[1]!.padEnd(TD2_LEN, "<").slice(0, TD2_LEN)];
}

/** Încearcă corecții + alege varianta cu cel mai bun scor checksum. */
export function refineTd2Candidates(candidates: string[][]): string[] | null {
  let bestLines: string[] | null = null;
  let bestScore = 0;

  for (const raw of candidates) {
    if (raw.length < 2) continue;
    const variants = [raw.slice(0, 2), correctTd2Block(raw.slice(0, 2))];

    for (const lines of variants) {
      const score = scoreMrzLines(lines);
      if (score > bestScore) {
        bestScore = score;
        bestLines = lines;
      }
    }
  }

  return isAcceptableMrzScore(bestScore) ? bestLines : null;
}

/** Încearcă corecții + alege varianta cu cel mai bun scor checksum. */
export function refineTd1Candidates(candidates: string[][]): string[] | null {
  let bestLines: string[] | null = null;
  let bestScore = 0;

  for (const raw of candidates) {
    if (raw.length < 3) continue;
    const variants = [
      raw.slice(0, 3),
      correctTd1Block(raw.slice(0, 3)),
    ];

    for (const lines of variants) {
      const score = scoreMrzLines(lines);
      if (score > bestScore) {
        bestScore = score;
        bestLines = lines;
      }
    }
  }

  return isAcceptableMrzScore(bestScore) ? bestLines : null;
}

function correctTd3Line1(line: string): string {
  return line
    .padEnd(TD3_LEN, "<")
    .slice(0, TD3_LEN)
    .split("")
    .map((ch) => fixOcrMrzChar(ch))
    .join("");
}

function correctTd3Line2(line: string): string {
  const chars = line.padEnd(TD3_LEN, "<").slice(0, TD3_LEN).split("");
  const digitPositions = new Set([
    0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
    29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42,
  ]);

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i] ?? "<";
    if (i === 20) {
      chars[i] = ch === "N" ? "M" : ch === "F" || ch === "M" || ch === "<" ? ch : "M";
      continue;
    }
    if (digitPositions.has(i)) {
      chars[i] = fixOcrDigit(ch);
    }
  }

  return chars.join("");
}

/** Corecții OCR pe bloc TD3 (pașaport 2×44). */
export function correctTd3Block(lines: string[]): string[] {
  if (lines.length < 2) return lines;
  return [correctTd3Line1(lines[0] ?? ""), correctTd3Line2(lines[1] ?? "")];
}

/** Încearcă corecții + alege varianta cu cel mai bun scor checksum. */
export function refineTd3Candidates(candidates: string[][]): string[] | null {
  let bestLines: string[] | null = null;
  let bestScore = 0;

  for (const raw of candidates) {
    if (raw.length < 2) continue;
    const variants = [raw.slice(0, 2), correctTd3Block(raw.slice(0, 2))];

    for (const lines of variants) {
      const score = scoreMrzLines(lines);
      if (score > bestScore) {
        bestScore = score;
        bestLines = lines;
      }
    }
  }

  return isAcceptableMrzScore(bestScore) ? bestLines : null;
}
