import type { DocumentAnalysis, LearningPath } from '@/lib/types';
import { saveLearningPath, getLearningPaths } from '@/lib/db';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/learning-path`;
const HEADERS = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export async function generateLearningPath(
  analysis: DocumentAnalysis,
  type: 'daily' | 'weekly' | 'roadmap',
  documentId: string,
): Promise<LearningPath | null> {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ analysis, type }),
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
  if (!data?.plan) throw new Error('AI returned an unexpected response.');

  const plan = data.plan;
  return saveLearningPath(
    documentId,
    type,
    plan.title || `${type} study plan`,
    plan.description || '',
    plan,
    plan.estimated_completion_date,
  );
}

export { getLearningPaths };
