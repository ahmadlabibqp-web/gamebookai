import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap, Coins, Flame, Gamepad2, Award, Target, CheckCircle2,
  TrendingUp, Brain, Loader2, Trophy,
} from 'lucide-react';
import { getUserStats, getMissions, getAchievements } from '@/lib/db';
import type { UserStats, Mission, Achievement } from '@/lib/types';

export function ProgressPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [statsData, missionsData, achievementsData] = await Promise.all([
        getUserStats(), getMissions(), getAchievements(),
      ]);
      setStats(statsData.stats);
      setMissions(missionsData);
      setAchievements(achievementsData);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const earnedAchievements = achievements.filter((a) => a.earned);
  const xpInLevel = stats ? stats.total_xp % 1000 : 0;
  const xpPercent = (xpInLevel / 1000) * 100;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full">
        <h1 className="mb-6 font-display text-3xl font-bold tracking-tight text-slate-900">
          Your Progress
        </h1>

        {/* XP and Level */}
        <div className="card mb-6 overflow-hidden">
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-100">Current Level</p>
                <p className="font-display text-4xl font-bold">{stats?.level || 1}</p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Trophy className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-indigo-100 mb-1">
                <span>{xpInLevel} / 1000 XP to next level</span>
                <span>{Math.round(xpPercent)}%</span>
              </div>
              <div className="h-3 rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white transition-all" style={{ width: `${xpPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.total_xp.toLocaleString() || 0}</p>
                <p className="text-xs text-slate-500">Total XP</p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow-sm">
                <Coins className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.coins.toLocaleString() || 0}</p>
                <p className="text-xs text-slate-500">Coins Earned</p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-red-500 shadow-sm">
                <Flame className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.streak_days || 0}</p>
                <p className="text-xs text-slate-500">Day Streak</p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-indigo-500 shadow-sm">
                <Gamepad2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.total_games_played || 0}</p>
                <p className="text-xs text-slate-500">Games Played</p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="card p-5">
            <p className="text-xs text-slate-500 mb-1">Correct Answers</p>
            <p className="text-xl font-bold text-slate-900">
              {stats?.total_correct_answers || 0} / {stats?.total_questions_answered || 0}
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-indigo-500"
                style={{ width: `${stats?.total_questions_answered ? (stats.total_correct_answers / stats.total_questions_answered) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="card p-5">
            <p className="text-xs text-slate-500 mb-1">Best Score</p>
            <p className="text-xl font-bold text-slate-900">{stats?.best_score || 0}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-slate-500 mb-1">Accuracy Rate</p>
            <p className="text-xl font-bold text-slate-900">
              {stats?.total_questions_answered
                ? Math.round((stats.total_correct_answers / stats.total_questions_answered) * 100)
                : 0}%
            </p>
          </div>
        </div>

        {/* Missions */}
        {missions.length > 0 && (
          <div className="card mb-6 p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-slate-900">
              <Target className="h-5 w-5 text-indigo-600" /> Daily Missions
            </h2>
            <div className="space-y-3">
              {missions.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.completed ? 'bg-green-100' : 'bg-slate-100'}`}>
                    {m.completed ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Target className="h-4 w-4 text-slate-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{m.description}</p>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="badge bg-amber-100 text-amber-700"><Zap className="h-3 w-3" />{m.xp_reward}</span>
                    <span className="badge bg-yellow-100 text-yellow-700"><Coins className="h-3 w-3" />{m.coins_reward}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        <div className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
              <Award className="h-5 w-5 text-indigo-600" /> Achievements
            </h2>
            <span className="text-sm text-slate-500">{earnedAchievements.length} / {achievements.length} earned</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((a) => (
              <div key={a.id}
                className={`rounded-xl border-2 p-4 transition-all ${a.earned ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white opacity-60'}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.earned ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm' : 'bg-slate-200'}`}>
                    <Award className={`h-5 w-5 ${a.earned ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{a.name}</p>
                    <p className="text-xs text-slate-500">{a.description}</p>
                  </div>
                </div>
                {a.earned ? (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                    <CheckCircle2 className="h-3 w-3" /> Earned
                  </span>
                ) : (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                    <Zap className="h-3 w-3" /> +{a.xp_reward} XP reward
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link to="/dashboard" className="btn-primary">
            <TrendingUp className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
  );
}
