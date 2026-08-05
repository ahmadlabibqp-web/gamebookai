import {
  corsHeaders,
  DEFAULT_MODEL,
  resolveApiKey,
  resolveModel,
  callGemini,
  parseJSONWithRetry,
  extractJSON,
  cleanPdfText,
  splitIntoChunks,
  GeminiError,
} from '../_shared/gemini.ts';

const CHUNK_SIZE_CHARS = 55000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyzeRequest {
  text: string;
  fileName: string;
  pageCount: number;
  wordCount: number;
}

interface RawAIResponse {
  title?: string;
  summary?: string;
  chapters?: { heading: string; level: number; page: number; text: string }[];
  concepts?: { term: string; definition: string; occurrences: number }[];
  keywords?: string[];
  learning_objectives?: string[];
  important_terms?: { term: string; definition: string }[];
  glossary?: { term: string; definition: string }[];
  difficulty?: string;
  estimated_age?: string;
  language?: string;
}

// ─── Language detection ───────────────────────────────────────────────────────

const KNOWN_LANGUAGES = new Set([
  'Arabic', 'Indonesian', 'English', 'French', 'Spanish', 'German', 'Italian',
  'Portuguese', 'Dutch', 'Russian', 'Chinese', 'Japanese', 'Korean', 'Hindi',
  'Bengali', 'Urdu', 'Persian', 'Turkish', 'Hebrew', 'Polish', 'Ukrainian',
  'Thai', 'Vietnamese', 'Malay', 'Swahili', 'Tamil', 'Telugu', 'Marathi',
]);

function detectLanguageHeuristic(text: string): string {
  const sample = text.slice(0, 2000);
  if (/[\u0600-\u06FF\u0750-\u077F]/.test(sample)) return 'Arabic';
  if (/[\u0590-\u05FF]/.test(sample)) return 'Hebrew';
  if (/[\u0400-\u04FF]/.test(sample)) return 'Russian';
  if (/[\u4E00-\u9FFF]/.test(sample)) return 'Chinese';
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(sample)) return 'Japanese';
  if (/[\uAC00-\uD7AF]/.test(sample)) return 'Korean';
  if (/[\u0900-\u097F]/.test(sample)) return 'Hindi';
  if (/[\u0E00-\u0E7F]/.test(sample)) return 'Thai';
  return 'English';
}

function resolveLanguage(raw: string | undefined, text: string): string {
  if (raw && typeof raw === 'string' && raw.trim()) {
    const lang = raw.trim();
    if (KNOWN_LANGUAGES.has(lang)) return lang;
    const lower = lang.toLowerCase();
    const match = Array.from(KNOWN_LANGUAGES).find((l) => l.toLowerCase() === lower);
    if (match) return match;
  }
  return detectLanguageHeuristic(text);
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildSystemPrompt(isChunk = false): string {
  const chunkNote = isChunk
    ? '\nIMPORTANT: This is a PARTIAL section of a larger document. Extract as much detail as you can from this section only.'
    : '';

  return `You are an educational content expert and curriculum designer. You analyze educational documents and extract structured learning content from them.${chunkNote}

You will receive the extracted text from an educational PDF. Your job is to understand the document deeply and return ONLY valid JSON (no markdown, no code fences, no commentary) with the following structure:

{
  "title": "The document title (derive from content or filename)",
  "summary": "A 3-5 sentence summary of the document's main topic and purpose",
  "chapters": [{"heading": "Section/chapter heading", "level": 1, "page": 1, "text": "Brief description of this section's content"}],
  "concepts": [{"term": "Key concept name", "definition": "Clear definition as stated in the document", "occurrences": 1}],
  "keywords": ["important", "vocabulary", "terms", "from", "the", "document"],
  "learning_objectives": ["What the reader should learn from this document"],
  "important_terms": [{"term": "Term name", "definition": "Definition from the document"}],
  "glossary": [{"term": "Glossary term", "definition": "Glossary definition"}],
  "difficulty": "Beginner | Intermediate | Advanced",
  "estimated_age": "e.g. 8-12 years, 13-17 years, 18+ years",
  "language": "The primary language of the document (e.g. Arabic, Indonesian, English, French, Spanish)"
}

Rules:
- Base ALL content strictly on the provided document text. Do not invent information.
- Extract at least 5-15 concepts with real definitions from the text.
- Extract 10-30 keywords that appear in the document.
- Provide 3-8 learning objectives.
- Provide 5-15 important terms with definitions.
- Provide a glossary of 5-15 terms.
- Identify chapters/sections by detecting headings in the text.
- difficulty must be exactly one of: "Beginner", "Intermediate", "Advanced".
- language must be the full English name of the document's primary language (e.g. "Arabic", "Indonesian", "English"). Never return a language code like "en" or "ar".
- Write the summary, learning_objectives, and all definitions in the SAME language as the document.
- Return ONLY the JSON object. No markdown, no backticks, no explanation.`;
}

function buildUserPrompt(text: string, fileName: string): string {
  return `Analyze the following educational document and return structured JSON.\n\nFilename: ${fileName}\n\nDocument text:\n${text}`;
}

function buildMergeSystemPrompt(): string {
  return `You are an educational content expert. You have received JSON analysis results from multiple chunks of a single document.
Merge them into ONE unified JSON analysis by:
- Combining all concepts (deduplicate by term)
- Combining all keywords (deduplicate)
- Combining all chapters (maintain order, deduplicate)
- Combining all important_terms and glossary (deduplicate)
- Combining learning_objectives (deduplicate)
- Using the FIRST chunk's title, difficulty, estimated_age, and language
- Writing a unified summary that covers the whole document

Return ONLY a valid JSON object with the same structure. No markdown, no code fences.`;
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateAIResponse(raw: RawAIResponse): string[] {
  const errors: string[] = [];
  if (!raw.title || typeof raw.title !== 'string') errors.push('Missing title');
  if (!raw.summary || typeof raw.summary !== 'string') errors.push('Missing summary');
  if (!Array.isArray(raw.concepts) || raw.concepts.length === 0) errors.push('Missing concepts array');
  if (!Array.isArray(raw.keywords) || raw.keywords.length === 0) errors.push('Missing keywords array');
  if (!raw.difficulty || !['Beginner', 'Intermediate', 'Advanced'].includes(raw.difficulty))
    errors.push(`Invalid difficulty: "${raw.difficulty}"`);
  if (!raw.language || typeof raw.language !== 'string') errors.push('Missing language');
  return errors;
}

// ─── Chunked analysis ─────────────────────────────────────────────────────────

async function analyzeChunked(
  text: string,
  fileName: string,
  apiKey: string,
  model: string,
): Promise<RawAIResponse> {
  const chunks = splitIntoChunks(text, CHUNK_SIZE_CHARS);
  console.log(`[analyze-document] Split into ${chunks.length} chunk(s)`);

  if (chunks.length === 1) {
    const content = await callGemini({
      apiKey,
      model,
      systemPrompt: buildSystemPrompt(false),
      userPrompt: buildUserPrompt(chunks[0], fileName),
      temperature: 0.3,
      maxTokens: 4000,
    });
    return await parseJSONWithRetry(content, { apiKey, model, temperature: 0.3, maxTokens: 4000 });
  }

  const chunkResults: RawAIResponse[] = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`[analyze-document] Chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)`);
    const content = await callGemini({
      apiKey,
      model,
      systemPrompt: buildSystemPrompt(true),
      userPrompt: buildUserPrompt(chunks[i], `${fileName} (part ${i + 1}/${chunks.length})`),
      temperature: 0.3,
      maxTokens: 3000,
    });
    const parsed = await parseJSONWithRetry(content, { apiKey, model, temperature: 0.3, maxTokens: 3000 });
    chunkResults.push(parsed);
  }

  console.log('[analyze-document] Merging chunk results');
  const mergePrompt = `Here are JSON analysis results from ${chunks.length} chunks of the same document. Merge them:\n\n${
    chunkResults.map((r, i) => `--- Chunk ${i + 1} ---\n${JSON.stringify(r)}`).join('\n\n')
  }`;

  const mergedContent = await callGemini({
    apiKey,
    model,
    systemPrompt: buildMergeSystemPrompt(),
    userPrompt: mergePrompt,
    temperature: 0.3,
    maxTokens: 5000,
  });
  return await parseJSONWithRetry(mergedContent, { apiKey, model, temperature: 0.3, maxTokens: 5000 });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const respond = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const apiKey = await resolveApiKey();
    const model = await resolveModel();

    console.log(`[analyze-document] Using model: ${model}`);

    if (!apiKey) {
      return respond(
        { error: 'Gemini API key is not configured. Go to Settings and add your API key.' },
        503,
      );
    }

    let body: AnalyzeRequest;
    try {
      body = await req.json();
    } catch {
      return respond({ error: 'Invalid request body — expected JSON.' }, 400);
    }

    console.log(`[analyze-document] File: "${body.fileName}", pages: ${body.pageCount}, words: ${body.wordCount}, text: ${body.text?.length ?? 0} chars`);

    if (!body.text || typeof body.text !== 'string') {
      return respond({ error: 'No document text received. The PDF may be empty.' }, 400);
    }
    if (body.text.trim().length < 50) {
      return respond({ error: 'Extracted text is too short (< 50 characters). The PDF may be a scanned image without selectable text.' }, 400);
    }

    const cleanedText = cleanPdfText(body.text);
    console.log(`[analyze-document] Cleaned text: ${cleanedText.length} chars`);

    if (cleanedText.length < 50) {
      return respond({ error: 'No readable text could be extracted from this PDF. It may be a scanned image PDF.' }, 400);
    }

    let raw: RawAIResponse;
    try {
      raw = await analyzeChunked(cleanedText, body.fileName, apiKey, model);
    } catch (err) {
      if (err instanceof GeminiError) {
        console.error(`[analyze-document] Gemini error ${err.status}:`, err.rawBody.slice(0, 1000));
        return respond({ error: err.message }, 502);
      }
      throw err;
    }

    const validationErrors = validateAIResponse(raw);
    if (validationErrors.length > 0) {
      console.error('[analyze-document] Validation errors:', validationErrors);
      if (!raw.title) raw.title = body.fileName.replace(/\.pdf$/i, '');
      if (!raw.summary) raw.summary = 'Summary not available.';
      if (!Array.isArray(raw.concepts)) raw.concepts = [];
      if (!Array.isArray(raw.keywords)) raw.keywords = [];
      if (!raw.difficulty || !['Beginner', 'Intermediate', 'Advanced'].includes(raw.difficulty as string)) {
        raw.difficulty = 'Intermediate';
      }
      if (!raw.language) raw.language = detectLanguageHeuristic(cleanedText);
    }

    const sentences = (cleanedText.match(/[^.!?]+[.!?]+/g) || []).filter(
      (s) => s.trim().split(/\s+/).length >= 4,
    );

    const analysis = {
      title: raw.title!,
      summary: raw.summary!,
      chapters: (raw.chapters || []).map((c, i) => ({
        heading: c.heading || `Section ${i + 1}`,
        level: c.level || 1,
        page: c.page || 1,
        text: c.text || '',
      })),
      concepts: (raw.concepts || []).map((c) => ({
        term: c.term,
        definition: c.definition,
        occurrences: c.occurrences || 1,
      })),
      keywords: raw.keywords || [],
      learning_objectives: raw.learning_objectives || [],
      important_terms: raw.important_terms || [],
      glossary: raw.glossary || [],
      difficulty: raw.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
      estimatedAge: raw.estimated_age || 'Unknown',
      language: resolveLanguage(raw.language, cleanedText),
      stats: {
        pages: body.pageCount,
        words: body.wordCount,
        sentences: sentences.length,
        avgWordsPerSentence: sentences.length
          ? Math.round((body.wordCount / sentences.length) * 10) / 10
          : 0,
      },
    };

    console.log(`[analyze-document] Done. Title: "${analysis.title}", language: ${analysis.language}, concepts: ${analysis.concepts.length}`);

    return respond({ analysis });
  } catch (err) {
    console.error('[analyze-document] Unexpected error:', err);
    return respond(
      { error: `An unexpected error occurred: ${err instanceof Error ? err.message : String(err)}` },
      500,
    );
  }
});
