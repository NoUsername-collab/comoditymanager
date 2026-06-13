/** Extrage linii MRZ din text OCR sau lipit manual. */

const MRZ_LINE = /^[A-Z0-9<]+$/;

function normalizeMrzLine(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s/g, "")
    .replace(/[^A-Z0-9<]/g, (ch) => {
      if (ch === "O") return "0";
      if (ch === "I" || ch === "L") return "1";
      return "";
    });
}

export function splitMrzInput(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map(normalizeMrzLine)
    .filter((line) => line.length > 0);
}

export function detectMrzFormat(lines: string[]): "TD1" | "TD2" | "TD3" | null {
  if (lines.length >= 3 && lines.slice(0, 3).every((line) => line.length === 30)) {
    return "TD1";
  }
  if (lines.length >= 2 && lines.slice(0, 2).every((line) => line.length === 36)) {
    return "TD2";
  }
  if (lines.length >= 2 && lines.slice(0, 2).every((line) => line.length === 44)) {
    return "TD3";
  }
  return null;
}

/** Găsește un bloc MRZ valid în text OCR liber. */
export function extractMrzLinesFromOcrText(text: string): string[] | null {
  const lines = text
    .split(/\r?\n/)
    .map(normalizeMrzLine)
    .filter((line) => line.length >= 28 && MRZ_LINE.test(line));

  for (let i = 0; i < lines.length; i++) {
    const td1 = lines.slice(i, i + 3);
    if (td1.length === 3 && td1.every((line) => line.length === 30)) {
      return td1;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const td2 = lines.slice(i, i + 2);
    if (td2.length === 2 && td2.every((line) => line.length === 36)) {
      return td2;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const td3 = lines.slice(i, i + 2);
    if (td3.length === 2 && td3.every((line) => line.length === 44)) {
      return td3;
    }
  }

  // Uneori OCR taie ultimul caracter — încearcă padding
  for (let i = 0; i < lines.length - 1; i++) {
    const a = lines[i];
    const b = lines[i + 1];
    if (a.length >= 42 && b.length >= 42) {
      const td3 = [a.padEnd(44, "<"), b.padEnd(44, "<")];
      if (td3.every((line) => line.length === 44)) return td3;
    }
  }

  return null;
}
