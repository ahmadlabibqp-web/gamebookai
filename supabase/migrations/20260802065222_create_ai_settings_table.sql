/*
# Create AI Settings table

1. New Tables
- `ai_settings`: Singleton table (id always = 1) storing AI provider configuration.
  - `id` (int2, primary key, default 1) — ensures only one row.
  - `model` (text, not null, default 'openai/gpt-5.1-mini') — the OpenRouter model identifier.
  - `key_configured` (boolean, not null, default false) — whether an API key has been stored in the vault.
  - `updated_at` (timestamptz, default now()) — last modification timestamp.

2. Security
- Enable RLS on `ai_settings`.
- Allow anon + authenticated CRUD because this is a single-tenant app with no sign-in.
  The table stores NO secrets — only the model name and a boolean flag.
  The actual API key lives in the Supabase vault, never in this table.

3. Important Notes
- This table NEVER stores the API key. The key is written to `vault.secrets` via the
  `vault.create_secret()` / `vault.update_secret()` functions from the edge function.
- The `key_configured` column is a boolean flag that tells the frontend whether a key
  has been saved, without ever exposing the key itself.
- A CHECK constraint ensures id = 1 so the table remains a singleton.
*/

CREATE TABLE IF NOT EXISTS ai_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  model text NOT NULL DEFAULT 'openai/gpt-5.1-mini',
  key_configured boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ai_settings" ON ai_settings;
CREATE POLICY "anon_select_ai_settings" ON ai_settings FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_ai_settings" ON ai_settings;
CREATE POLICY "anon_insert_ai_settings" ON ai_settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_ai_settings" ON ai_settings;
CREATE POLICY "anon_update_ai_settings" ON ai_settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_ai_settings" ON ai_settings;
CREATE POLICY "anon_delete_ai_settings" ON ai_settings FOR DELETE
  TO anon, authenticated USING (true);

-- Seed the singleton row
INSERT INTO ai_settings (id, model, key_configured)
VALUES (1, 'openai/gpt-5.1-mini', false)
ON CONFLICT (id) DO NOTHING;