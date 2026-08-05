import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Gamepad2,
  Clock,
  TrendingUp,
  Upload,
  ArrowRight,
  Trash2,
  Loader2,
  BookOpen,
  Trophy,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { getDocuments, getRecentSessions, deleteDocument } from '@/lib/db';
import type { DocumentRow, GameSessionRow } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface DashboardData {
  documents: DocumentRow[];
  sessions: GameSessionRow[];
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [documents, sessions] = await Promise.all([
      getDocuments(),
      getRecentSessions(8),
    ]);
    setData({ documents, sessions });
    setLoading(false);
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
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </div>
    );
  }

  const docs = data?.documents ?? [];
  const sessions = data?.sessions ?? [];
  const totalGames = docs.reduce((sum, d) => sum + (d.analysis?.concepts?.length ?? 0), 0);
  const completedSessions = sessions.filter((s) => s.completed).length;
  const avgScore = sessions.length
    ? Math.round(
        sessions.reduce((sum, s) => sum + (s.max_score ? (s.score / s.max_score) * 100 : 0), 0) /
          sessions.length,
      )
    : 0;

  const stats = [
    {
      icon: FileText,
      label: 'Uploaded PDFs',
      value: docs.length,
      color: 'from-teal-500 to-emerald-500',
    },
    {
      icon: Gamepad2,
      label: 'Concepts Found',
      value: totalGames,
      color: 'from-amber-500 to-orange-500',
    },
    {
      icon: Trophy,
      label: 'Games Played',
      value: sessions.length,
      color: 'from-sky-500 to-blue-500',
    },
    {
      icon: TrendingUp,
      label: 'Avg. Score',
      value: `${avgScore}%`,
      color: 'from-rose-500 to-pink-500',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="mt-1 text-slate-600">
              Your uploaded documents, generated games, and learning progress.
            </p>
          </div>
          <Link to="/upload" className="btn-primary">
            <Upload className="h-4 w-4" />
            Upload New PDF
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="card p-5">
                <div
                  className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${stat.color} shadow-sm`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="font-display text-2xl font-bold text-slate-900">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Document library */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-slate-900">
                Your Library
              </h2>
              <span className="text-sm text-slate-500">{docs.length} documents</span>
            </div>

            {docs.length === 0 ? (
              <div className="card flex flex-col items-center justify-center p-12 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <BookOpen className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="font-display text-lg font-bold text-slate-900">
                  No documents yet
                </h3>
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
                    className="card group flex items-center gap-4 p-4"
                  >
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-sm">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <Link to={`/document/${doc.id}`} className="flex-1 min-w-0">
                      <p className="truncate font-semibold text-slate-900 group-hover:text-teal-700">
                        {doc.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>{doc.page_count} pages</span>
                        <span>{doc.word_count.toLocaleString()} words</span>
                        {doc.difficulty && (
                          <span className="badge bg-teal-100 text-teal-700">
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
                        <CheckCircle2 className="h-4 w-4 text-teal-500" />
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
            <h2 className="mb-4 font-display text-xl font-bold text-slate-900">
              Recent Activity
            </h2>
            {sessions.length === 0 ? (
              <div className="card flex flex-col items-center justify-center p-8 text-center">
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
                    <div key={session.id} className="card p-4">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {doc?.title ?? 'Unknown document'}
                        </p>
                        {session.completed ? (
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-teal-500" />
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
                            pct >= 70 ? 'bg-teal-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'
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
    </div>
  );
}
