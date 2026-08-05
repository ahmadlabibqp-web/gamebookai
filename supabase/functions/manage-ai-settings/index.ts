import {
  corsHeaders,
  DEFAULT_MODEL,
  GEMINI_BASE_URL,
  VAULT_SECRET_NAME,
  supabase,
  getKeyFromVault,
  resolveApiKey,
  resolveModel,
  callGemini,
  GeminiError,
} from '../_shared/gemini.ts';

const SETTINGS_TABLE = 'ai_settings';

interface SaveRequest {
  action: 'save';
  apiKey: string;
  model?: string;
}

interface TestRequest {
  action: 'testConnection';
}

interface GetStatusRequest {
  action: 'getStatus';
}

type RequestBody = SaveRequest | TestRequest | GetStatusRequest;

interface TestResult {
  success: boolean;
  message: string;
}

async function testGeminiKey(apiKey: string, model: string): Promise<TestResult> {
  try {
    const content = await callGemini({
      apiKey,
      model,
      userPrompt: 'Reply with: OK',
      temperature: 0,
      maxTokens: 5,
    });

    if (!content) {
      return { success: false, message: 'Gemini returned an unexpected response.' };
    }
    return { success: true, message: 'Connection successful' };
  } catch (err) {
    if (err instanceof GeminiError) {
      console.error(`[testConnection] Gemini error ${err.status}:`, err.rawBody.slice(0, 500));
      const body = err.rawBody;
      let apiMsg = '';
      try {
        const parsed = JSON.parse(body);
        apiMsg = parsed?.error?.message || parsed?.message || '';
      } catch { /* not JSON */ }

      if (err.status === 404) {
        return { success: false, message: `Model "${model}" is not available. The default model has been updated to "gemini-flash-latest". Please try again.` };
      }
      if (err.status === 401 || err.status === 403) {
        return { success: false, message: 'Invalid API key. Please check your GEMINI_API_KEY.' };
      }
      if (err.status === 429) {
        return { success: false, message: 'Gemini API quota exceeded. Your free tier rate limit has been reached. Please try again later or upgrade your Google AI plan.' };
      }
      return { success: false, message: apiMsg || `HTTP ${err.status}: ${body.slice(0, 200)}` };
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('timed out')) {
      return { success: false, message: 'Connection timed out. Please try again.' };
    }
    if (msg.includes('Network error')) {
      return { success: false, message: 'Network error. Could not reach Gemini.' };
    }
    return { success: false, message: msg };
  }
}

async function saveKeyToVault(apiKey: string): Promise<boolean> {
  try {
    const { data: existing } = await supabase
      .rpc('vault.decrypted_secrets')
      .eq('name', VAULT_SECRET_NAME)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.rpc('vault.update_secret', {
        name: VAULT_SECRET_NAME,
        new_secret: apiKey,
      });
      return !error;
    }

    const { error } = await supabase.rpc('vault.create_secret', {
      secret: apiKey,
      name: VAULT_SECRET_NAME,
      description: 'Google Gemini API key for AI analysis',
    });
    return !error;
  } catch {
    return false;
  }
}

async function getSettings() {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select('model, key_configured, updated_at')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    return { model: DEFAULT_MODEL, key_configured: false, updated_at: null };
  }
  return data;
}

async function updateSettings(model: string, keyConfigured: boolean) {
  await supabase
    .from(SETTINGS_TABLE)
    .update({ model, key_configured: keyConfigured, updated_at: new Date().toISOString() })
    .eq('id', 1);
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
    const body: RequestBody = await req.json();

    // --- Get Status ---
    if (body.action === 'getStatus') {
      const settings = await getSettings();

      // Check if the key is actually available — from env var, Vault, or DB flag.
      // This ensures keys set as edge function secrets (GEMINI_API_KEY env var)
      // are detected even if key_configured was never set to true in the DB.
      const envKey = Deno.env.get('GEMINI_API_KEY');
      const vaultKey = envKey ? null : await getKeyFromVault();
      const keyAvailable = !!(envKey || vaultKey);

      const configured = keyAvailable || settings.key_configured;

      // If the key is available via env/Vault but the DB flag is stale, sync it.
      if (keyAvailable && !settings.key_configured) {
        await updateSettings(settings.model || DEFAULT_MODEL, true);
      }

      return respond({
        configured,
        model: settings.model || DEFAULT_MODEL,
        updatedAt: settings.updated_at,
      });
    }

    // --- Save Key ---
    if (body.action === 'save') {
      const { apiKey, model } = body as SaveRequest;

      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
        return respond({ error: 'API key is too short or invalid.' }, 400);
      }

      const finalModel = (model && model.trim()) || DEFAULT_MODEL;
      const saved = await saveKeyToVault(apiKey.trim());

      if (!saved) {
        return respond({ error: 'Failed to store API key securely. Please try again.' }, 500);
      }

      await updateSettings(finalModel, true);
      return respond({ success: true, message: 'API Key configured successfully.' });
    }

    // --- Test Connection ---
    if (body.action === 'testConnection') {
      const apiKey = await resolveApiKey();
      if (!apiKey) {
        return respond({ success: false, message: 'Secret not configured' });
      }

      // Allow caller to override model for testing; otherwise resolve from env/DB.
      const model = (typeof body.model === 'string' && body.model.trim())
        ? body.model.trim()
        : await resolveModel();
      const result = await testGeminiKey(apiKey, model);
      return respond(result);
    }

    // --- Diagnostics (lists the resolved model + available models from the API) ---
    if (body.action === 'diagnostics') {
      const apiKey = await resolveApiKey();
      const model = await resolveModel();
      const dbSettings = await getSettings();
      const envModel = Deno.env.get('GEMINI_MODEL');
      const envKey = Deno.env.get('GEMINI_API_KEY');
      const vaultKey = envKey ? null : await getKeyFromVault();

      let availableModels: any = null;
      let listError: string | null = null;

      if (apiKey) {
        try {
          const resp = await fetch(`${GEMINI_BASE_URL}?key=${apiKey}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          const body = await resp.text();
          if (resp.ok) {
            const parsed = JSON.parse(body);
            availableModels = (parsed.models ?? []).map((m: any) => ({
              name: m.name,
              displayName: m.displayName,
              supportedGenerationMethods: m.supportedGenerationMethods,
            }));
          } else {
            listError = `HTTP ${resp.status}: ${body.slice(0, 500)}`;
          }
        } catch (e) {
          listError = e instanceof Error ? e.message : String(e);
        }
      }

      return respond({
        resolvedModel: model,
        defaultModel: DEFAULT_MODEL,
        envModel: envModel ?? null,
        envModelSource: envModel ? 'GEMINI_MODEL env var' : null,
        dbModel: dbSettings.model ?? null,
        apiKeyAvailable: !!(envKey || vaultKey),
        apiKeySource: envKey ? 'GEMINI_API_KEY env var' : vaultKey ? 'Vault' : 'none',
        availableModels,
        listError,
      });
    }

    return respond({ error: 'Unknown action.' }, 400);
  } catch (err) {
    console.error('manage-ai-settings error:', err);
    return respond({ error: 'An unexpected error occurred. Please try again.' }, 500);
  }
});
