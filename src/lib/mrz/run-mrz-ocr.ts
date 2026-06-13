"use client";

export async function runMrzOcrOnImage(
  source: HTMLCanvasElement | HTMLImageElement | string,
): Promise<string> {
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng");
  await worker.setParameters({
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<",
    tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
  });
  const {
    data: { text },
  } = await worker.recognize(source);
  await worker.terminate();
  return text;
}
