const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-teacher`;
const HEADERS = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export type LearningMode = 'child' | 'student' | 'professional';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AskParams {
  documentText: string;
  documentTitle: string;
  question: string;
  mode: LearningMode;
  history: ChatMessage[];
}

// ─── Duplicate request prevention ─────────────────────────────────────────────
let inflight: Promise<string> | null = null;

export async function askTeacher(params: AskParams): Promise<string> {
  // If a request is already in flight, wait for it to finish before sending a new one
  if (inflight) {
    await inflight.catch(() => {});
  }

  const promise = (async () => {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(params),
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
    if (!data?.answer) {
      throw new Error('AI returned an unexpected response.');
    }
    return data.answer as string;
  })();

  inflight = promise;
  try {
    return await promise;
  } finally {
    inflight = null;
  }
}
