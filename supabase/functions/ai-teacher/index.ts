import {
  corsHeaders,
  resolveApiKey,
  resolveModel,
  callGemini,
  GeminiError,
  type GeminiMessage,
} from '../_shared/gemini.ts';

const MAX_DOC_CHARS = 40000;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type TeacherMode = 'eli6' | 'eli12' | 'highschool' | 'university' | 'professional' | 'teacher';

interface TeacherRequest {
  documentText: string;
  documentTitle: string;
  question: string;
  mode: TeacherMode;
  history: ChatMessage[];
}

const MODE_CONFIG: Record<TeacherMode, { name: string; instruction: string }> = {
  eli6: {
    name: 'Explain Like I\'m 6',
    instruction: 'You are a friendly, patient teacher explaining things to a 6-year-old child. Use very simple words, short sentences, fun analogies, and playful language. Be warm and encouraging. Avoid jargon entirely.',
  },
  eli12: {
    name: 'Explain Like I\'m 12',
    instruction: 'You are a friendly teacher explaining things to a 12-year-old. Use simple but not childish language. Provide clear examples and relatable analogies. Keep explanations straightforward.',
  },
  highschool: {
    name: 'High School',
    instruction: 'You are a helpful high school teacher. Explain concepts clearly using language appropriate for teenagers. Provide examples and context. Help the student understand the material for their level.',
  },
  university: {
    name: 'University',
    instruction: 'You are a university professor. Provide thorough, precise, and detailed explanations. Use academic terminology appropriately. Include nuances and deeper analysis.',
  },
  professional: {
    name: 'Professional',
    instruction: 'You are an expert academic tutor for professionals. Provide concise, precise, and technically accurate explanations. Use professional terminology and cite specific parts of the document.',
  },
  teacher: {
    name: 'Teacher Mode',
    instruction: 'You are a teaching assistant helping another teacher. Provide comprehensive explanations, suggest teaching strategies, highlight common student misconceptions, and suggest discussion questions or activities related to the topic.',
  },
};

function buildSystemPrompt(mode: TeacherMode, docTitle: string): string {
  const config = MODE_CONFIG[mode] || MODE_CONFIG.university;

  return `${config.instruction}

You are helping someone learn from a document titled "${docTitle}".

CRITICAL RULES:
1. Answer questions based ONLY on the information in the provided document text.
2. NEVER hallucinate or make up information not in the document.
3. If the answer is not in the document, say so honestly: "This information is not covered in the document."
4. When answering, ALWAYS cite which chapter or section the answer comes from. Format citations as: [Source: Chapter/Section Name]
5. If multiple sections are relevant, cite all of them.
6. You may:
   - Break down complex ideas into simpler parts
   - Provide analogies and examples related to the document content
   - Summarize key points
   - Suggest follow-up questions
7. Keep responses concise but complete.
8. Write in the same language as the document.`;
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

    console.log(`[ai-teacher] Using model: ${model}`);

    if (!apiKey) {
      return respond(
        { error: 'Gemini API key is not configured. Go to Settings and add your API key.' },
        503,
      );
    }

    let body: TeacherRequest;
    try {
      body = await req.json();
    } catch {
      return respond({ error: 'Invalid request body — expected JSON.' }, 400);
    }

    if (!body.question || !body.documentText) {
      return respond({ error: 'Missing question or document text.' }, 400);
    }

    const mode = body.mode || 'university';
    console.log(`[ai-teacher] Question: "${body.question.slice(0, 100)}", mode: ${mode} (${MODE_CONFIG[mode]?.name}), doc: ${body.documentText.length} chars, history: ${body.history.length} msgs`);

    const docText = body.documentText.length > MAX_DOC_CHARS
      ? body.documentText.slice(0, MAX_DOC_CHARS) + '\n\n[Document truncated]'
      : body.documentText;

    const systemPrompt = buildSystemPrompt(mode, body.documentTitle);

    const messages: GeminiMessage[] = [
      { role: 'user', parts: [{ text: `Document content:\n\n${docText}` }] },
      { role: 'model', parts: [{ text: 'I have read the document carefully. Ask me any question about it and I will answer based only on what the document says, citing the relevant chapter or section.' }] },
      ...body.history.slice(-6).map((m): GeminiMessage => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: body.question }] },
    ];

    let answer: string;
    try {
      answer = await callGemini({
        apiKey,
        model,
        systemPrompt,
        messages,
        temperature: 0.5,
        maxTokens: 1500,
      });
    } catch (err) {
      if (err instanceof GeminiError) {
        console.error(`[ai-teacher] Gemini error ${err.status}:`, err.rawBody.slice(0, 1000));
        return respond({ error: err.message }, 502);
      }
      if (err instanceof Error) {
        return respond({ error: err.message }, 502);
      }
      return respond({ error: 'An unexpected error occurred.' }, 502);
    }

    console.log(`[ai-teacher] Done. Answer: ${answer.length} chars`);
    return respond({ answer });
  } catch (err) {
    console.error('[ai-teacher] Unexpected error:', err);
    return respond(
      { error: `An unexpected error occurred: ${err instanceof Error ? err.message : String(err)}` },
      500,
    );
  }
});
