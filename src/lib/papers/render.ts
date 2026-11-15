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

/** A piece of text on a page: [text, left, top, width, font height], all as fractions of the page. */
export type TextItem = [string, number, number, number, number];

/** The PDF's own text with its position, so students can select words on the page picture. Empty for scanned PDFs. */
export async function extractPageText(doc: PDFDocumentProxy, pageNumber: number): Promise<TextItem[]> {
  const pdfjs = await import("pdfjs-dist");
  const page = await doc.getPage(pageNumber);
  const vp = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const r = (n: number) => Math.round(n * 10000) / 10000;
  const out: TextItem[] = [];
  for (const it of content.items) {
    if (!("str" in it) || !it.str.trim()) continue;
    const tx = pdfjs.Util.transform(vp.transform, it.transform);
    const fh = Math.hypot(tx[2], tx[3]);
    if (!fh || !Number.isFinite(fh)) continue;
    out.push([it.str.slice(0, 200), r(tx[4] / vp.width), r((tx[5] - fh) / vp.height), r(it.width / vp.width), r(fh / vp.height)]);
  }
  return out;
}
