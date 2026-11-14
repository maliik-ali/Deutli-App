"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";

/** Opens a PDF in the browser (pdf.js). The worker file lives in /public. */
export async function openPdf(file: File): Promise<PDFDocumentProxy> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const data = new Uint8Array(await file.arrayBuffer());
  return pdfjs.getDocument({ data }).promise;
}

export async function renderPage(doc: PDFDocumentProxy, pageNumber: number, width: number, canvas?: HTMLCanvasElement) {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const viewport = page.getViewport({ scale: width / base.width });
  const c = canvas ?? document.createElement("canvas");
  c.width = Math.floor(viewport.width);
  c.height = Math.floor(viewport.height);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return c;
}

/** One PDF page as a JPEG (about 1400 px wide, sharp enough to read on a laptop). */
export async function pageToJpeg(doc: PDFDocumentProxy, pageNumber: number): Promise<Blob> {
  const c = await renderPage(doc, pageNumber, 1400);
  const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("no blob");
  return blob;
}

/** Shrinks any picture to a JPEG of at most `maxWidth` px wide (for cover photos). */
export async function imageToJpeg(file: File, maxWidth = 900): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const c = document.createElement("canvas");
  c.width = Math.round(bitmap.width * scale);
  c.height = Math.round(bitmap.height * scale);
  c.getContext("2d")?.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("no blob");
  return blob;
}
