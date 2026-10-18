/**
 * Plain text from a resume file, read entirely in the browser.
 *
 * The file is never uploaded: PDFs go through pdf.js in a Web Worker on this device, Word files
 * are unzipped here and their XML read with DOMParser. pdf.js is configured to fetch nothing
 * (no fonts, no character maps), so reading a resume makes no network request with its data.
 * Loaded with import() only after a student picks a file.
 */

import { unzipSync } from "fflate";

export const MAX_BYTES = 10 * 1024 * 1024;
/** Fewer characters than this from a PDF almost always means a scanned image with no text layer. */
export const MIN_PDF_CHARS = 200;
const MAX_PAGES = 20;
/** Unzipped size limit for word/document.xml, so a tiny "zip bomb" cannot eat the device's memory. */
const MAX_XML_BYTES = 30 * 1024 * 1024;

export type ReadProblem =
  | "too-big" // over MAX_BYTES
  | "legacy-doc" // Word 97–2003 .doc
  | "wrong-type" // not .pdf or .docx
  | "scanned" // a PDF with (almost) no text layer
  | "locked" // password-protected
  | "unreadable"; // damaged, or not really the format its name says

export type ReadResult = { ok: true; text: string } | { ok: false; problem: ReadProblem };

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const MC = "http://schemas.openxmlformats.org/markup-compatibility/2006";

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((b, i) => bytes[i] === b);
}
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46]; // %PDF
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]; // PK..
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0]; // old Office files, and password-protected .docx

export async function extractText(file: File): Promise<ReadResult> {
  const name = file.name.toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  if (ext === ".doc" || file.type === "application/msword") return { ok: false, problem: "legacy-doc" };
  if (ext !== ".pdf" && ext !== ".docx") return { ok: false, problem: "wrong-type" };
  if (file.size > MAX_BYTES) return { ok: false, problem: "too-big" };

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (startsWith(bytes, OLE_SIGNATURE)) return { ok: false, problem: ext === ".docx" ? "locked" : "legacy-doc" };

  if (startsWith(bytes, PDF_SIGNATURE)) {
    const result = await pdfText(bytes);
    if (!result.ok) return result;
    const chars = result.text.replace(/\s+/g, " ").trim().length;
    return chars < MIN_PDF_CHARS ? { ok: false, problem: "scanned" } : result;
  }
  if (startsWith(bytes, ZIP_SIGNATURE)) {
    const text = docxText(bytes);
    return text === null ? { ok: false, problem: "unreadable" } : { ok: true, text };
  }
  return { ok: false, problem: "unreadable" };
}

async function pdfText(data: Uint8Array): Promise<ReadResult> {
  // The legacy build includes fallbacks for older Safari and Chrome, which phones often run.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const port = new Worker(new URL("./pdf.worker.ts", import.meta.url), { type: "module" });
  // Errors only: pdf.js warns about fonts it was told not to fetch, which text extraction doesn't need.
  const verbosity = pdfjs.VerbosityLevel.ERRORS;
  const worker = pdfjs.PDFWorker.create({ port, verbosity });
  const task = pdfjs.getDocument({
    data,
    worker,
    verbosity,
    // Text only: no font loading and no fetching of fonts, character maps or wasm decoders.
    disableFontFace: true,
    useSystemFonts: false,
    useWorkerFetch: false,
    enableXfa: false,
    stopAtErrors: false,
  });
  try {
    const doc = await task.promise;
    const pages: string[] = [];
    for (let n = 1; n <= Math.min(doc.numPages, MAX_PAGES); n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      pages.push(joinTextItems(content.items));
      page.cleanup();
    }
    return { ok: true, text: pages.join("\n\n") };
  } catch (error) {
    const locked = error instanceof Error && error.name === "PasswordException";
    return { ok: false, problem: locked ? "locked" : "unreadable" };
  } finally {
    await task.destroy();
    worker.destroy();
    port.terminate();
  }
}

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL: boolean;
}

/** pdf.js gives positioned runs of text; put spaces and line breaks back where the layout has them. */
function joinTextItems(items: readonly (PdfTextItem | object)[]): string {
  let out = "";
  let last: PdfTextItem | null = null;
  for (const item of items) {
    if (!("str" in item)) continue; // marked-content markers carry no text
    if (item.str === "") {
      if (item.hasEOL) out += "\n";
      continue;
    }
    if (last && out && !/\s$/.test(out) && !/^\s/.test(item.str)) {
      const lineHeight = Math.max(1, last.height);
      if (Math.abs(item.transform[5] - last.transform[5]) > lineHeight / 2) out += "\n";
      else if (item.transform[4] - (last.transform[4] + last.width) > lineHeight * 0.15) out += " ";
    }
    out += item.str;
    if (item.hasEOL) out += "\n";
    last = item;
  }
  return out;
}

/** Text of word/document.xml, one line per paragraph. Null when the file is not a readable .docx. */
function docxText(bytes: Uint8Array): string | null {
  let xml: Uint8Array | undefined;
  try {
    const files = unzipSync(bytes, {
      filter: (f) => f.name === "word/document.xml" && f.originalSize <= MAX_XML_BYTES,
    });
    xml = files["word/document.xml"];
  } catch {
    return null;
  }
  if (!xml) return null;
  const doc = new DOMParser().parseFromString(new TextDecoder().decode(xml), "application/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) return null;
  const out: string[] = [];
  walkDocx(doc.documentElement, out);
  return out.join("");
}

function walkDocx(node: Element, out: string[]): void {
  for (const child of Array.from(node.children)) {
    // Text boxes are stored twice (modern + fallback drawing); read them once.
    if (child.namespaceURI === MC && child.localName === "Fallback") continue;
    if (child.namespaceURI === W) {
      switch (child.localName) {
        case "t":
          out.push(child.textContent ?? "");
          continue;
        case "tab":
          out.push("\t");
          continue;
        case "br":
        case "cr":
          out.push("\n");
          continue;
        case "noBreakHyphen":
          out.push("-");
          continue;
        case "delText": // deleted text in tracked changes
        case "instrText": // field codes such as HYPERLINK "…"
          continue;
      }
    }
    walkDocx(child, out);
    if (child.namespaceURI === W && child.localName === "p") out.push("\n");
  }
}
