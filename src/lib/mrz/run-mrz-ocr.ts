"use client";

type TesseractPsm = import("tesseract.js").PSM;

function enhanceMrzContrast(imageData: ImageData): void {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const boosted = gray < 128 ? Math.max(0, gray - 50) : Math.min(255, gray + 50);
    const binary = boosted > 135 ? 255 : 0;
    data[i] = binary;
    data[i + 1] = binary;
    data[i + 2] = binary;
  }
}

function prepareCanvas(
  source: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  scale = 2,
): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = Math.max(Math.floor(sw * scale), 1);
  out.height = Math.max(Math.floor(sh * scale), 1);
  const ctx = out.getContext("2d");
  if (!ctx) return source;

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, out.width, out.height);

  const imageData = ctx.getImageData(0, 0, out.width, out.height);
  enhanceMrzContrast(imageData);
  ctx.putImageData(imageData, 0, 0);
  return out;
}

function cropMrzRegion(source: HTMLCanvasElement): HTMLCanvasElement {
  const cropHeight = Math.max(Math.floor(source.height * 0.34), 100);
  const cropY = Math.max(source.height - cropHeight, 0);
  return prepareCanvas(source, 0, cropY, source.width, cropHeight, 2);
}

function splitMrzLineCanvases(cropped: HTMLCanvasElement): HTMLCanvasElement[] {
  const bandHeight = Math.floor(cropped.height / 3);
  const canvases: HTMLCanvasElement[] = [];

  for (let i = 0; i < 3; i++) {
    const sy = i * bandHeight;
    const sh = i === 2 ? cropped.height - sy : bandHeight;
    canvases.push(
      prepareCanvas(cropped, 0, sy, cropped.width, sh, 2),
    );
  }

  return canvases;
}

let workerPromise: Promise<import("tesseract.js").Worker> | null = null;

async function getMrzWorker(): Promise<import("tesseract.js").Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, PSM } = await import("tesseract.js");
      const worker = await createWorker("eng");
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      });
      return worker;
    })();
  }
  return workerPromise;
}

async function recognizeMrzText(
  source: HTMLCanvasElement | HTMLImageElement | string,
  psm?: TesseractPsm,
): Promise<string> {
  const { PSM } = await import("tesseract.js");
  const worker = await getMrzWorker();
  if (psm != null) {
    await worker.setParameters({ tessedit_pageseg_mode: psm });
  }
  const {
    data: { text },
  } = await worker.recognize(source);
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });
  return text.trim();
}

/** OCR pe imagine — returnează mai multe variante pentru alegerea cu checksum valid. */
export async function runMrzOcrOnImage(
  source: HTMLCanvasElement | HTMLImageElement | string,
): Promise<string[]> {
  if (!(source instanceof HTMLCanvasElement)) {
    const text = await recognizeMrzText(source, (await import("tesseract.js")).PSM.SINGLE_BLOCK);
    return text ? [text] : [];
  }

  const { PSM } = await import("tesseract.js");
  const cropped = cropMrzRegion(source);
  const lineCanvases = splitMrzLineCanvases(cropped);

  const lineTexts = await Promise.all(
    lineCanvases.map((canvas) => recognizeMrzText(canvas)),
  );
  const perLineCombined = lineTexts.filter(Boolean).join("\n");

  const [croppedBlock, fullBlock] = await Promise.all([
    recognizeMrzText(cropped, PSM.SINGLE_BLOCK),
    recognizeMrzText(source, PSM.SINGLE_BLOCK),
  ]);

  return [perLineCombined, croppedBlock, fullBlock].filter(Boolean);
}

export async function terminateMrzOcrWorker(): Promise<void> {
  if (!workerPromise) return;
  const worker = await workerPromise;
  await worker.terminate();
  workerPromise = null;
}
