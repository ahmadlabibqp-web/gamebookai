import {
  corsHeaders,
  resolveApiKey,
  resolveModel,
  callGemini,
  parseJSONWithRetry,
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
  subtitle?: string;
  summary?: string;
  executive_summary?: string;
  beginner_summary?: string;
  student_summary?: string;
  teacher_summary?: string;
  chapters?: { heading: string; level: number; page: number; text: string }[];
  sections?: { heading: string; page: number; text: string }[];
  concepts?: { term: string; definition: string; occurrences: number; type?: string }[];
  keywords?: string[];
  learning_objectives?: string[];
  important_terms?: { term: string; definition: string }[];
  glossary?: { term: string; definition: string }[];
  important_people?: { name: string; role: string; description: string }[];
  places?: { name: string; description: string }[];
  dates?: { date: string; event: string }[];
  numbers?: { value: string; context: string }[];
  formulas?: { formula: string; description: string }[];
  cause_effect?: { cause: string; effect: string }[];
  examples?: string[];
  frequently_repeated?: string[];
  knowledge_graph?: { nodes: { id: string; label: string; type: string }[]; edges: { source: string; target: string; relationship: string }[] };
  difficulty?: string;
  estimated_age?: string;
  estimated_study_time?: number;
  concept_count?: number;
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

// ─── Enhanced System Prompt ───────────────────────────────────────────────────

function buildSystemPrompt(isChunk = false): string {
  const chunkNote = isChunk
    ? '\nIMPORTANT: This is a PARTIAL section of a larger document. Extract as much detail as you can from this section only.'
    : '';

  return `You are an expert educational content analyst and curriculum designer. You deeply understand educational documents and extract structured learning content.${chunkNote}

You will receive the extracted text from an educational document. Your job is to deeply understand the document and return ONLY valid JSON (no markdown, no code fences, no commentary) with this structure:

{
  "title": "Document title (derive from content or filename)",
  "subtitle": "Subtitle or secondary title if present, otherwise empty string",
  "summary": "A 3-5 sentence summary of the document's main topic and purpose",
  "executive_summary": "A concise 2-3 paragraph overview for someone who needs the key takeaways quickly",
  "beginner_summary": "A simplified explanation of the document for someone with no prior knowledge of the topic. Use plain language and analogies.",
  "student_summary": "A structured summary appropriate for a student studying this material. Include key points and study focus areas.",
  "teacher_summary": "A summary for teachers, highlighting teaching points, common misconceptions, and suggested discussion topics.",
  "chapters": [{"heading": "Chapter/section heading", "level": 1, "page": 1, "text": "Brief description of this section's content"}],
  "concepts": [{"term": "Key concept name", "definition": "Clear definition as stated in the document", "occurrences": 1, "type": "concept|definition|formula|person|place|date|term"}],
  "keywords": ["important", "vocabulary", "terms"],
  "learning_objectives": ["What the reader should learn"],
  "important_terms": [{"term": "Term name", "definition": "Definition"}],
  "glossary": [{"term": "Glossary term", "definition": "Glossary definition"}],
  "important_people": [{"name": "Person name", "role": "Their role or title", "description": "Brief description of their significance"}],
  "places": [{"name": "Place name", "description": "Significance in the document"}],
  "dates": [{"date": "Date or time period", "event": "What happened"}],
  "numbers": [{"value": "Significant number", "context": "Why this number matters"}],
  "formulas": [{"formula": "Formula or equation", "description": "What it means"}],
  "cause_effect": [{"cause": "Cause", "effect": "Effect"}],
  "examples": ["Example from the document"],
  "frequently_repeated": ["Concepts or terms that appear multiple times"],
  "knowledge_graph": {
    "nodes": [{"id": "concept_id", "label": "Concept name", "type": "concept|process|entity|event|property"}],
    "edges": [{"source": "concept_id", "target": "concept_id", "relationship": "leads_to|part_of|causes|requires|example_of|related_to"}]
  },
  "difficulty": "Beginner | Intermediate | Advanced",
  "estimated_age": "e.g. 8-12 years, 13-17 years, 18+ years",
  "estimated_study_time": "Estimated study time in minutes (integer)",
  "concept_count": "Number of distinct learning concepts (integer)",
  "language": "Primary language (full English name e.g. Arabic, English, French)"
}

Rules:
- Base ALL content strictly on the provided document text. Do not invent information.
- Extract at least 10-20 concepts with real definitions from the text.
- Extract 15-40 keywords that appear in the document.
- Provide 4-10 learning objectives.
- Provide 8-20 important terms with definitions.
- Provide a glossary of 5-15 terms.
- Identify chapters/sections by detecting headings in the text.
- Build a knowledge graph with 8-20 nodes and 10-30 edges connecting related concepts.
- difficulty must be exactly one of: "Beginner", "Intermediate", "Advanced".
- estimated_study_time should be a reasonable estimate in minutes for reading and understanding the document.
- concept_count should be the total number of distinct learning concepts identified.
- language must be the full English name of the document's primary language. Never return a language code.
- Write ALL summaries, objectives, and definitions in the SAME language as the document.
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
- Combining all important_terms, glossary, important_people, places, dates, numbers, formulas, cause_effect, examples, frequently_repeated (deduplicate)
- Combining learning_objectives (deduplicate)
- Merging knowledge_graph nodes and edges (deduplicate by id/label)
- Using the FIRST chunk's title, subtitle, difficulty, estimated_age, and language
- Writing unified summaries (executive, beginner, student, teacher) that cover the whole document
- Summing estimated_study_time across chunks
- Summing concept_count across chunks

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
      maxTokens: 8000,
    });
    return await parseJSONWithRetry(content, { apiKey, model, temperature: 0.3, maxTokens: 8000 });
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
      maxTokens: 6000,
    });
    const parsed = await parseJSONWithRetry(content, { apiKey, model, temperature: 0.3, maxTokens: 6000 });
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
    maxTokens: 8000,
  });
  return await parseJSONWithRetry(mergedContent, { apiKey, model, temperature: 0.3, maxTokens: 8000 });
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
      return respond({ error: 'No document text received. The document may be empty.' }, 400);
    }
    if (body.text.trim().length < 50) {
      return respond({ error: 'Extracted text is too short (< 50 characters). The document may be a scanned image without selectable text.' }, 400);
    }

    const cleanedText = cleanPdfText(body.text);
    console.log(`[analyze-document] Cleaned text: ${cleanedText.length} chars`);

    if (cleanedText.length < 50) {
      return respond({ error: 'No readable text could be extracted from this document. It may be a scanned image.' }, 400);
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
      if (!raw.title) raw.title = body.fileName.replace(/\.\w+$/, '');
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

    const studyTime = raw.estimated_study_time || Math.max(10, Math.round(body.wordCount / 200));
    const conceptCount = raw.concept_count || raw.concepts?.length || 0;

    const analysis = {
      title: raw.title!,
      subtitle: raw.subtitle || '',
      summary: raw.summary!,
      executive_summary: raw.executive_summary || raw.summary!,
      beginner_summary: raw.beginner_summary || '',
      student_summary: raw.student_summary || raw.summary!,
      teacher_summary: raw.teacher_summary || '',
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
        type: c.type || 'concept',
      })),
      keywords: raw.keywords || [],
      learning_objectives: raw.learning_objectives || [],
      important_terms: raw.important_terms || [],
      glossary: raw.glossary || [],
      important_people: raw.important_people || [],
      places: raw.places || [],
      dates: raw.dates || [],
      numbers: raw.numbers || [],
      formulas: raw.formulas || [],
      cause_effect: raw.cause_effect || [],
      examples: raw.examples || [],
      frequently_repeated: raw.frequently_repeated || [],
      knowledge_graph: raw.knowledge_graph || { nodes: [], edges: [] },
      difficulty: raw.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
      estimatedAge: raw.estimated_age || 'Unknown',
      estimated_study_time: studyTime,
      concept_count: conceptCount,
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

    console.log(`[analyze-document] Done. Title: "${analysis.title}", language: ${analysis.language}, concepts: ${analysis.concepts.length}, graph nodes: ${analysis.knowledge_graph.nodes.length}`);

    return respond({ analysis });
  } catch (err) {
    console.error('[analyze-document] Unexpected error:', err);
    return respond(
      { error: `An unexpected error occurred: ${err instanceof Error ? err.message : String(err)}` },
      500,
    );
  }
});
