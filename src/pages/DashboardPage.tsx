import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Gamepad2,
  Trophy,
  Upload,
  ArrowRight,
  Trash2,
  Loader2,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Zap,
  Coins,
  Flame,
  RotateCw,
} from 'lucide-react';
import { getDocuments, getRecentSessions, deleteDocument, getUserStats } from '@/lib/db';
import type { DocumentRow, GameSessionRow } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface DashboardData {
  documents: DocumentRow[];
  sessions: GameSessionRow[];
  stats: any;
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    const [documents, sessions, statsData] = await Promise.all([
      getDocuments(),
      getRecentSessions(8),
      getUserStats(),
    ]);
    setData({ documents, sessions, stats: statsData.stats });
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    load();
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const docs = data?.documents ?? [];
  const sessions = data?.sessions ?? [];
  const totalGames = docs.reduce((sum, d) => sum + (d.analysis?.concepts?.length ?? 0), 0);
  const avgScore = sessions.length
    ? Math.round(
        sessions.reduce((sum, s) => sum + (s.max_score ? (s.score / s.max_score) * 100 : 0), 0) /
          sessions.length,
      )
    : 0;

  const userStats = data?.stats;

  const statCards = [
    {
      icon: BookOpen,
      label: 'Total Documents',
      value: docs.length,
      bg: 'bg-indigo-50',
      text: 'text-indigo-600',
    },
    {
      icon: Gamepad2,
      label: 'Games Played',
      value: data?.stats?.total_games_played || sessions.length,
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
    },
    {
      icon: Trophy,
      label: 'Average Score',
      value: `${avgScore}%`,
      bg: 'bg-amber-50',
      text: 'text-amber-600',
    },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Learning Dashboard</h2>
          <p className="text-sm text-slate-500">Welcome back! Here is an overview of your study activities.</p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-sm flex items-center space-x-2 transition-colors"
        >
          <RotateCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Stats</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
              <div className={`w-12 h-12 ${stat.bg} ${stat.text} rounded-xl flex items-center justify-center text-xl`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gamification bar */}
      {userStats && (userStats.total_xp > 0 || userStats.streak_days > 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="flex flex-wrap items-center gap-6 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{userStats.total_xp.toLocaleString()} XP</p>
                <p className="text-xs text-slate-500">Level {userStats.level}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow-sm">
                <Coins className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{userStats.coins.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Coins</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-red-500 shadow-sm">
                <Flame className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">{userStats.streak_days} days</p>
                <p className="text-xs text-slate-500">Streak</p>
              </div>
            </div>
            <Link to="/progress" className="ml-auto btn-secondary text-sm">
              <Trophy className="h-4 w-4" /> View Progress
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Document library */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Your Library</h2>
            <Link to="/upload" className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-colors">
              <Upload className="h-3.5 w-3.5" />
              <span>Upload New Book</span>
            </Link>
          </div>

          {docs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-12 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <BookOpen className="h-7 w-7 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No documents yet</h3>
              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Upload your first PDF to start turning it into interactive learning games.
              </p>
              <Link to="/upload" className="btn-primary mt-5">
                <Upload className="h-4 w-4" />
                Upload a PDF
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm group flex items-center gap-4 p-4 hover:border-indigo-300 transition-all"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <Link to={`/document/${doc.id}`} className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-slate-900 group-hover:text-indigo-700">
                      {doc.title}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{doc.page_count} pages</span>
                      <span>{doc.word_count.toLocaleString()} words</span>
                      {doc.difficulty && (
                        <span className="badge bg-indigo-100 text-indigo-700">
                          {doc.difficulty}
                        </span>
                      )}
                      <span>
                        {formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1">
                    {doc.status === 'processing' && (
                      <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                    )}
                    {doc.status === 'analyzed' && (
                      <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                    )}
                    {doc.status === 'failed' && (
                      <AlertCircle className="h-4 w-4 text-rose-500" />
                    )}
                    <Link
                      to={`/document/${doc.id}`}
                      className="btn-ghost"
                      aria-label="Open document"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="btn-ghost text-slate-400 hover:text-rose-600"
                      aria-label="Delete document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div>
          <h2 className="mb-4 text-xl font-bold text-slate-900">Recent Activity</h2>
          {sessions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <Clock className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">
                No game sessions yet. Play a game to see your activity here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const doc = docs.find((d) => d.id === session.document_id);
                const pct = session.max_score
                  ? Math.round((session.score / session.max_score) * 100)
                  : 0;
                return (
                  <div key={session.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {doc?.title ?? 'Unknown document'}
                      </p>
                      {session.completed ? (
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-indigo-500" />
                      ) : (
                        <Clock className="h-4 w-4 flex-shrink-0 text-amber-500" />
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      <span>{session.correct}/{session.total} correct</span>
                      <span>{pct}%</span>
                      <span>
                        {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 70 ? 'bg-indigo-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
