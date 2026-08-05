-- FIX: gpt-5.1-mini does NOT exist on OpenRouter. Update default to gpt-4o-mini.
ALTER TABLE ai_settings ALTER COLUMN model SET DEFAULT 'openai/gpt-4o-mini';

-- Update any existing row that still has the invalid model name
UPDATE ai_settings SET model = 'openai/gpt-4o-mini' WHERE model = 'openai/gpt-5.1-mini';
