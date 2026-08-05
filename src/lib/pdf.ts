import * as pdfjsLib from 'pdfjs-dist';
// FIX: must import the WORKER file, not the main library.
// pdf.min.mjs is the API; pdf.worker.min.mjs is the worker.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractionResult {
  pages: ExtractedPage[];
  fullText: string;
  pageCount: number;
  wordCount: number;
}

export class PdfExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfExtractionError';
  }
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const EXTRACTION_TIMEOUT_MS = 30_000; // 30 seconds

/**
 * Race a promise against a timeout. Rejects with a custom message if the
 * timeout fires first.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Extract text from a PDF file using pdfjs-dist.
 * Logs detailed diagnostics for every step and enforces a 30-second timeout.
 */
export async function extractPdf(file: File): Promise<ExtractionResult> {
  const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
  console.log(`[PDF] [3] Extraction started — file: "${file.name}", size: ${fileSizeMB} MB, type: ${file.type}`);

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!file.type || (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf'))) {
    throw new PdfExtractionError('The selected file is not a PDF. Please upload a .pdf file.');
  }
  console.log('[PDF] [2] File validation completed — is PDF');

  if (file.size === 0) {
    throw new PdfExtractionError('The selected file is empty (0 bytes).');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new PdfExtractionError(
      `The file is ${fileSizeMB} MB — the maximum supported size is 50 MB. Please upload a smaller PDF.`,
    );
  }

  // ── Read file ──────────────────────────────────────────────────────────────
  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await withTimeout(
      file.arrayBuffer(),
      10_000,
      'Could not read the file from disk (timed out). Please try again.',
    );
    console.log(`[PDF] File loaded into memory — ${arrayBuffer.byteLength} bytes`);
  } catch (err) {
    throw new PdfExtractionError(
      err instanceof Error ? err.message : 'Could not read the file from disk. Please try again.',
    );
  }

  // ── Open PDF ──────────────────────────────────────────────────────────────
  let pdf: any;
  try {
    console.log(`[PDF] getDocument() — ArrayBuffer length: ${arrayBuffer.byteLength}, first bytes: ${new Uint8Array(arrayBuffer.slice(0, 5)).join(',')}`);
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    pdf = await withTimeout(loadingTask.promise, EXTRACTION_TIMEOUT_MS, 'Opening the PDF timed out. The file may be corrupted.');
    console.log(`[PDF] [4] Document opened — ${pdf.numPages} page(s)`);
  } catch (err) {
    // Print the COMPLETE original exception — never hide it behind a generic message.
    console.error('[PDF] getDocument() threw:', err);
    if (err instanceof Error) {
      console.error('[PDF] Stack:', err.stack);
    }
    if (err instanceof PdfExtractionError) throw err;
    const detail = err instanceof Error ? err.message : String(err);
    throw new PdfExtractionError(
      `Could not open this PDF. Original error: ${detail}`,
    );
  }

  // ── Extract text page by page ──────────────────────────────────────────────
  const pages: ExtractedPage[] = [];
  let fullText = '';
  let wordCount = 0;
  let emptyPages = 0;

  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      pages.push({ pageNumber: i, text: pageText });
      fullText += pageText + '\n\n';
      wordCount += pageText ? pageText.split(/\s+/).length : 0;
      if (!pageText) emptyPages++;
    } catch (err) {
      console.warn(`[PDF] Could not extract text from page ${i}:`, err);
      pages.push({ pageNumber: i, text: '' });
    }
  }

  fullText = fullText.trim();
  console.log(
    `[PDF] [4] Extraction completed — ${pdf.numPages} pages, ${fullText.length} chars, ${wordCount} words, ${emptyPages} empty page(s)`,
  );

  // ── Validate extracted text ────────────────────────────────────────────────
  if (!fullText || fullText.length < 10) {
    throw new PdfExtractionError(
      'No readable text could be extracted from this PDF. It may be a scanned image PDF without selectable text.',
    );
  }
  if (wordCount < 10) {
    throw new PdfExtractionError(
      `Only ${wordCount} words could be extracted from this PDF. The document may be a scanned image. Try a PDF with selectable text.`,
    );
  }

  return {
    pages,
    fullText,
    pageCount: pdf.numPages,
    wordCount,
  };
}
