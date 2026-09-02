/*
# BOOK2GAME AI — Core Schema

1. Overview
   Single-tenant (no sign-in) schema for the BOOK2GAME AI platform. A user uploads
   a PDF; we extract text, analyze structure, and generate educational games. All
   documents, generated games, and learning activity are persisted so the user can
   reopen previous work and track progress.

   Auth is intentionally omitted (no sign-in screen). Policies use `TO anon,
   authenticated` so the anon-key frontend can read/write its shared data. The
   schema is designed so a `user_id` column + authenticated-only RLS can be added
   later without restructuring.

2. New Tables
   - `documents`: an uploaded PDF + its extracted/analyzed content.
     - id (uuid pk)
     - title (text) — derived from the PDF or filename
     - file_name (text) — original uploaded filename
     - page_count (int) — number of pages extracted
     - word_count (int) — total words extracted
     - status (text) — 'processing' | 'analyzed' | 'failed'
     - summary (text) — auto-generated short summary
     - analysis (jsonb) — full structured analysis (chapters, concepts, keywords, etc.)
     - raw_text (text) — full extracted text (kept for re-processing / search)
     - difficulty (text) — estimated difficulty
     - estimated_age (text) — estimated target age range
     - created_at, updated_at (timestamptz)
   - `games`: a generated game for a document.
     - id (uuid pk)
     - document_id (uuid fk -> documents, cascade)
     - type (text) — 'quiz' | 'flashcards' | 'matching' | 'wordsearch' | 'unscramble'
       | 'hangman' | 'memory' | 'sequence' | 'crossword'
     - title (text)
     - config (jsonb) — generation config (e.g. question count)
     - content (jsonb) — the generated game payload (questions, cards, etc.)
     - created_at (timestamptz)
   - `game_sessions`: a student's play session for a game (score, progress).
     - id (uuid pk)
     - game_id (uuid fk -> games, cascade)
     - document_id (uuid fk -> documents, cascade)
     - score (int) — points earned
     - max_score (int) — points possible
     - correct (int) — correct answers
     - total (int) — total questions/items
     - duration_ms (int) — time spent
     - completed (boolean) — whether the session finished
     - answers (jsonb) — per-item answer record for review
     - created_at (timestamptz)

3. Indexes
   - documents.created_at (browse recent)
   - games.document_id (list games for a document)
   - game_sessions.game_id (history for a game)
   - game_sessions.document_id (progress for a document)

4. Security
   - RLS enabled on all three tables.
   - All policies `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
     because this is a single-tenant shared-data app (no sign-in). Documented here so
     this is not mistaken for an ownership shortcut.
*/

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  file_name text NOT NULL,
  page_count integer NOT NULL DEFAULT 0,
  word_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processing',
  summary text,
  analysis jsonb,
  raw_text text,
  difficulty text,
  estimated_age text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_documents" ON documents;
CREATE POLICY "anon_select_documents" ON documents FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_documents" ON documents;
CREATE POLICY "anon_insert_documents" ON documents FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_documents" ON documents;
CREATE POLICY "anon_update_documents" ON documents FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_documents" ON documents;
CREATE POLICY "anon_delete_documents" ON documents FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  config jsonb,
  content jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_games" ON games;
CREATE POLICY "anon_select_games" ON games FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_games" ON games;
CREATE POLICY "anon_insert_games" ON games FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_games" ON games;
CREATE POLICY "anon_update_games" ON games FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_games" ON games;
CREATE POLICY "anon_delete_games" ON games FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  max_score integer NOT NULL DEFAULT 0,
  correct integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  answers jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sessions" ON game_sessions;
CREATE POLICY "anon_select_sessions" ON game_sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sessions" ON game_sessions;
CREATE POLICY "anon_insert_sessions" ON game_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sessions" ON game_sessions;
CREATE POLICY "anon_update_sessions" ON game_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sessions" ON game_sessions;
CREATE POLICY "anon_delete_sessions" ON game_sessions FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_games_document_id ON games (document_id);
CREATE INDEX IF NOT EXISTS idx_sessions_game_id ON game_sessions (game_id);
CREATE INDEX IF NOT EXISTS idx_sessions_document_id ON game_sessions (document_id);
