-- Migrate AI provider from OpenRouter to Google Gemini
-- Update default model to gemini-2.5-flash
ALTER TABLE ai_settings ALTER COLUMN model SET DEFAULT 'gemini-2.5-flash';

-- Update any existing row that still has an OpenRouter model
UPDATE ai_settings SET model = 'gemini-2.5-flash'
  WHERE model LIKE 'openai/%' OR model LIKE 'openrouter/%' OR model = 'gemini-2.5-flash' AND model IS NULL;

-- Ensure the row exists
INSERT INTO ai_settings (id, model, key_configured)
VALUES (1, 'gemini-2.5-flash', false)
ON CONFLICT (id) DO NOTHING;
