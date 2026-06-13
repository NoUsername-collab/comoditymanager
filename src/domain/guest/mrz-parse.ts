import { parse } from "mrz";

const TD1_LEN = 30;
const TD2_LEN = 36;

/** Scor pentru a alege cel mai probabil bloc MRZ din zgomot OCR. */
export function scoreMrzLines(lines: string[]): number {
  if (lines.length < 2) return 0;

  const attempts: Array<{ score: number; valid: boolean }> = [];

  for (const autocorrect of [false, true]) {
    try {
      const parsed = parse(lines, { autocorrect });
      if (parsed.valid) {
        attempts.push({ score: autocorrect ? 700 : 1000, valid: true });
      } else {
        attempts.push({ score: autocorrect ? 80 : 120, valid: false });
      }
    } catch {
      attempts.push({ score: 0, valid: false });
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
      if (parsed.valid) {
        return { parsed, usedAutocorrect };
      }
    } catch {
      // try next mode
    }
  }

  for (const usedAutocorrect of [false, true]) {
    try {
      const parsed = parse(lines, { autocorrect: usedAutocorrect });
      return { parsed, usedAutocorrect };
    } catch {
      // try next mode
    }
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

  return bestScore > 0 ? bestLines : null;
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

  return bestScore > 0 ? bestLines : null;
}
