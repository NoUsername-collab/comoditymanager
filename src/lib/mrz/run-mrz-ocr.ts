"use client";

function enhanceMrzContrast(imageData: ImageData): void {
  const { data } = imageData;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const boosted = gray < 128 ? Math.max(0, gray - 40) : Math.min(255, gray + 40);
    const binary = boosted > 140 ? 255 : 0;
    data[i] = binary;
    data[i + 1] = binary;
    data[i + 2] = binary;
  }
}

function cropMrzRegion(source: HTMLCanvasElement): HTMLCanvasElement {
  const cropHeight = Math.max(Math.floor(source.height * 0.38), 120);
  const cropY = Math.max(source.height - cropHeight, 0);
  const out = document.createElement("canvas");
  out.width = source.width;
  out.height = cropHeight;
  const ctx = out.getContext("2d");
  if (!ctx) return source;

  ctx.drawImage(
    source,
    0,
    cropY,
    source.width,
    cropHeight,
    0,
    0,
    source.width,
    cropHeight,
  );

  const imageData = ctx.getImageData(0, 0, out.width, out.height);
  enhanceMrzContrast(imageData);
  ctx.putImageData(imageData, 0, 0);
  return out;
}

async function recognizeMrzText(
  source: HTMLCanvasElement | HTMLImageElement | string,
  psm: number,
): Promise<string> {
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng");
  await worker.setParameters({
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
    tessedit_pageseg_mode: psm,
  });
  const {
    data: { text },
  } = await worker.recognize(source);
  await worker.terminate();
  return text;
}

export async function runMrzOcrOnImage(
  source: HTMLCanvasElement | HTMLImageElement | string,
): Promise<string> {
  const { PSM } = await import("tesseract.js");

  if (source instanceof HTMLCanvasElement) {
    const cropped = cropMrzRegion(source);
    const [fullBlock, croppedBlock, croppedLine] = await Promise.all([
      recognizeMrzText(source, PSM.SINGLE_BLOCK),
      recognizeMrzText(cropped, PSM.SINGLE_BLOCK),
      recognizeMrzText(cropped, PSM.SINGLE_LINE),
    ]);
    return [fullBlock, croppedBlock, croppedLine].filter(Boolean).join("\n");
  }

  return recognizeMrzText(source, PSM.SINGLE_BLOCK);
}
