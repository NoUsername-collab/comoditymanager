/** Extrage linii MRZ din text OCR sau lipit manual. */

import {
  correctTd1Block,
  refineTd1Candidates,
  scoreMrzLines,
} from "@/domain/guest/mrz-parse";

const MRZ_LINE = /^[A-Z0-9<]+$/;
const TD1_LEN = 30;
const TD2_LEN = 36;
const TD3_LEN = 44;

const TD1_LINE1 = /^[IPAC][A-Z<]/;
const TD1_MIN = 24;
const TD1_MAX = 34;

function normalizeMrzLine(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[«‹›»]/g, "<")
    .replace(/[|\\/]/g, "<")
    .replace(/\s/g, "")
    .replace(/[^A-Z0-9<]/g, "");
}

function fitMrzLine(line: string, targetLength: number): string {
  if (line.length === targetLength) return line;
  if (line.length > targetLength) return line.slice(0, targetLength);
  return line.padEnd(targetLength, "<");
}

function looksLikeMrzLine(line: string, minLength: number): boolean {
  return line.length >= minLength && MRZ_LINE.test(line);
}

function looksLikeTd1Block(lines: string[]): boolean {
  if (lines.length !== 3) return false;
  if (!lines.every((line) => looksLikeMrzLine(line, TD1_MIN))) return false;
  return TD1_LINE1.test(lines[0]);
}

function looksLikeTd3Block(lines: string[]): boolean {
  if (lines.length !== 2) return false;
  if (!lines.every((line) => looksLikeMrzLine(line, TD3_LEN - 4))) return false;
  return /^P[A-Z<]/.test(lines[0]);
}

function mergeBrokenMrzLines(lines: string[]): string[] {
  const merged: string[] = [];
  let i = 0;

  while (i < lines.length) {
    let line = lines[i] ?? "";
    while (
      line.length > 0 &&
      line.length < TD1_MIN &&
      i + 1 < lines.length &&
      (lines[i + 1]?.length ?? 0) < TD1_MIN
    ) {
      i += 1;
      line += lines[i] ?? "";
    }
    if (line.length > 0) merged.push(line);
    i += 1;
  }

  return merged;
}

function fitTd1Block(lines: string[]): string[] {
  return lines.map((line) => fitMrzLine(line, TD1_LEN));
}

function fitTd2Block(lines: string[]): string[] {
  return lines.map((line) => fitMrzLine(line, TD2_LEN));
}

function fitTd3Block(lines: string[]): string[] {
  return lines.map((line) => fitMrzLine(line, TD3_LEN));
}

function collectExactBlocks(lines: string[]): string[][] {
  const blocks: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const td1 = lines.slice(i, i + 3);
    if (td1.length === 3 && td1.every((line) => line.length === TD1_LEN)) {
      blocks.push(td1);
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const td2 = lines.slice(i, i + 2);
    if (td2.length === 2 && td2.every((line) => line.length === TD2_LEN)) {
      blocks.push(td2);
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const td3 = lines.slice(i, i + 2);
    if (td3.length === 2 && td3.every((line) => line.length === TD3_LEN)) {
      blocks.push(td3);
    }
  }

  return blocks;
}

function collectFuzzyTd1(lines: string[]): string[][] {
  const blocks: string[][] = [];
  for (let i = 0; i <= lines.length - 3; i++) {
    const chunk = lines.slice(i, i + 3);
    if (!chunk.every((line) => line.length >= TD1_MIN && line.length <= TD1_MAX)) {
      continue;
    }
    const fitted = fitTd1Block(chunk);
    if (looksLikeTd1Block(fitted)) blocks.push(fitted);
  }
  return blocks;
}

function collectFuzzyTd2(lines: string[]): string[][] {
  const blocks: string[][] = [];
  for (let i = 0; i <= lines.length - 2; i++) {
    const chunk = lines.slice(i, i + 2);
    if (!chunk.every((line) => line.length >= TD2_LEN - 4 && line.length <= TD2_LEN + 2)) {
      continue;
    }
    blocks.push(fitTd2Block(chunk));
  }
  return blocks;
}

function collectFuzzyTd3(lines: string[]): string[][] {
  const blocks: string[][] = [];
  for (let i = 0; i <= lines.length - 2; i++) {
    const chunk = lines.slice(i, i + 2);
    if (!chunk.every((line) => line.length >= TD3_LEN - 4 && line.length <= TD3_LEN + 2)) {
      continue;
    }
    const fitted = fitTd3Block(chunk);
    if (looksLikeTd3Block(fitted)) blocks.push(fitted);
  }
  return blocks;
}

function collectContinuousTd1(text: string): string[][] {
  const blob = normalizeMrzLine(text.replace(/\r?\n/g, ""));
  if (blob.length < TD1_LEN * 3 - 6 || blob.length > TD1_LEN * 3 + 6) return [];

  const fitted = fitTd1Block([
    blob.slice(0, TD1_LEN),
    blob.slice(TD1_LEN, TD1_LEN * 2),
    blob.slice(TD1_LEN * 2, TD1_LEN * 3),
  ]);
  return looksLikeTd1Block(fitted) ? [fitted] : [];
}

function collectTd1Candidates(text: string): string[][] {
  const rawLines = text
    .split(/\r?\n/)
    .map(normalizeMrzLine)
    .filter((line) => line.length >= TD1_MIN - 2);

  const lines = mergeBrokenMrzLines(rawLines).filter((line) =>
    looksLikeMrzLine(line, TD1_MIN - 2),
  );

  return [
    ...collectExactBlocks(lines),
    ...collectFuzzyTd1(lines),
    ...collectContinuousTd1(text),
  ];
}

function pickBestBlock(candidates: string[][]): string[] | null {
  if (candidates.length === 0) return null;

  const td1Candidates = candidates.filter((block) => block.length === 3);
  if (td1Candidates.length > 0) {
    const refined = refineTd1Candidates(td1Candidates);
    if (refined) return refined;
  }

  let best: string[] | null = null;
  let bestScore = 0;
  for (const block of candidates) {
    const score = scoreMrzLines(block);
    if (score > bestScore) {
      bestScore = score;
      best = block;
    }
  }

  return bestScore > 0 ? best : candidates[0] ?? null;
}

export function splitMrzInput(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map(normalizeMrzLine)
    .filter((line) => line.length > 0);
}

export function detectMrzFormat(lines: string[]): "TD1" | "TD2" | "TD3" | null {
  if (lines.length >= 3) {
    const exact = lines.slice(0, 3);
    if (exact.every((line) => line.length === TD1_LEN)) return "TD1";
    if (looksLikeTd1Block(fitTd1Block(exact))) return "TD1";
  }

  if (lines.length >= 2) {
    const exact2 = lines.slice(0, 2);
    if (exact2.every((line) => line.length === TD2_LEN)) return "TD2";
    if (exact2.every((line) => line.length === TD3_LEN)) return "TD3";
    if (looksLikeTd3Block(fitTd3Block(exact2))) return "TD3";
  }

  return null;
}

export function normalizeMrzBlock(lines: string[]): string[] | null {
  const cleaned = lines.map(normalizeMrzLine).filter((line) => line.length > 0);
  if (cleaned.length === 0) return null;

  const format = detectMrzFormat(cleaned);
  if (!format) return null;

  if (format === "TD1") {
    const fitted = fitTd1Block(cleaned.slice(0, 3));
    return correctTd1Block(fitted);
  }
  if (format === "TD2") return fitTd2Block(cleaned.slice(0, 2));
  return fitTd3Block(cleaned.slice(0, 2));
}

/** Găsește blocul MRZ cu cel mai bun scor checksum din text OCR. */
export function extractMrzLinesFromOcrText(text: string): string[] | null {
  const td1Candidates = collectTd1Candidates(text);
  const td1 = pickBestBlock(td1Candidates);
  if (td1) return td1;

  const rawLines = text
    .split(/\r?\n/)
    .map(normalizeMrzLine)
    .filter((line) => line.length >= TD1_MIN - 2);
  const lines = mergeBrokenMrzLines(rawLines).filter((line) =>
    looksLikeMrzLine(line, TD1_MIN - 2),
  );

  return pickBestBlock([
    ...collectExactBlocks(lines),
    ...collectFuzzyTd3(lines),
    ...collectFuzzyTd2(lines),
  ]);
}

/** Alege cel mai bun bloc din mai multe ieșiri OCR. */
export function extractMrzLinesFromOcrTexts(texts: string[]): string[] | null {
  const candidates: string[][] = [];
  for (const text of texts) {
    const lines = extractMrzLinesFromOcrText(text);
    if (lines) candidates.push(lines);
  }
  return pickBestBlock(candidates);
}

export { scoreMrzLines };
