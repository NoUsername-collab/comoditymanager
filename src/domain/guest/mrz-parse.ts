import { parse } from "mrz";

const TD1_LEN = 30;

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

/** Corecții OCR specifice TD1 (buletin RO) pe poziții ICAO. */
export function correctTd1Block(lines: string[]): string[] {
  if (lines.length < 3) return lines;
  return [
    correctTd1Line1(lines[0] ?? ""),
    correctTd1Line2(lines[1] ?? ""),
    correctTd1Line3(lines[2] ?? ""),
  ];
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
