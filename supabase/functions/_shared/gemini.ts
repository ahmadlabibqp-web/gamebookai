// ─── Shared Google Gemini API service ─────────────────────────────────────────
// All edge functions import from this module so retry logic, error handling,
// streaming, and response parsing live in one place.

import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

export const DEFAULT_MODEL = 'gemini-flash-latest';
export const VAULT_SECRET_NAME = 'GEMINI_API_KEY';
export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;
const REQUEST_TIMEOUT_MS = 60_000;

export const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiCallOptions {
  apiKey: string;
  model: string;
  systemPrompt?: string;
  userPrompt?: string;
  messages?: GeminiMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export class GeminiError extends Error {
  status: number;
  rawBody: string;
  constructor(status: number, rawBody: string, message: string) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
    this.rawBody = rawBody;
  }
}

// ─── Credential helpers ───────────────────────────────────────────────────────

export async function getKeyFromVault(): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .rpc('vault.decrypted_secrets')
      .eq('name', VAULT_SECRET_NAME)
      .maybeSingle();
    if (error || !data) return null;
    return (data as any).decrypted_secret ?? null;
  } catch {
    return null;
  }
}

export async function getModelFromSettings(): Promise<string> {
  try {
    const { data } = await supabase
      .from('ai_settings')
      .select('model')
      .eq('id', 1)
      .maybeSingle();
    return (data?.model as string) || DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

export async function resolveApiKey(): Promise<string> {
  return Deno.env.get('GEMINI_API_KEY') || (await getKeyFromVault()) || '';
}

export async function resolveModel(): Promise<string> {
  // DB setting takes priority (user's choice in Settings), then env var, then default.
  const dbModel = await getModelFromSettings();
  if (dbModel) return dbModel;
  return Deno.env.get('GEMINI_MODEL') || DEFAULT_MODEL;
}

// ─── Endpoint builder ─────────────────────────────────────────────────────────

function geminiEndpoint(model: string, apiKey: string, stream = false): string {
  const action = stream ? 'streamGenerateContent' : 'generateContent';
  return `${GEMINI_BASE_URL}/${model}:${action}?key=${apiKey}`;
}

// ─── Error message mapping ────────────────────────────────────────────────────

export function geminiStatusMessage(status: number, body: string): string {
  switch (status) {
    case 400: {
      try {
        const parsed = JSON.parse(body);
        const msg = parsed?.error?.message || parsed?.message || '';
        if (msg.toLowerCase().includes('model')) {
          return `Invalid model name. Check your Settings page and use a valid Gemini model (e.g. "gemini-2.5-flash").`;
        }
        if (msg) return `Gemini rejected the request: ${msg}`;
      } catch { /* not JSON */ }
      return 'Gemini returned 400 Bad Request. The model name may be invalid or the request malformed.';
    }
    case 401:
    case 403:
      return 'Gemini API key is invalid or access denied. Go to Settings and re-enter a valid key.';
    case 404:
      return 'Model not found on Gemini. Check your model name in Settings (e.g. "gemini-2.5-flash").';
    case 429:
      return 'Gemini rate limit reached. Please wait a moment and try again.';
    case 500:
    case 502:
    case 503:
      return 'Gemini is experiencing issues. Please try again in a few minutes.';
    default:
      return `Gemini returned an unexpected error (HTTP ${status}).`;
  }
}

// ─── JSON extraction ──────────────────────────────────────────────────────────

export function extractJSON(content: string): any {
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  }
  return JSON.parse(cleaned);
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Core Gemini call (with retry + exponential backoff) ──────────────────────

export async function callGemini(opts: GeminiCallOptions): Promise<string> {
  const {
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    messages,
    temperature = 0.7,
    maxTokens = 4000,
    stream = false,
  } = opts;

  const contents: GeminiMessage[] = messages ?? [
    { role: 'user', parts: [{ text: userPrompt ?? '' }] },
  ];

  const payload: any = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  if (systemPrompt) {
    payload.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`[Gemini] Attempt ${attempt}/${MAX_RETRIES} — model: ${model}, contents: ${contents.length}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(geminiEndpoint(model, apiKey, stream), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
        lastError = new Error('Gemini request timed out after 60 seconds.');
      } else {
        lastError = new Error(`Network error reaching Gemini: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`);
      }
      // Network errors are retryable
      if (attempt < MAX_RETRIES) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        console.warn(`[Gemini] Network error, retrying in ${backoff}ms...`);
        await sleep(backoff);
        continue;
      }
      throw lastError;
    }
    clearTimeout(timeoutId);

    const responseBody = await response.text();
    console.log(`[Gemini] Status: ${response.status}, body length: ${responseBody.length}`);

    if (!response.ok) {
      const msg = geminiStatusMessage(response.status, responseBody);
      console.error(`[Gemini] Error ${response.status}: ${responseBody.slice(0, 1000)}`);

      if (isRetryable(response.status) && attempt < MAX_RETRIES) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        console.warn(`[Gemini] Retryable error, retrying in ${backoff}ms...`);
        await sleep(backoff);
        lastError = new GeminiError(response.status, responseBody, msg);
        continue;
      }

      throw new GeminiError(response.status, responseBody, msg);
    }

    // Success — parse response
    let parsed: any;
    try {
      parsed = JSON.parse(responseBody);
    } catch {
      console.error('[Gemini] Could not parse response as JSON:', responseBody.slice(0, 500));
      throw new Error('Gemini returned a non-JSON response. Please try again.');
    }

    // Check for content blocking
    if (parsed?.promptFeedback?.blockReason) {
      const reason = parsed.promptFeedback.blockReason;
      console.error(`[Gemini] Content blocked: ${reason}`);
      throw new Error(`Gemini blocked the request (${reason}). The document content may have triggered a safety filter.`);
    }

    // Extract text from candidates
    const parts = parsed?.candidates?.[0]?.content?.parts;
    if (!parts || !Array.isArray(parts)) {
      console.error('[Gemini] Empty content:', JSON.stringify(parsed).slice(0, 500));
      throw new Error('Gemini returned an empty response. Please try again.');
    }

    const content = parts.map((p: any) => p.text || '').join('');
    if (!content) {
      console.error('[Gemini] No text in parts:', JSON.stringify(parsed).slice(0, 500));
      throw new Error('Gemini returned no text content. Please try again.');
    }

    console.log(`[Gemini] Received content: ${content.length} chars`);
    return content;
  }

  throw lastError ?? new Error('Gemini request failed after all retries.');
}

// ─── Streaming call (returns text as it arrives) ──────────────────────────────

export async function* callGeminiStream(opts: GeminiCallOptions): AsyncGenerator<string> {
  const {
    apiKey,
    model,
    systemPrompt,
    userPrompt,
    messages,
    temperature = 0.7,
    maxTokens = 4000,
  } = opts;

  const contents: GeminiMessage[] = messages ?? [
    { role: 'user', parts: [{ text: userPrompt ?? '' }] },
  ];

  const payload: any = {
    contents,
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  };

  if (systemPrompt) {
    payload.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(geminiEndpoint(model, apiKey, true), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
      throw new Error('Gemini streaming request timed out after 60 seconds.');
    }
    throw new Error(`Network error reaching Gemini: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`);
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    const body = await response.text();
    throw new GeminiError(response.status, body, geminiStatusMessage(response.status, body));
  }

  // Gemini streaming returns SSE format — parse chunks as they arrive
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body for streaming.');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Gemini stream returns array of JSON objects, one per chunk
    // Split on "}\n{" or complete JSON objects
    let idx;
    while ((idx = buffer.indexOf('}\n')) !== -1 || buffer.trim().endsWith('}')) {
      const endIdx = idx !== -1 ? idx + 1 : buffer.length;
      const chunkStr = buffer.slice(0, endIdx).trim();
      buffer = idx !== -1 ? buffer.slice(endIdx + 1) : '';

      if (!chunkStr) continue;

      try {
        const chunk = JSON.parse(chunkStr);
        const parts = chunk?.candidates?.[0]?.content?.parts;
        if (parts && Array.isArray(parts)) {
          for (const p of parts) {
            if (p.text) yield p.text;
          }
        }
      } catch {
        // Partial JSON — wait for more data
        if (idx === -1) break;
      }
    }
  }
}

// ─── JSON parsing with retry ──────────────────────────────────────────────────

export async function parseJSONWithRetry(
  content: string,
  opts: GeminiCallOptions,
): Promise<any> {
  try {
    return extractJSON(content);
  } catch {
    console.warn('[JSON] First parse failed, retrying with strict prompt');
    const retryContent = await callGemini({
      ...opts,
      systemPrompt: 'You are a JSON fixer. Return ONLY valid JSON. No markdown, no backticks, no explanation.',
      userPrompt: `Fix this text and return only valid JSON:\n\n${content.slice(0, 8000)}`,
      maxTokens: (opts.maxTokens ?? 4000) + 500,
    });
    try {
      return extractJSON(retryContent);
    } catch {
      throw new Error('AI returned invalid JSON after two attempts. Please try again.');
    }
  }
}

// ─── Text cleaning for PDFs ────────────────────────────────────────────────────

export function cleanPdfText(raw: string): string {
  const lines = raw.split('\n');

  const filtered = lines.filter((line) => {
    const t = line.trim();
    if (!t) return true;

    // Remove standalone page numbers (1-4 digits)
    if (/^\s*\d{1,4}\s*$/.test(t)) return false;

    // Remove common header/footer patterns
    if (/^\s*page\s+\d+\s*$/i.test(t)) return false;
    if (/^\s*\d+\s*of\s*\d+\s*$/i.test(t)) return false;

    // Remove lines that are just repeated dashes/underscores (decorative separators)
    if (/^[-_=\s]{3,}$/.test(t)) return false;

    // Remove lines that look like running headers (short, all caps, repeated)
    // Keep if it has more than 3 words or mixed case
    if (t.length < 40 && t === t.toUpperCase() && /^[A-Z\s]+$/.test(t) && t.split(/\s+/).length <= 3) {
      return false;
    }

    return true;
  });

  return filtered
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{4,}/g, '  ')
    .trim();
}

// ─── Chunking for large documents ────────────────────────────────────────────

export function splitIntoChunks(text: string, chunkSize: number): string[] {
  if (text.length <= chunkSize) return [text];

  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = start + chunkSize;
    if (end < text.length) {
      // Try to break at a word boundary
      const snap = text.lastIndexOf(' ', end);
      if (snap > start + chunkSize * 0.8) end = snap;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}
