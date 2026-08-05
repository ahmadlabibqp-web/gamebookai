// ─── AI Provider Abstraction Layer ──────────────────────────────────────────
// Allows swapping between Google Gemini, OpenAI, Anthropic Claude, OpenRouter,
// DeepSeek, Qwen, and future providers without changing application code.

export type ProviderName = 'gemini' | 'openai' | 'anthropic' | 'openrouter' | 'deepseek' | 'qwen';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIProvider {
  name: ProviderName;
  call(opts: {
    systemPrompt?: string;
    userPrompt?: string;
    messages?: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<string>;
}

export interface ProviderConfig {
  apiKey: string;
  model: string;
}

// ─── Gemini Provider ─────────────────────────────────────────────────────────

import { callGemini as geminiCall, GeminiMessage } from './gemini.ts';

class GeminiProvider implements AIProvider {
  name: ProviderName = 'gemini';
  private apiKey: string;
  private model: string;

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async call(opts: {
    systemPrompt?: string;
    userPrompt?: string;
    messages?: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const contents: GeminiMessage[] = opts.messages
      ? opts.messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
            parts: [{ text: m.content }],
          }))
      : [{ role: 'user', parts: [{ text: opts.userPrompt ?? '' }] }];

    return geminiCall({
      apiKey: this.apiKey,
      model: this.model,
      systemPrompt: opts.systemPrompt,
      messages: contents,
      temperature: opts.temperature ?? 0.7,
      maxTokens: opts.maxTokens ?? 4000,
    });
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createProvider(
  name: ProviderName,
  config: ProviderConfig,
): AIProvider {
  switch (name) {
    case 'gemini':
      return new GeminiProvider(config);
    default:
      // Future providers can be added here
      return new GeminiProvider(config);
  }
}

export function resolveProviderName(): ProviderName {
  const envProvider = Deno.env.get('AI_PROVIDER') as ProviderName | undefined;
  if (envProvider && ['gemini', 'openai', 'anthropic', 'openrouter', 'deepseek', 'qwen'].includes(envProvider)) {
    return envProvider;
  }
  return 'gemini';
}
