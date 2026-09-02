import { supabase } from '@/lib/supabase';
import type {
  DocumentRow,
  GameRow,
  GameSessionRow,
  GameType,
  GameConfig,
  DocumentAnalysis,
  GameContent,
  UserStats,
  Achievement,
  Mission,
  LearningPath,
  Concept,
} from '@/lib/types';

// ─── Documents ────────────────────────────────────────────────────────────────

export async function createDocument(
  input: Pick<DocumentRow, 'title' | 'file_name' | 'page_count' | 'word_count'> &
    Partial<Pick<DocumentRow, 'status'>>,
): Promise<DocumentRow | null> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      title: input.title,
      file_name: input.file_name,
      page_count: input.page_count,
      word_count: input.word_count,
      status: input.status ?? 'processing',
    })
    .select()
    .single();
  if (error) {
    console.error('createDocument error:', error);
    return null;
  }
  return data as DocumentRow;
}

export async function updateDocumentAnalysis(
  id: string,
  analysis: DocumentAnalysis,
  rawText: string,
): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({
      status: 'analyzed',
      analysis,
      raw_text: rawText,
      summary: analysis.summary,
      difficulty: analysis.difficulty,
      estimated_age: analysis.estimatedAge,
      subtitle: analysis.subtitle || null,
      estimated_study_time: analysis.estimated_study_time || null,
      concept_count: analysis.concept_count || analysis.concepts.length,
      executive_summary: analysis.executive_summary || null,
      beginner_summary: analysis.beginner_summary || null,
      student_summary: analysis.student_summary || null,
      teacher_summary: analysis.teacher_summary || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) console.error('updateDocumentAnalysis error:', error);
}

export async function markDocumentFailed(id: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ status: 'failed', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('markDocumentFailed error:', error);
}

export async function getDocuments(): Promise<DocumentRow[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getDocuments error:', error);
    return [];
  }
  return (data || []) as DocumentRow[];
}

export async function getDocument(id: string): Promise<DocumentRow | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('getDocument error:', error);
    return null;
  }
  return data as DocumentRow | null;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) console.error('deleteDocument error:', error);
}

// ─── Games ────────────────────────────────────────────────────────────────────

export async function createGame(
  documentId: string,
  type: GameType,
  title: string,
  config: GameConfig,
  content: GameContent,
): Promise<GameRow | null> {
  const { data, error } = await supabase
    .from('games')
    .insert({
      document_id: documentId,
      type,
      title,
      config,
      content,
    })
    .select()
    .single();
  if (error) {
    console.error('createGame error:', error);
    return null;
  }
  return data as GameRow;
}

export async function getGames(documentId: string): Promise<GameRow[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getGames error:', error);
    return [];
  }
  return (data || []) as GameRow[];
}

export async function getGame(id: string): Promise<GameRow | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('getGame error:', error);
    return null;
  }
  return data as GameRow | null;
}

export async function deleteGame(id: string): Promise<void> {
  const { error } = await supabase.from('games').delete().eq('id', id);
  if (error) console.error('deleteGame error:', error);
}

// ─── Game Sessions ────────────────────────────────────────────────────────────

export async function saveSession(
  session: Omit<GameSessionRow, 'id' | 'created_at' | 'xp_earned' | 'coins_earned' | 'time_bonus' | 'bloom_level'>,
): Promise<GameSessionRow | null> {
  const { data, error } = await supabase
    .from('game_sessions')
    .insert({
      game_id: session.game_id,
      document_id: session.document_id,
      score: session.score,
      max_score: session.max_score,
      correct: session.correct,
      total: session.total,
      duration_ms: session.duration_ms,
      completed: session.completed,
      answers: session.answers,
    })
    .select()
    .single();
  if (error) {
    console.error('saveSession error:', error);
    return null;
  }
  return data as GameSessionRow;
}

export async function getSessions(documentId: string): Promise<GameSessionRow[]> {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('getSessions error:', error);
    return [];
  }
  return (data || []) as GameSessionRow[];
}

export async function getRecentSessions(limit = 10): Promise<GameSessionRow[]> {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('getRecentSessions error:', error);
    return [];
  }
  return (data || []) as GameSessionRow[];
}

// ─── Concepts ──────────────────────────────────────────────────────────────────

export async function saveConcepts(documentId: string, concepts: Concept[]): Promise<void> {
  if (concepts.length === 0) return;
  const rows = concepts.map((c) => ({
    document_id: documentId,
    term: c.term,
    definition: c.definition,
    type: c.type || 'concept',
    importance: c.occurrences || 1,
  }));
  const { error } = await supabase.from('concepts').insert(rows);
  if (error) console.error('saveConcepts error:', error);
}

export async function getConcepts(documentId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('concepts')
    .select('*')
    .eq('document_id', documentId)
    .order('importance', { ascending: false });
  if (error) return [];
  return data || [];
}

// ─── Learning Paths ────────────────────────────────────────────────────────────

export async function saveLearningPath(
  documentId: string,
  type: 'daily' | 'weekly' | 'roadmap',
  title: string,
  description: string,
  data: any,
  estimatedCompletionDate?: string,
): Promise<LearningPath | null> {
  const { data: row, error } = await supabase
    .from('learning_paths')
    .insert({
      document_id: documentId,
      type,
      title,
      description,
      data,
      estimated_completion_date: estimatedCompletionDate || null,
    })
    .select()
    .single();
  if (error) {
    console.error('saveLearningPath error:', error);
    return null;
  }
  return row as LearningPath;
}

export async function getLearningPaths(documentId: string): Promise<LearningPath[]> {
  const { data, error } = await supabase
    .from('learning_paths')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []) as LearningPath[];
}

export async function updateLearningPathProgress(id: string, progress: number): Promise<void> {
  const { error } = await supabase
    .from('learning_paths')
    .update({ progress, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('updateLearningPathProgress error:', error);
}

// ─── Bookmarks ──────────────────────────────────────────────────────────────────

export async function addBookmark(
  documentId: string,
  term: string,
  note?: string,
  conceptId?: string,
): Promise<void> {
  const { error } = await supabase
    .from('bookmarks')
    .insert({ document_id: documentId, term, note, concept_id: conceptId || null });
  if (error) console.error('addBookmark error:', error);
}

export async function getBookmarks(documentId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function deleteBookmark(id: string): Promise<void> {
  const { error } = await supabase.from('bookmarks').delete().eq('id', id);
  if (error) console.error('deleteBookmark error:', error);
}

// ─── Highlights ──────────────────────────────────────────────────────────────────

export async function addHighlight(
  documentId: string,
  text: string,
  note?: string,
  page?: number,
): Promise<void> {
  const { error } = await supabase
    .from('highlights')
    .insert({ document_id: documentId, text, note, page: page || null });
  if (error) console.error('addHighlight error:', error);
}

export async function getHighlights(documentId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('highlights')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function deleteHighlight(id: string): Promise<void> {
  const { error } = await supabase.from('highlights').delete().eq('id', id);
  if (error) console.error('deleteHighlight error:', error);
}

// ─── Gamification (via edge function) ────────────────────────────────────────────

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gamification`;
const FUNCTION_HEADERS = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export async function processGameSession(sessionId: string): Promise<any> {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: FUNCTION_HEADERS,
    body: JSON.stringify({ action: 'processSession', sessionId }),
  });
  if (!res.ok) throw new Error(`Failed to process session: ${res.status}`);
  return res.json();
}

export async function getUserStats(): Promise<{ stats: UserStats | null; achievements: any[] }> {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: FUNCTION_HEADERS,
    body: JSON.stringify({ action: 'getStats' }),
  });
  if (!res.ok) return { stats: null, achievements: [] };
  return res.json();
}

export async function getAchievements(): Promise<Achievement[]> {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: FUNCTION_HEADERS,
    body: JSON.stringify({ action: 'getAchievements' }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.achievements || [];
}

export async function getMissions(): Promise<Mission[]> {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: FUNCTION_HEADERS,
    body: JSON.stringify({ action: 'getMissions' }),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.missions || [];
}

export async function getRecommendations(analysis: any): Promise<any> {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: FUNCTION_HEADERS,
    body: JSON.stringify({ action: 'getRecommendations', analysis }),
  });
  if (!res.ok) return { weak_topics: [], recommendations: [], next_steps: [] };
  return res.json();
}
