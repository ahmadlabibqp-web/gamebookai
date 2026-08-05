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

interface TeacherRequest {
  documentText: string;
  documentTitle: string;
  question: string;
  mode: 'child' | 'student' | 'professional';
  history: ChatMessage[];
}

function buildSystemPrompt(mode: string, docTitle: string): string {
  const modeInstruction = mode === 'child'
    ? 'You are a friendly, patient teacher explaining things to a young child. Use very simple words, short sentences, and fun analogies. Be warm and encouraging.'
    : mode === 'professional'
    ? 'You are an expert academic tutor. Provide thorough, precise, and detailed explanations. Use professional terminology and cite specific parts of the document.'
    : 'You are a helpful academic tutor. Explain concepts clearly and thoroughly using language appropriate for a student. Provide examples and analogies when helpful.';

  return `${modeInstruction}

You are helping someone learn from a document titled "${docTitle}".
Answer questions based ONLY on the information in the provided document text.
If the answer is not in the document, say so honestly — do not make up information.
When explaining, you may:
- Break down complex ideas into simpler parts
- Provide analogies and examples related to the document content
- Summarize key points
- Suggest follow-up questions

Keep responses concise but complete. Write in the same language as the document.`;
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

    console.log(`[ai-teacher] Question: "${body.question.slice(0, 100)}", mode: ${body.mode}, doc: ${body.documentText.length} chars, history: ${body.history.length} msgs`);

    const docText = body.documentText.length > MAX_DOC_CHARS
      ? body.documentText.slice(0, MAX_DOC_CHARS) + '\n\n[Document truncated]'
      : body.documentText;

    const systemPrompt = buildSystemPrompt(body.mode, body.documentTitle);

    const messages: GeminiMessage[] = [
      { role: 'user', parts: [{ text: `Document content:\n\n${docText}` }] },
      { role: 'model', parts: [{ text: 'I have read the document. Ask me any question about it.' }] },
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
