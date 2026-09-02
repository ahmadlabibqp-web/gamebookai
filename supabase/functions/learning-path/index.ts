import {
  corsHeaders,
  resolveApiKey,
  resolveModel,
  callGemini,
  parseJSONWithRetry,
  GeminiError,
} from '../_shared/gemini.ts';

interface LearningPathRequest {
  analysis: {
    title: string;
    summary: string;
    concepts: { term: string; definition: string }[];
    chapters: { heading: string; text: string }[];
    learning_objectives?: string[];
    difficulty: string;
    estimated_study_time?: number;
    language: string;
  };
  type: 'daily' | 'weekly' | 'roadmap';
}

function buildSystemPrompt(type: string): string {
  const typeInstruction = type === 'daily'
    ? 'Create a single-day study plan that breaks the document into focused study sessions.'
    : type === 'weekly'
    ? 'Create a 7-day weekly study plan that progressively covers the entire document.'
    : 'Create a comprehensive learning roadmap that guides a learner from beginner to mastery of this document.';

  return `You are an expert curriculum designer and study planner. ${typeInstruction}

Analyze the provided document analysis and create a structured study plan.
Write ALL content in the same language as the document.

Return ONLY valid JSON (no markdown, no code fences) with this structure:

{
  "title": "Study plan title",
  "description": "Brief overview of the plan",
  "total_days": 7,
  "estimated_completion_date": "YYYY-MM-DD (estimated date from today)",
  "sessions": [
    {
      "day": 1,
      "title": "Session title",
      "duration_minutes": 30,
      "objectives": ["What to learn in this session"],
      "activities": ["Specific study activities"],
      "concepts": ["Key concepts to focus on"],
      "games": ["quiz", "flashcards", "matching"]
    }
  ],
  "milestones": [
    {"title": "Milestone name", "description": "What to achieve", "day": 3}
  ],
  "tips": ["Study tips specific to this document"]
}

Rules:
- For daily plans: 1-3 sessions covering key parts of the document.
- For weekly plans: 7 sessions, one per day, progressively covering the document.
- For roadmaps: 5-15 sessions covering beginner to advanced topics.
- Base ALL content strictly on the provided document analysis.
- Suggest specific game types (quiz, flashcards, matching, etc.) for each session.
- Include realistic time estimates.
- Set milestones at key learning points.`;
}

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

    console.log(`[learning-path] Using model: ${model}`);

    if (!apiKey) {
      return respond({ error: 'Gemini API key is not configured.' }, 503);
    }

    let body: LearningPathRequest;
    try {
      body = await req.json();
    } catch {
      return respond({ error: 'Invalid request body.' }, 400);
    }

    if (!body.analysis || !body.type) {
      return respond({ error: 'Missing analysis or type.' }, 400);
    }

    console.log(`[learning-path] Type: ${body.type}, doc: "${body.analysis.title}"`);

    const systemPrompt = buildSystemPrompt(body.type);
    const userPrompt = `Document: ${body.analysis.title}\nSummary: ${body.analysis.summary}\nDifficulty: ${body.analysis.difficulty}\n\nChapters:\n${body.analysis.chapters.map((c) => `- ${c.heading}: ${c.text}`).join('\n')}\n\nConcepts:\n${body.analysis.concepts.map((c) => `- ${c.term}: ${c.definition}`).join('\n')}\n\nLearning Objectives:\n${(body.analysis.learning_objectives || []).join('\n- ')}\n\nEstimated study time: ${body.analysis.estimated_study_time || 60} minutes\n\nCreate a ${body.type} study plan.`;

    let content: string;
    try {
      content = await callGemini({
        apiKey,
        model,
        systemPrompt,
        userPrompt,
        temperature: 0.5,
        maxTokens: 4000,
      });
    } catch (err) {
      if (err instanceof GeminiError) {
        return respond({ error: err.message }, 502);
      }
      throw err;
    }

    let parsed: any;
    try {
      parsed = await parseJSONWithRetry(content, { apiKey, model, systemPrompt, userPrompt, temperature: 0.5, maxTokens: 4000 });
    } catch (err) {
      return respond({ error: err instanceof Error ? err.message : 'AI returned invalid JSON.' }, 502);
    }

    console.log(`[learning-path] Done. ${parsed.sessions?.length || 0} sessions generated.`);
    return respond({ plan: parsed });
  } catch (err) {
    console.error('[learning-path] Error:', err);
    return respond({ error: err instanceof Error ? err.message : 'Unexpected error.' }, 500);
  }
});
