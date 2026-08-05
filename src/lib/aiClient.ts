import type { DocumentAnalysis } from '@/lib/types';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-document`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const EDGE_FUNCTION_TIMEOUT_MS = 90_000;
const CACHE_PREFIX = 'b2g_analysis_';

// ─── Duplicate request prevention ─────────────────────────────────────────────
let inFlight: AbortController | null = null;

interface AnalyzeParams {
  text: string;
  fileName: string;
  pageCount: number;
  wordCount: number;
}

interface AnalyzeResponse {
  analysis: DocumentAnalysis;
  fromCache: boolean;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

function hashKey(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getCache(text: string): DocumentAnalysis | null {
  try {
    const key = CACHE_PREFIX + hashKey(text);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { analysis: DocumentAnalysis; ts: number };
    if (Date.now() - entry.ts > 30 * 60 * 1000) {
      sessionStorage.removeItem(key);
      return null;
    }
    console.log('[AI] Returning cached analysis');
    return entry.analysis;
  } catch {
    return null;
  }
}

function setCache(text: string, analysis: DocumentAnalysis): void {
  try {
    const key = CACHE_PREFIX + hashKey(text);
    sessionStorage.setItem(key, JSON.stringify({ analysis, ts: Date.now() }));
  } catch {
    // sessionStorage may be full; ignore
  }
}

// ─── Edge function call with timeout ─────────────────────────────────────────

async function callEdgeFunction(
  params: AnalyzeParams,
  signal: AbortSignal,
): Promise<DocumentAnalysis> {
  console.log('[AI] Calling Edge Function analyze-document');
  const t0 = Date.now();

  let response: Response;
  try {
    response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      const elapsed = Math.round((Date.now() - t0) / 1000);
      throw new Error(
        `AI analysis timed out after ${elapsed}s. The document may be too large. Try a shorter PDF.`,
      );
    }
    throw new Error(
      `Network error: could not reach the AI service. Check your internet connection. (${(err as Error).message})`,
    );
  }

  console.log(`[AI] Edge Function responded — status: ${response.status}, ${Math.round((Date.now() - t0) / 1000)}s`);

  if (!response.ok) {
    let message = `AI service error (status ${response.status})`;
    try {
      const body = await response.json();
      if (body?.error) message = body.error;
    } catch { /* not JSON */ }
    throw new Error(message);
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error('AI returned a response that could not be parsed. Please try again.');
  }

  if (!data?.analysis) {
    console.error('[AI] Unexpected response shape:', JSON.stringify(data).slice(0, 300));
    throw new Error('AI returned an unexpected response shape — missing "analysis" field.');
  }

  console.log(`[AI] Analysis received — title: "${data.analysis.title}", language: ${data.analysis.language}`);
  return data.analysis as DocumentAnalysis;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function analyzeWithAI(params: AnalyzeParams): Promise<AnalyzeResponse> {
  // Return cached result immediately if available
  const cached = getCache(params.text);
  if (cached) {
    return { analysis: cached, fromCache: true };
  }

  // Prevent duplicate concurrent requests — abort any in-flight call
  if (inFlight) {
    inFlight.abort();
  }

  const controller = new AbortController();
  inFlight = controller;

  const timeoutId = setTimeout(() => {
    console.warn(`[AI] Aborting — edge function exceeded ${EDGE_FUNCTION_TIMEOUT_MS / 1000}s timeout`);
    controller.abort();
  }, EDGE_FUNCTION_TIMEOUT_MS);

  try {
    const analysis = await callEdgeFunction(params, controller.signal);
    clearTimeout(timeoutId);
    inFlight = null;
    setCache(params.text, analysis);
    return { analysis, fromCache: false };
  } catch (err) {
    clearTimeout(timeoutId);
    inFlight = null;
    if ((err as Error).name === 'AbortError') {
      throw new Error(
        `AI analysis timed out after ${EDGE_FUNCTION_TIMEOUT_MS / 1000}s. The document may be very large. Try a shorter PDF.`,
      );
    }
    throw err;
  }
}
