import { supabase } from '@/lib/supabase';
import type {
  DocumentRow,
  GameRow,
  GameSessionRow,
  GameType,
  GameConfig,
  DocumentAnalysis,
  GameContent,
} from '@/lib/types';

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

export async function saveSession(
  session: Omit<GameSessionRow, 'id' | 'created_at'>,
): Promise<void> {
  const { error } = await supabase.from('game_sessions').insert({
    game_id: session.game_id,
    document_id: session.document_id,
    score: session.score,
    max_score: session.max_score,
    correct: session.correct,
    total: session.total,
    duration_ms: session.duration_ms,
    completed: session.completed,
    answers: session.answers,
  });
  if (error) console.error('saveSession error:', error);
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
