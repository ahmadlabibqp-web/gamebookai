/*
# Expand BOOK2GAME AI Schema — Full Learning Platform

## Overview
Transforms BOOK2GAME AI from a simple document-to-game converter into a complete
AI-powered learning platform. Adds tables for concept storage, knowledge graph,
learning paths, gamification (XP/coins/levels/badges/missions/streaks),
bookmarks, highlights, and enhanced document analysis.

## New Tables
1. `concepts` — Individual extracted concepts (terms, definitions, people, places, dates, formulas)
2. `concept_relationships` — Knowledge graph edges connecting concepts
3. `learning_paths` — Daily/weekly study plans and roadmaps
4. `user_stats` — Gamification stats (XP, level, coins, streak)
5. `achievements` — Badge/achievement definitions
6. `user_achievements` — Earned achievements (junction)
7. `missions` — Daily/weekly missions
8. `bookmarks` — Saved concepts with notes
9. `highlights` — Highlighted text from documents

## Modified Tables
- `documents` — Added subtitle, study time, concept count, four summary types
- `game_sessions` — Added XP earned, coins earned, Bloom level, time bonus

## Security
- All new tables have RLS enabled with `TO anon, authenticated` policies (single-tenant, no auth)
- All existing data preserved — only additive changes
*/

-- ═══════════════════════════════════════════════════════════════
-- 1. ENHANCE DOCUMENTS TABLE
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS subtitle text;
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS estimated_study_time integer DEFAULT 0;
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS concept_count integer DEFAULT 0;
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS executive_summary text;
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS beginner_summary text;
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS student_summary text;
  ALTER TABLE documents ADD COLUMN IF NOT EXISTS teacher_summary text;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. ENHANCE GAME_SESSIONS TABLE
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS xp_earned integer DEFAULT 0;
  ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS coins_earned integer DEFAULT 0;
  ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS bloom_level text;
  ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS time_bonus integer DEFAULT 0;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 3. CONCEPTS TABLE — Individual extracted concepts
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  term text NOT NULL,
  definition text,
  type text NOT NULL DEFAULT 'concept',
  page integer,
  importance real DEFAULT 0.5,
  bloom_level text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concepts_document_id ON concepts(document_id);
CREATE INDEX IF NOT EXISTS idx_concepts_type ON concepts(type);

ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_concepts" ON concepts;
CREATE POLICY "anon_select_concepts" ON concepts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_concepts" ON concepts;
CREATE POLICY "anon_insert_concepts" ON concepts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_concepts" ON concepts;
CREATE POLICY "anon_update_concepts" ON concepts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_concepts" ON concepts;
CREATE POLICY "anon_delete_concepts" ON concepts FOR DELETE
  TO anon, authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 4. CONCEPT_RELATIONSHIPS TABLE — Knowledge graph edges
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS concept_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  source_concept_id uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  target_concept_id uuid NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  relationship_type text NOT NULL DEFAULT 'related',
  description text,
  weight real DEFAULT 1.0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_concept_rel_document_id ON concept_relationships(document_id);
CREATE INDEX IF NOT EXISTS idx_concept_rel_source ON concept_relationships(source_concept_id);
CREATE INDEX IF NOT EXISTS idx_concept_rel_target ON concept_relationships(target_concept_id);

ALTER TABLE concept_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_concept_rel" ON concept_relationships;
CREATE POLICY "anon_select_concept_rel" ON concept_relationships FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_concept_rel" ON concept_relationships;
CREATE POLICY "anon_insert_concept_rel" ON concept_relationships FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_concept_rel" ON concept_relationships;
CREATE POLICY "anon_update_concept_rel" ON concept_relationships FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_concept_rel" ON concept_relationships;
CREATE POLICY "anon_delete_concept_rel" ON concept_relationships FOR DELETE
  TO anon, authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 5. LEARNING_PATHS TABLE — Study plans and roadmaps
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'daily',
  title text NOT NULL,
  description text,
  data jsonb NOT NULL DEFAULT '{}',
  estimated_completion_date date,
  progress real DEFAULT 0.0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_paths_document_id ON learning_paths(document_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_type ON learning_paths(type);

ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_learning_paths" ON learning_paths;
CREATE POLICY "anon_select_learning_paths" ON learning_paths FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_learning_paths" ON learning_paths;
CREATE POLICY "anon_insert_learning_paths" ON learning_paths FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_learning_paths" ON learning_paths;
CREATE POLICY "anon_update_learning_paths" ON learning_paths FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_learning_paths" ON learning_paths;
CREATE POLICY "anon_delete_learning_paths" ON learning_paths FOR DELETE
  TO anon, authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 6. USER_STATS TABLE — Gamification stats (single-tenant singleton)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_xp integer NOT NULL DEFAULT 0,
  coins integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak_days integer NOT NULL DEFAULT 0,
  last_activity_date date,
  total_games_played integer NOT NULL DEFAULT 0,
  total_correct_answers integer NOT NULL DEFAULT 0,
  total_questions_answered integer NOT NULL DEFAULT 0,
  best_score integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT single_row CHECK (id = '00000000-0000-0000-0000-000000000001')
);

ALTER TABLE user_stats ALTER COLUMN id SET DEFAULT '00000000-0000-0000-0000-000000000001';

INSERT INTO user_stats (id) VALUES ('00000000-0000-0000-0000-000000000001')
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_user_stats" ON user_stats;
CREATE POLICY "anon_select_user_stats" ON user_stats FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_user_stats" ON user_stats;
CREATE POLICY "anon_insert_user_stats" ON user_stats FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_user_stats" ON user_stats;
CREATE POLICY "anon_update_user_stats" ON user_stats FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 7. ACHIEVEMENTS TABLE — Badge definitions
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'Award',
  category text NOT NULL DEFAULT 'general',
  xp_reward integer NOT NULL DEFAULT 0,
  condition jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_achievements" ON achievements;
CREATE POLICY "anon_select_achievements" ON achievements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_achievements" ON achievements;
CREATE POLICY "anon_insert_achievements" ON achievements FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 8. USER_ACHIEVEMENTS TABLE — Earned achievements
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id ON user_achievements(achievement_id);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_user_achievements" ON user_achievements;
CREATE POLICY "anon_select_user_achievements" ON user_achievements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_user_achievements" ON user_achievements;
CREATE POLICY "anon_insert_user_achievements" ON user_achievements FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 9. MISSIONS TABLE — Daily/weekly missions
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'daily',
  description text NOT NULL,
  target integer NOT NULL DEFAULT 1,
  progress integer NOT NULL DEFAULT 0,
  xp_reward integer NOT NULL DEFAULT 0,
  coins_reward integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(type);
CREATE INDEX IF NOT EXISTS idx_missions_expires_at ON missions(expires_at);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_missions" ON missions;
CREATE POLICY "anon_select_missions" ON missions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_missions" ON missions;
CREATE POLICY "anon_insert_missions" ON missions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_missions" ON missions;
CREATE POLICY "anon_update_missions" ON missions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_missions" ON missions;
CREATE POLICY "anon_delete_missions" ON missions FOR DELETE
  TO anon, authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 10. BOOKMARKS TABLE — Saved concepts with notes
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  concept_id uuid REFERENCES concepts(id) ON DELETE SET NULL,
  term text NOT NULL,
  note text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_document_id ON bookmarks(document_id);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_bookmarks" ON bookmarks;
CREATE POLICY "anon_select_bookmarks" ON bookmarks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_bookmarks" ON bookmarks;
CREATE POLICY "anon_insert_bookmarks" ON bookmarks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_bookmarks" ON bookmarks;
CREATE POLICY "anon_update_bookmarks" ON bookmarks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_bookmarks" ON bookmarks;
CREATE POLICY "anon_delete_bookmarks" ON bookmarks FOR DELETE
  TO anon, authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 11. HIGHLIGHTS TABLE — Highlighted text from documents
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  text text NOT NULL,
  note text,
  page integer,
  color text DEFAULT 'yellow',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_highlights_document_id ON highlights(document_id);

ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_highlights" ON highlights;
CREATE POLICY "anon_select_highlights" ON highlights FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_highlights" ON highlights;
CREATE POLICY "anon_insert_highlights" ON highlights FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_highlights" ON highlights;
CREATE POLICY "anon_update_highlights" ON highlights FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_highlights" ON highlights;
CREATE POLICY "anon_delete_highlights" ON highlights FOR DELETE
  TO anon, authenticated USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 12. SEED DEFAULT ACHIEVEMENTS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO achievements (name, description, icon, category, xp_reward, condition) VALUES
  ('First Steps', 'Complete your first game', 'Footprints', 'gameplay', 50, '{"type":"games_played","min":1}'),
  ('Quiz Master', 'Score 100% on a quiz', 'Brain', 'quiz', 100, '{"type":"perfect_score","game_type":"quiz"}'),
  ('Bookworm', 'Upload 5 documents', 'BookOpen', 'documents', 100, '{"type":"documents_uploaded","min":5}'),
  ('Streak Starter', 'Maintain a 3-day learning streak', 'Flame', 'streak', 75, '{"type":"streak_days","min":3}'),
  ('Week Warrior', 'Maintain a 7-day learning streak', 'Sword', 'streak', 200, '{"type":"streak_days","min":7}'),
  ('Century Club', 'Answer 100 questions correctly', 'CheckCircle', 'progress', 150, '{"type":"correct_answers","min":100}'),
  ('Flashcard Fan', 'Complete 10 flashcard sessions', 'Layers', 'gameplay', 100, '{"type":"game_sessions","game_type":"flashcards","min":10}'),
  ('Knowledge Seeker', 'Play 50 games', 'Compass', 'gameplay', 200, '{"type":"games_played","min":50}'),
  ('Speed Demon', 'Finish a game in under 60 seconds', 'Zap', 'gameplay', 75, '{"type":"fast_completion"}'),
  ('Perfectionist', 'Get perfect scores on 5 games', 'Crown', 'progress', 250, '{"type":"perfect_scores","min":5}'),
  ('Explorer', 'Try all 9 game types', 'Globe', 'gameplay', 150, '{"type":"all_game_types"}'),
  ('Scholar', 'Reach level 10', 'GraduationCap', 'progress', 300, '{"type":"level_reached","min":10}')
ON CONFLICT (name) DO NOTHING;