import {
  corsHeaders,
  resolveApiKey,
  resolveModel,
  callGemini,
  parseJSONWithRetry,
  GeminiError,
} from '../_shared/gemini.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GenerateRequest {
  contentType: 'quiz' | 'flashcards' | 'matching' | 'wordsearch' | 'unscramble' | 'hangman' | 'memory' | 'sequence' | 'crossword';
  analysis: {
    title: string;
    summary: string;
    concepts: { term: string; definition: string }[];
    keywords: string[];
    chapters: { heading: string; text: string }[];
    learning_objectives?: string[];
    important_terms?: { term: string; definition: string }[];
    glossary?: { term: string; definition: string }[];
    difficulty: string;
    language: string;
  };
  config: {
    questionCount?: number;
    difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
    learningMode?: 'child' | 'student' | 'professional';
  };
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildSystemPrompt(contentType: string, config: any): string {
  const language = config.language || "the document's language";
  const difficulty = config.difficulty || 'mixed';
  const mode = config.learningMode || 'student';

  const modeInstruction = mode === 'child'
    ? 'Use simple, child-friendly language. Make questions fun and easy to understand.'
    : mode === 'professional'
    ? 'Use precise, professional terminology. Questions should be thorough and detailed.'
    : 'Use clear, academic language appropriate for students.';

  const baseRule = `You are an expert educational content creator. Generate interactive learning content based on the provided document analysis.
Write ALL content in ${language}.
Difficulty level: ${difficulty}.
${modeInstruction}
Return ONLY valid JSON (no markdown, no code fences, no commentary).`;

  switch (contentType) {
    case 'quiz':
      return `${baseRule}

Generate a quiz with exactly ${config.questionCount || 10} questions. Mix these question types:
- "multiple_choice": 4 options, one correct answer
- "true_false": options ["True", "False"]
- "fill_blank": question with _____, answer is the missing word
- "short_answer": open question, answer is a brief explanation

Return JSON: {"questions": [{"id": "q_1", "type": "multiple_choice|true_false|fill_blank|short_answer", "question": "...", "options": ["a","b","c","d"], "answer": "correct answer", "explanation": "why", "concept": "related concept", "difficulty": "Beginner|Intermediate|Advanced"}]}

For multiple_choice, provide exactly 4 options. For true_false, options are ["True","False"]. For fill_blank and short_answer, omit "options".
Base ALL questions strictly on the document content. Do not invent information.`;

    case 'flashcards':
      return `${baseRule}

Generate 20-30 flashcards from the document. Each card has a front (question/term) and back (answer/explanation).
Include vocabulary cards, concept cards, formula cards, and memory cards.

Return JSON: {"cards": [{"id": "f_1", "question": "front of card", "answer": "back of card", "category": "Vocabulary|Concept|Formula|Memory", "difficulty": "Beginner|Intermediate|Advanced"}]}`;

    case 'matching':
      return `${baseRule}

Generate 8-10 matching pairs from the document. Each pair links a term to its definition/explanation.

Return JSON: {"pairs": [{"id": "m_1", "concept": "term", "definition": "matching description"}]}`;

    case 'wordsearch':
      return `${baseRule}

Select 8-10 important keywords from the document for a word search puzzle. Words must be 3-12 letters, alphabetic only.

Return JSON: {"words": [{"word": "WORD", "clue": "hint about this word"}]}`;

    case 'unscramble':
      return `${baseRule}

Select 10-12 important terms from the document for a word unscramble game. Words must be 4-15 letters, alphabetic only.

Return JSON: {"items": [{"id": "u_1", "scrambled": "SCRAMBLED", "answer": "ORIGINAL", "clue": "hint"}]}`;

    case 'hangman':
      return `${baseRule}

Select 10-15 important terms from the document for a hangman game. Words must be 4-14 letters, alphabetic only.

Return JSON: {"words": [{"word": "WORD", "hint": "hint about this word"}]}`;

    case 'memory':
      return `${baseRule}

Generate 6-8 memory card pairs from the document. Each pair links a term to its definition.

Return JSON: {"pairs": [{"id": "mem_1", "concept": "term", "definition": "definition"}]}`;

    case 'sequence':
      return `${baseRule}

Generate 5-8 items that should be arranged in logical order (chronological, procedural, or hierarchical) based on the document.

Return JSON: {"items": [{"id": "s_1", "step": "description", "order": 1}]}`;

    case 'crossword':
      return `${baseRule}

Select 8-10 terms from the document for a crossword puzzle. Terms must be single words, 3-12 letters, alphabetic only. Provide clear clues.

Return JSON: {"terms": [{"word": "WORD", "clue": "crossword clue"}]}`;

    default:
      return baseRule;
  }
}

function buildUserPrompt(req: GenerateRequest): string {
  const a = req.analysis;
  const concepts = a.concepts.map((c) => `- ${c.term}: ${c.definition}`).join('\n');
  const terms = (a.important_terms || []).map((t) => `- ${t.term}: ${t.definition}`).join('\n');
  const chapters = a.chapters.map((c) => `- ${c.heading}: ${c.text}`).join('\n');
  const keywords = a.keywords.join(', ');
  const objectives = (a.learning_objectives || []).join('\n- ');

  return `Document: ${a.title}
Summary: ${a.summary}
Difficulty: ${a.difficulty}
Language: ${a.language}

Chapters:
${chapters}

Key Concepts:
${concepts}

Important Terms:
${terms}

Keywords: ${keywords}

Learning Objectives:
- ${objectives}

Generate ${req.contentType} content based on this document analysis.`;
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

    console.log(`[generate-content] Using model: ${model}`);

    if (!apiKey) {
      return respond(
        { error: 'Gemini API key is not configured. Go to Settings and add your API key.' },
        503,
      );
    }

    let body: GenerateRequest;
    try {
      body = await req.json();
    } catch {
      return respond({ error: 'Invalid request body — expected JSON.' }, 400);
    }

    if (!body.contentType || !body.analysis) {
      return respond({ error: 'Missing contentType or analysis in request.' }, 400);
    }

    console.log(`[generate-content] Type: ${body.contentType}, difficulty: ${body.config?.difficulty}, mode: ${body.config?.learningMode}`);

    const systemPrompt = buildSystemPrompt(body.contentType, {
      ...body.config,
      language: body.analysis.language,
    });
    const userPrompt = buildUserPrompt(body);

    const maxTokens = body.contentType === 'quiz' && (body.config.questionCount || 10) > 20 ? 8000 : 4000;

    let content: string;
    try {
      content = await callGemini({
        apiKey,
        model,
        systemPrompt,
        userPrompt,
        temperature: 0.7,
        maxTokens,
      });
    } catch (err) {
      if (err instanceof GeminiError) {
        console.error(`[generate-content] Gemini error ${err.status}:`, err.rawBody.slice(0, 1000));
        return respond({ error: err.message }, 502);
      }
      throw err;
    }

    let parsed: any;
    try {
      parsed = await parseJSONWithRetry(content, { apiKey, model, systemPrompt, userPrompt, temperature: 0.7, maxTokens });
    } catch (err) {
      console.error('[generate-content] JSON parse error:', err);
      return respond({ error: err instanceof Error ? err.message : 'AI returned invalid JSON.' }, 502);
    }

    console.log(`[generate-content] Done. Content generated successfully.`);
    return respond({ content: parsed });
  } catch (err) {
    console.error('[generate-content] Unexpected error:', err);
    return respond(
      { error: `An unexpected error occurred: ${err instanceof Error ? err.message : String(err)}` },
      500,
    );
  }
});
