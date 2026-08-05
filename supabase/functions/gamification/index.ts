import {
  corsHeaders,
  resolveApiKey,
  resolveModel,
  callGemini,
  parseJSONWithRetry,
  GeminiError,
  supabase,
} from '../_shared/gemini.ts';

// ─── Gamification constants ──────────────────────────────────────────────────

const XP_PER_CORRECT = 10;
const XP_PER_GAME_COMPLETE = 50;
const COINS_PER_CORRECT = 5;
const COINS_PER_GAME_COMPLETE = 20;
const XP_PER_LEVEL = 1000;
const TIME_BONUS_THRESHOLD_MS = 60_000;
const TIME_BONUS_XP = 25;

interface ProcessSessionRequest {
  action: 'processSession' | 'getStats' | 'getRecommendations' | 'getMissions' | 'getAchievements';
  sessionId?: string;
  gameId?: string;
  documentId?: string;
  analysis?: any;
}

// ─── Process game session → award XP/coins ────────────────────────────────────

async function processSession(sessionId: string): Promise<any> {
  const { data: session, error: sessionErr } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionErr || !session) throw new Error('Session not found');

  if (session.xp_earned && session.xp_earned > 0) {
    return { alreadyProcessed: true, xp: session.xp_earned, coins: session.coins_earned };
  }

  const correct = session.correct || 0;
  const total = session.total || 0;
  const durationMs = session.duration_ms || 0;

  let xp = correct * XP_PER_CORRECT;
  if (session.completed) xp += XP_PER_GAME_COMPLETE;
  let coins = correct * COINS_PER_CORRECT;
  if (session.completed) coins += COINS_PER_GAME_COMPLETE;

  let timeBonus = 0;
  if (session.completed && durationMs > 0 && durationMs < TIME_BONUS_THRESHOLD_MS) {
    timeBonus = TIME_BONUS_XP;
    xp += timeBonus;
  }

  await supabase
    .from('game_sessions')
    .update({ xp_earned: xp, coins_earned: coins, time_bonus: timeBonus })
    .eq('id', sessionId);

  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .maybeSingle();

  if (stats) {
    const today = new Date().toISOString().slice(0, 10);
    const lastActivity = stats.last_activity_date;
    let streakDays = stats.streak_days;

    if (lastActivity !== today) {
      if (lastActivity) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (lastActivity === yesterday) streakDays += 1;
        else streakDays = 1;
      } else {
        streakDays = 1;
      }
    }

    const newTotalXp = stats.total_xp + xp;
    const newLevel = Math.floor(newTotalXp / XP_PER_LEVEL) + 1;
    const newCoins = stats.coins + coins;
    const newGamesPlayed = stats.total_games_played + (session.completed ? 1 : 0);
    const newCorrect = stats.total_correct_answers + correct;
    const newTotalQ = stats.total_questions_answered + total;
    const newBestScore = Math.max(stats.best_score, session.score || 0);

    await supabase
      .from('user_stats')
      .update({
        total_xp: newTotalXp,
        coins: newCoins,
        level: newLevel,
        streak_days: streakDays,
        last_activity_date: today,
        total_games_played: newGamesPlayed,
        total_correct_answers: newCorrect,
        total_questions_answered: newTotalQ,
        best_score: newBestScore,
        updated_at: new Date().toISOString(),
      })
      .eq('id', '00000000-0000-0000-0000-000000000001');
  }

  return { xp, coins, timeBonus };
}

// ─── Check achievements ──────────────────────────────────────────────────────

async function checkAchievements(): Promise<string[]> {
  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('id', '00000000-0000-0000-0000-000000000001')
    .maybeSingle();

  if (!stats) return [];

  const { data: allAchievements } = await supabase
    .from('achievements')
    .select('*');

  const { data: earned } = await supabase
    .from('user_achievements')
    .select('achievement_id');

  const earnedIds = new Set((earned || []).map((e: any) => e.achievement_id));
  const newlyEarned: string[] = [];

  for (const ach of allAchievements || []) {
    if (earnedIds.has(ach.id)) continue;
    const cond = ach.condition || {};
    let met = false;

    if (cond.type === 'games_played' && stats.total_games_played >= (cond.min || 0)) met = true;
    else if (cond.type === 'documents_uploaded') {
      const { count } = await supabase.from('documents').select('*', { count: 'exact', head: true });
      if ((count || 0) >= (cond.min || 0)) met = true;
    }
    else if (cond.type === 'streak_days' && stats.streak_days >= (cond.min || 0)) met = true;
    else if (cond.type === 'correct_answers' && stats.total_correct_answers >= (cond.min || 0)) met = true;
    else if (cond.type === 'level_reached' && stats.level >= (cond.min || 0)) met = true;

    if (met) {
      await supabase.from('user_achievements').insert({ achievement_id: ach.id });
      if (ach.xp_reward > 0) {
        await supabase
          .from('user_stats')
          .update({ total_xp: stats.total_xp + ach.xp_reward, updated_at: new Date().toISOString() })
          .eq('id', '00000000-0000-0000-0000-000000000001');
      }
      newlyEarned.push(ach.name);
    }
  }

  return newlyEarned;
}

// ─── AI Recommendations ──────────────────────────────────────────────────────

async function getRecommendations(analysis: any): Promise<any> {
  const apiKey = await resolveApiKey();
  const model = await resolveModel();

  if (!apiKey) return { recommendations: [] };

  const { data: recentSessions } = await supabase
    .from('game_sessions')
    .select('*, games!inner(type)')
    .order('created_at', { ascending: false })
    .limit(20);

  const weakAreas: string[] = [];
  const gamePerformance: Record<string, { correct: number; total: number }> = {};

  for (const s of recentSessions || []) {
    const gameType = (s as any).games?.type || 'unknown';
    if (!gamePerformance[gameType]) gamePerformance[gameType] = { correct: 0, total: 0 };
    gamePerformance[gameType].correct += s.correct || 0;
    gamePerformance[gameType].total += s.total || 0;
    if ((s.answers as any)?.weakConcepts) {
      weakAreas.push(...(s.answers as any).weakConcepts);
    }
  }

  const systemPrompt = `You are an expert learning advisor. Based on the document analysis and the learner's recent game performance, recommend specific study actions.

Return ONLY valid JSON (no markdown):
{
  "weak_topics": ["topics the learner struggles with"],
  "recommendations": [
    {
      "type": "flashcards|quiz|game|revision|study_schedule",
      "reason": "why this is recommended",
      "specific_content": "what to study",
      "priority": "high|medium|low"
    }
  ],
  "next_steps": ["actionable next steps"]
}`;

  const userPrompt = `Document: ${analysis?.title || 'Unknown'}
Concepts: ${(analysis?.concepts || []).map((c: any) => c.term).join(', ')}
Keywords: ${(analysis?.keywords || []).join(', ')}

Recent game performance:
${Object.entries(gamePerformance).map(([type, perf]) =>
  `- ${type}: ${perf.correct}/${perf.total} correct (${Math.round((perf.correct / Math.max(perf.total, 1)) * 100)}%)`
).join('\n')}

Weak areas detected: ${weakAreas.length > 0 ? weakAreas.join(', ') : 'None detected yet'}

Recommend study actions based on this data.`;

  try {
    const content = await callGemini({
      apiKey,
      model,
      systemPrompt,
      userPrompt,
      temperature: 0.5,
      maxTokens: 2000,
    });
    return await parseJSONWithRetry(content, { apiKey, model, systemPrompt, userPrompt, temperature: 0.5, maxTokens: 2000 });
  } catch {
    return { weak_topics: [], recommendations: [], next_steps: [] };
  }
}

// ─── Generate daily missions ──────────────────────────────────────────────────

async function generateMissions(): Promise<any[]> {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);

  const missions = [
    { type: 'daily', description: 'Play 1 quiz game', target: 1, xp_reward: 50, coins_reward: 20, expires_at: tomorrow.toISOString() },
    { type: 'daily', description: 'Answer 10 questions correctly', target: 10, xp_reward: 30, coins_reward: 15, expires_at: tomorrow.toISOString() },
    { type: 'daily', description: 'Complete 2 flashcard sessions', target: 2, xp_reward: 40, coins_reward: 20, expires_at: tomorrow.toISOString() },
  ];

  const { data: existing } = await supabase
    .from('missions')
    .select('*')
    .eq('type', 'daily')
    .gte('expires_at', today.toISOString())
    .limit(5);

  if (existing && existing.length > 0) return existing;

  for (const m of missions) {
    await supabase.from('missions').insert(m);
  }

  const { data: inserted } = await supabase
    .from('missions')
    .select('*')
    .eq('type', 'daily')
    .gte('expires_at', today.toISOString());

  return inserted || [];
}

// ─── Main handler ─────────────────────────────────────────────────────────────

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
    let body: ProcessSessionRequest;
    try {
      body = await req.json();
    } catch {
      return respond({ error: 'Invalid request body.' }, 400);
    }

    switch (body.action) {
      case 'processSession': {
        if (!body.sessionId) return respond({ error: 'Missing sessionId.' }, 400);
        const result = await processSession(body.sessionId);
        const newAchievements = await checkAchievements();
        return respond({ ...result, newAchievements });
      }

      case 'getStats': {
        const { data: stats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .maybeSingle();
        const { data: achievements } = await supabase
          .from('user_achievements')
          .select('*, achievements(*)')
          .order('earned_at', { ascending: false });
        return respond({ stats: stats || {}, achievements: achievements || [] });
      }

      case 'getRecommendations': {
        if (!body.analysis) return respond({ error: 'Missing analysis.' }, 400);
        const recs = await getRecommendations(body.analysis);
        return respond(recs);
      }

      case 'getMissions': {
        const missions = await generateMissions();
        return respond({ missions });
      }

      case 'getAchievements': {
        const { data: all } = await supabase.from('achievements').select('*').order('xp_reward', { ascending: false });
        const { data: earned } = await supabase
          .from('user_achievements')
          .select('achievement_id, earned_at');
        const earnedIds = new Set((earned || []).map((e: any) => e.achievement_id));
        const withStatus = (all || []).map((a: any) => ({ ...a, earned: earnedIds.has(a.id) }));
        return respond({ achievements: withStatus });
      }

      default:
        return respond({ error: 'Unknown action.' }, 400);
    }
  } catch (err) {
    console.error('[gamification] Error:', err);
    return respond({ error: err instanceof Error ? err.message : 'Unexpected error.' }, 500);
  }
});
