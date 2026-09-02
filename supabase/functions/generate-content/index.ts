import {
  corsHeaders,
  resolveApiKey,
  resolveModel,
  callGemini,
  parseJSONWithRetry,
  GeminiError,
} from '../_shared/gemini.ts';

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentType =
  | 'quiz' | 'flashcards' | 'matching' | 'wordsearch' | 'unscramble'
  | 'hangman' | 'memory' | 'sequence' | 'crossword'
  | 'timeline' | 'sorting' | 'conceptmap';

interface GenerateRequest {
  contentType: ContentType;
  analysis: {
    title: string;
    summary: string;
    concepts: { term: string; definition: string }[];
    keywords: string[];
    chapters: { heading: string; text: string }[];
    learning_objectives?: string[];
    important_terms?: { term: string; definition: string }[];
    glossary?: { term: string; definition: string }[];
    important_people?: { name: string; role: string; description: string }[];
    places?: { name: string; description: string }[];
    dates?: { date: string; event: string }[];
    formulas?: { formula: string; description: string }[];
    cause_effect?: { cause: string; effect: string }[];
    examples?: string[];
    knowledge_graph?: { nodes: { id: string; label: string; type: string }[]; edges: { source: string; target: string; relationship: string }[] };
    difficulty: string;
    language: string;
  };
  config: {
    questionCount?: number;
    difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
    learningMode?: 'child' | 'student' | 'professional';
    bloomLevel?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  };
}

// ─── Bloom's Taxonomy ──────────────────────────────────────────────────────────

const BLOOM_LEVELS = {
  remember: {
    name: 'Remember',
    instruction: 'Focus on recall and recognition of facts, terms, and basic concepts.',
    questionStarters: ['What is', 'Define', 'List', 'Name', 'Identify', 'Who', 'When', 'Where'],
  },
  understand: {
    name: 'Understand',
    instruction: 'Focus on comprehension and explaining ideas or concepts.',
    questionStarters: ['Explain', 'Describe', 'Summarize', 'Why', 'How does', 'What is the difference between'],
  },
  apply: {
    name: 'Apply',
    instruction: 'Focus on using information in new situations to solve problems.',
    questionStarters: ['How would you use', 'Apply', 'Calculate', 'Demonstrate', 'Solve', 'Using the concept of'],
  },
  analyze: {
    name: 'Analyze',
    instruction: 'Focus on breaking information into parts and exploring relationships.',
    questionStarters: ['Compare and contrast', 'Analyze', 'What is the relationship between', 'Why does', 'What factors influence'],
  },
  evaluate: {
    name: 'Evaluate',
    instruction: 'Focus on justifying decisions or assessing the value of ideas.',
    questionStarters: ['Evaluate', 'Justify', 'Assess', 'Which is more effective and why', 'Critique', 'Do you agree that'],
  },
  create: {
    name: 'Create',
    instruction: 'Focus on producing new or original work, combining ideas.',
    questionStarters: ['Design', 'Create', 'Propose', 'Develop', 'Construct', 'Formulate'],
  },
} as const;

type BloomLevel = keyof typeof BLOOM_LEVELS;

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildSystemPrompt(contentType: ContentType, config: any): string {
  const language = config.language || "the document's language";
  const difficulty = config.difficulty || 'mixed';
  const mode = config.learningMode || 'student';
  const bloomLevel = config.bloomLevel as BloomLevel | undefined;

  const modeInstruction = mode === 'child'
    ? 'Use simple, child-friendly language. Make questions fun and easy to understand.'
    : mode === 'professional'
    ? 'Use precise, professional terminology. Questions should be thorough and detailed.'
    : 'Use clear, academic language appropriate for students.';

  let bloomInstruction = '';
  if (bloomLevel && BLOOM_LEVELS[bloomLevel]) {
    const bloom = BLOOM_LEVELS[bloomLevel];
    bloomInstruction = `\nBloom's Taxonomy Level: ${bloom.name}\n${bloom.instruction}\nUse question starters like: ${bloom.questionStarters.join(', ')}.\nTag each question with "bloom_level": "${bloomLevel}".`;
  } else {
    bloomInstruction = `\nGenerate questions across ALL six Bloom's Taxonomy levels (Remember, Understand, Apply, Analyze, Evaluate, Create). Tag each question with "bloom_level": "remember"|"understand"|"apply"|"analyze"|"evaluate"|"create". Distribute questions across all levels as evenly as possible.`;
  }

  const baseRule = `You are an expert educational content creator. Generate interactive learning content based on the provided document analysis.
Write ALL content in ${language}.
Difficulty level: ${difficulty}.
${modeInstruction}${bloomInstruction}
Return ONLY valid JSON (no markdown, no code fences, no commentary).`;

  switch (contentType) {
    case 'quiz':
      return `${baseRule}

Generate a quiz with exactly ${config.questionCount || 10} questions. Mix these question types:
- "multiple_choice": 4 options, one correct answer
- "multiple_answer": 4-6 options, 2+ correct answers (use "answers" array)
- "true_false": options ["True", "False"]
- "fill_blank": question with _____, answer is the missing word
- "short_answer": open question, answer is a brief explanation
- "long_answer": open question, answer is a detailed explanation, include "points" array of key points to look for

Return JSON: {"questions": [{"id": "q_1", "type": "multiple_choice|multiple_answer|true_false|fill_blank|short_answer|long_answer", "question": "...", "options": ["a","b","c","d"], "answer": "correct answer", "answers": ["a","b"], "explanation": "why", "concept": "related concept", "bloom_level": "remember|understand|apply|analyze|evaluate|create", "difficulty": "Beginner|Intermediate|Advanced", "points": ["key point 1", "key point 2"]}]}

For multiple_choice: provide exactly 4 options, use "answer" (single string).
For multiple_answer: provide 4-6 options, use "answers" (array of correct option strings).
For true_false: options are ["True","False"], use "answer".
For fill_blank and short_answer: omit "options", use "answer".
For long_answer: omit "options", use "answer" as model answer, include "points" array.
Base ALL questions strictly on the document content. Do not invent information.`;

    case 'flashcards':
      return `${baseRule}

Generate 20-30 flashcards from the document. Each card has a front (question/term) and back (answer/explanation).
Include vocabulary cards, concept cards, formula cards, and memory cards.
Each card should include a hint that helps recall the answer without giving it away.

Return JSON: {"cards": [{"id": "f_1", "question": "front of card", "answer": "back of card", "hint": "a helpful hint", "category": "Vocabulary|Concept|Formula|Memory", "difficulty": "Beginner|Intermediate|Advanced", "bloom_level": "remember|understand|apply|analyze|evaluate|create"}]}`;

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

    case 'timeline':
      return `${baseRule}

Generate 6-10 events from the document that can be placed on a timeline in chronological order. Use dates, time periods, or sequential steps.

Return JSON: {"events": [{"id": "t_1", "date": "date or time period", "event": "what happened", "description": "brief context", "order": 1}]}`;

    case 'sorting':
      return `${baseRule}

Generate a sorting game with 10-15 items that need to be categorized into 3-5 groups based on the document content.

Return JSON: {"categories": [{"id": "cat_1", "name": "Category name", "items": ["item1", "item2"]}], "items": [{"id": "sort_1", "label": "item to sort", "category": "cat_1"}]}`;

    case 'conceptmap':
      return `${baseRule}

Generate a concept map from the document. Include central concepts and their connections, showing how ideas relate.

Return JSON: {"nodes": [{"id": "node_1", "label": "Concept name", "type": "central|related|example"}], "edges": [{"source": "node_1", "target": "node_2", "label": "relationship description"}]}`;

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
  const people = (a.important_people || []).map((p) => `- ${p.name}: ${p.role} — ${p.description}`).join('\n');
  const dates = (a.dates || []).map((d) => `- ${d.date}: ${d.event}`).join('\n');
  const formulas = (a.formulas || []).map((f) => `- ${f.formula}: ${f.description}`).join('\n');
  const causeEffect = (a.cause_effect || []).map((c) => `- ${c.cause} → ${c.effect}`).join('\n');
  const graphNodes = a.knowledge_graph?.nodes?.map((n) => `- ${n.id}: ${n.label} (${n.type})`).join('\n') || '';
  const graphEdges = a.knowledge_graph?.edges?.map((e) => `- ${e.source} → ${e.target}: ${e.relationship}`).join('\n') || '';

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

Important People:
${people}

Dates:
${dates}

Formulas:
${formulas}

Cause-Effect Relationships:
${causeEffect}

Knowledge Graph Nodes:
${graphNodes}

Knowledge Graph Edges:
${graphEdges}

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

    console.log(`[generate-content] Type: ${body.contentType}, difficulty: ${body.config?.difficulty}, mode: ${body.config?.learningMode}, bloom: ${body.config?.bloomLevel}`);

    const systemPrompt = buildSystemPrompt(body.contentType, {
      ...body.config,
      language: body.analysis.language,
    });
    const userPrompt = buildUserPrompt(body);

    const questionCount = body.config?.questionCount || 10;
    const maxTokens =
      body.contentType === 'quiz' && questionCount > 20 ? 10000
      : body.contentType === 'quiz' && questionCount > 10 ? 8000
      : body.contentType === 'flashcards' ? 6000
      : body.contentType === 'conceptmap' || body.contentType === 'sorting' || body.contentType === 'timeline' ? 6000
      : 4000;

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
