import type { DocumentAnalysis, GameType, GameContent } from '@/lib/types';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-content`;
const HEADERS = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export type LearningMode = 'child' | 'student' | 'professional';

interface GenerateParams {
  contentType: GameType;
  analysis: DocumentAnalysis;
  config: {
    questionCount?: number;
    difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
    learningMode?: LearningMode;
  };
}

// ─── Duplicate request prevention ─────────────────────────────────────────────
const inflight = new Map<string, Promise<GameContent>>();

function dedupeKey(params: GenerateParams): string {
  return `${params.contentType}:${params.analysis.title}:${params.config?.difficulty ?? ''}:${params.config?.questionCount ?? ''}:${params.config?.learningMode ?? ''}`;
}

export async function generateContentWithAI(params: GenerateParams): Promise<GameContent> {
  const key = dedupeKey(params);

  // If the same content is already being generated, return the in-flight promise
  const existing = inflight.get(key);
  if (existing) {
    console.log(`[content] Reusing in-flight request for ${params.contentType}`);
    return existing;
  }

  const promise = (async () => {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        contentType: params.contentType,
        analysis: {
          title: params.analysis.title,
          summary: params.analysis.summary,
          concepts: params.analysis.concepts,
          keywords: params.analysis.keywords,
          chapters: params.analysis.chapters,
          learning_objectives: params.analysis.learning_objectives,
          important_terms: params.analysis.important_terms,
          glossary: params.analysis.glossary,
          difficulty: params.analysis.difficulty,
          language: params.analysis.language,
        },
        config: params.config,
      }),
    });

    if (!response.ok) {
      let message = `AI service error (${response.status})`;
      try {
        const body = await response.json();
        if (body?.error) message = body.error;
      } catch { /* not JSON */ }
      throw new Error(message);
    }

    const data = await response.json();
    if (!data?.content) {
      throw new Error('AI returned an unexpected response.');
    }
    return data.content as GameContent;
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}
