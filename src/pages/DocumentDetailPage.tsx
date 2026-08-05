import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  Loader2,
  Sparkles,
  Brain,
  Tag,
  Layers,
  Clock,
  BookOpen,
  GraduationCap,
  Gauge,
  Download,
  Trash2,
  Play,
  Gamepad2,
  AlertCircle,
  CheckCircle2,
  FileJson,
  FileType,
  Target,
  Globe,
  Grid3x3,
  Shuffle,
  ListOrdered,
  MessageCircle,
  Send,
  User,
  Bot,
  Cpu,
  ChevronDown,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { getDocument, getGames, createGame, deleteDocument } from '@/lib/db';
import { generateContentWithAI, type LearningMode } from '@/lib/contentGenerator';
import { askTeacher, type ChatMessage } from '@/lib/aiTeacher';
import { exportJSON, exportAnalysisPDF, exportGamePDF, exportGameDOCX } from '@/lib/export';
import type { DocumentRow, GameRow, GameType, GameConfig } from '@/lib/types';
import { GAME_LABELS, GAME_DESCRIPTIONS } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

type Tab = 'summary' | 'games' | 'teacher';

const gameTypes: GameType[] = [
  'quiz',
  'flashcards',
  'matching',
  'wordsearch',
  'unscramble',
  'hangman',
  'memory',
  'sequence',
  'crossword',
];

const gameIcons: Record<GameType, typeof FileText> = {
  quiz: Target,
  flashcards: Layers,
  matching: Brain,
  wordsearch: Grid3x3,
  unscramble: Shuffle,
  hangman: Gamepad2,
  memory: Brain,
  sequence: ListOrdered,
  crossword: Grid3x3,
};

const quizCounts = [10, 20, 50, 100];
const difficultyLevels: ('Beginner' | 'Intermediate' | 'Advanced')[] = ['Beginner', 'Intermediate', 'Advanced'];
const learningModes: { value: LearningMode; label: string; icon: typeof User }[] = [
  { value: 'child', label: 'Kids', icon: BookOpen },
  { value: 'student', label: 'Student', icon: GraduationCap },
  { value: 'professional', label: 'Pro', icon: Cpu },
];

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('summary');
  const [generating, setGenerating] = useState<GameType | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [quizCount, setQuizCount] = useState(10);
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [learningMode, setLearningMode] = useState<LearningMode>('student');
  const [exportMenu, setExportMenu] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [d, g] = await Promise.all([getDocument(id), getGames(id)]);
    setDoc(d);
    setGames(g);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleGenerate = async (type: GameType) => {
    if (!doc?.analysis) return;
    setGenerating(type);
    setGenError(null);
    try {
      const config: GameConfig = {
        questionCount: type === 'quiz' ? quizCount : undefined,
        difficulty,
        learningMode,
      };
      const content = await generateContentWithAI({
        contentType: type,
        analysis: doc.analysis,
        config,
      });
      const game = await createGame(
        doc.id,
        type,
        `${GAME_LABELS[type]} — ${doc.title}`,
        config,
        content,
      );
      if (game) {
        setGames((prev) => [game, ...prev]);
        navigate(`/document/${doc.id}/play/${game.id}`);
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Failed to generate content.');
    } finally {
      setGenerating(null);
    }
  };

  const handleDelete = async () => {
    if (!doc) return;
    await deleteDocument(doc.id);
    navigate('/dashboard');
  };

  const handleExportAnalysis = (format: 'json' | 'pdf') => {
    if (!doc?.analysis) return;
    if (format === 'json') exportJSON(doc.analysis, `${doc.title}-analysis.json`);
    else exportAnalysisPDF(doc.analysis, doc.title);
    setExportMenu(null);
  };

  const handleExportGame = async (game: GameRow, format: 'json' | 'pdf' | 'docx') => {
    if (format === 'json') exportJSON(game.content, `${doc?.title}-${game.type}.json`);
    else if (format === 'pdf') exportGamePDF(game.type, game.content, doc?.title ?? 'document');
    else await exportGameDOCX(game.type, game.content, doc?.title ?? 'document');
    setExportMenu(null);
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

  if (!doc) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-rose-400" />
          <h1 className="font-display text-2xl font-bold text-slate-900">Document not found</h1>
          <Link to="/dashboard" className="btn-primary mt-6">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const analysis = doc.analysis;
  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: 'summary', label: 'Summary', icon: Sparkles },
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'teacher', label: 'AI Teacher', icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-teal-600">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {/* Document header */}
        <div className="card mb-6 overflow-hidden">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-md">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">{doc.title}</h1>
              <p className="mt-1 text-sm text-slate-500">{doc.file_name}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {analysis && (
                  <>
                    <span className="badge bg-teal-100 text-teal-700"><Gauge className="h-3 w-3" />{analysis.difficulty}</span>
                    <span className="badge bg-amber-100 text-amber-700"><GraduationCap className="h-3 w-3" />{analysis.estimatedAge}</span>
                    <span className="badge bg-sky-100 text-sky-700"><BookOpen className="h-3 w-3" />{analysis.stats.pages} pages</span>
                    <span className="badge bg-slate-100 text-slate-700">{analysis.stats.words.toLocaleString()} words</span>
                    <span className="badge bg-violet-100 text-violet-700"><Globe className="h-3 w-3" />{analysis.language}</span>
                  </>
                )}
                <span className="badge bg-slate-100 text-slate-500"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {analysis && (
                <div className="relative">
                  <button onClick={() => setExportMenu(exportMenu === 'analysis' ? null : 'analysis')} className="btn-secondary">
                    <Download className="h-4 w-4" /> Export
                  </button>
                  {exportMenu === 'analysis' && (
                    <div className="absolute right-0 z-10 mt-2 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                      <button onClick={() => handleExportAnalysis('json')} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <FileJson className="h-4 w-4 text-amber-500" /> Analysis (JSON)
                      </button>
                      <button onClick={() => handleExportAnalysis('pdf')} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <FileType className="h-4 w-4 text-rose-500" /> Analysis (PDF)
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button onClick={handleDelete} className="btn-ghost text-slate-400 hover:text-rose-600" aria-label="Delete document">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          {doc.status === 'processing' && (
            <div className="flex items-center gap-2 border-t border-slate-100 bg-amber-50 px-6 py-3 text-sm text-amber-700">
              <Loader2 className="h-4 w-4 animate-spin" /> This document is still being processed…
            </div>
          )}
          {doc.status === 'failed' && (
            <div className="flex items-center gap-2 border-t border-slate-100 bg-rose-50 px-6 py-3 text-sm text-rose-700">
              <AlertCircle className="h-4 w-4" /> Processing failed for this document.
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                  tab === t.id ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" /> {t.label}
                {t.id === 'games' && games.length > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-xs ${tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    {games.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Summary Tab */}
        {tab === 'summary' && analysis && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="card p-6 lg:col-span-2">
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                <Sparkles className="h-5 w-5 text-teal-600" /> Document Summary
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">{analysis.summary}</p>

              <h3 className="mb-3 mt-6 flex items-center gap-2 font-display text-base font-bold text-slate-900">
                <Layers className="h-4 w-4 text-teal-600" /> Structure ({analysis.chapters.length} sections)
              </h3>
              <div className="space-y-1.5">
                {analysis.chapters.slice(0, 12).map((ch, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="badge bg-teal-100 text-teal-700">Ch {ch.page}</span>
                    <span className="truncate text-slate-700">{ch.heading}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                <Brain className="h-5 w-5 text-teal-600" /> Key Concepts
              </h2>
              <div className="space-y-2">
                {analysis.concepts.slice(0, 8).map((c, i) => (
                  <div key={i} className="rounded-lg border border-slate-100 p-3">
                    <p className="text-sm font-semibold text-slate-900">{c.term}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{c.definition}</p>
                  </div>
                ))}
              </div>

              {analysis.learning_objectives && analysis.learning_objectives.length > 0 && (
                <>
                  <h3 className="mb-2 mt-5 flex items-center gap-2 font-display text-sm font-bold text-slate-900">
                    <Target className="h-4 w-4 text-teal-600" /> Learning Objectives
                  </h3>
                  <ul className="space-y-1.5">
                    {analysis.learning_objectives.slice(0, 6).map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-teal-500" />{obj}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <h3 className="mb-2 mt-5 flex items-center gap-2 font-display text-sm font-bold text-slate-900">
                <Tag className="h-4 w-4 text-teal-600" /> Keywords
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {analysis.keywords.slice(0, 20).map((kw, i) => (
                  <span key={i} className="badge bg-slate-100 text-slate-600">{kw}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Games Tab */}
        {tab === 'games' && analysis && (
          <div>
            {genError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {genError}
              </div>
            )}

            {/* Config bar */}
            <div className="card mb-6 p-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Quiz length:</span>
                  <div className="flex gap-1">
                    {quizCounts.map((n) => (
                      <button key={n} onClick={() => setQuizCount(n)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${quizCount === n ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {n} Q
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Difficulty:</span>
                  <div className="flex gap-1">
                    {difficultyLevels.map((d) => (
                      <button key={d} onClick={() => setDifficulty(d)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${difficulty === d ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Mode:</span>
                  <div className="flex gap-1">
                    {learningModes.map((m) => {
                      const Icon = m.icon;
                      return (
                        <button key={m.value} onClick={() => setLearningMode(m.value)}
                          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${learningMode === m.value ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                          <Icon className="h-3.5 w-3.5" /> {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Game grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gameTypes.map((type) => {
                const Icon = gameIcons[type];
                const isGenerating = generating === type;
                return (
                  <button key={type} onClick={() => handleGenerate(type)} disabled={!!generating}
                    className="group relative flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-teal-300 hover:shadow-md disabled:opacity-50">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-sm transition-transform group-hover:scale-110">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900">{GAME_LABELS[type]}</h3>
                      <p className="mt-0.5 text-xs text-slate-500">{GAME_DESCRIPTIONS[type]}</p>
                    </div>
                    {isGenerating ? (
                      <div className="absolute right-4 top-4 flex items-center gap-1.5 text-xs font-medium text-teal-600">
                        <Loader2 className="h-4 w-4 animate-spin" /> AI
                      </div>
                    ) : (
                      <Play className="absolute right-4 top-4 h-4 w-4 text-slate-300 transition-colors group-hover:text-teal-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Generated games */}
            {games.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-slate-900">
                  <CheckCircle2 className="h-5 w-5 text-teal-600" /> Generated Games ({games.length})
                </h2>
                <div className="space-y-3">
                  {games.map((game) => {
                    const Icon = gameIcons[game.type];
                    return (
                      <div key={game.id} className="card group flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-sm">
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-semibold text-slate-900">{game.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {GAME_LABELS[game.type]} · {formatDistanceToNow(new Date(game.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="relative flex items-center gap-1">
                          <button onClick={() => setExportMenu(exportMenu === game.id ? null : game.id)} className="btn-ghost" aria-label="Export game">
                            <Download className="h-4 w-4" />
                          </button>
                          {exportMenu === game.id && (
                            <div className="absolute right-0 top-full z-10 mt-2 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                              <button onClick={() => handleExportGame(game, 'json')} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                <FileJson className="h-4 w-4 text-amber-500" /> Export JSON
                              </button>
                              <button onClick={() => handleExportGame(game, 'pdf')} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                <FileType className="h-4 w-4 text-rose-500" /> Export PDF
                              </button>
                              <button onClick={() => handleExportGame(game, 'docx')} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                <FileText className="h-4 w-4 text-sky-500" /> Export DOCX
                              </button>
                            </div>
                          )}
                          <Link to={`/document/${doc.id}/play/${game.id}`} className="btn-primary">
                            <Play className="h-4 w-4" /> Play
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Teacher Tab */}
        {tab === 'teacher' && (
          <TeacherChat
            documentText={doc.raw_text || doc.analysis?.summary || ''}
            documentTitle={doc.title}
            documentLanguage={doc.analysis?.language || 'English'}
          />
        )}
      </div>
    </div>
  );
}

// ─── AI Teacher Chat Component ───

function TeacherChat({ documentText, documentTitle, documentLanguage }: {
  documentText: string;
  documentTitle: string;
  documentLanguage: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<LearningMode>('student');
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    'Explain the main concept of this document',
    'Give me a summary of the key points',
    'What are the most important terms to remember?',
    'Create a simple analogy for the main topic',
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (question: string) => {
    if (!question.trim() || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: question.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const answer = await askTeacher({
        documentText,
        documentTitle,
        question: question.trim(),
        mode,
        history: messages,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get a response.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card flex flex-col" style={{ height: '70vh' }}>
      {/* Mode selector */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Bot className="h-5 w-5 text-teal-600" />
        <span className="text-sm font-semibold text-slate-700">AI Teacher</span>
        <div className="ml-auto flex gap-1">
          {learningModes.map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.value} onClick={() => setMode(m.value)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${mode === m.value ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <Icon className="h-3.5 w-3.5" /> {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-md">
              <MessageCircle className="h-7 w-7 text-white" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900">Ask AI Teacher</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Ask any question about this document. The AI teacher will explain concepts, provide examples, and help you learn.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => handleSend(s)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-sm text-slate-600 transition-all hover:border-teal-300 hover:bg-teal-50/30 hover:text-teal-700">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${msg.role === 'user' ? 'bg-slate-200' : 'bg-gradient-to-br from-teal-500 to-emerald-600'}`}>
              {msg.role === 'user' ? <User className="h-4 w-4 text-slate-600" /> : <Bot className="h-4 w-4 text-white" />}
            </div>
            <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="mb-4 flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
              <span className="text-sm text-slate-500">Thinking…</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(input);
              }
            }}
            placeholder="Ask a question about this document…"
            rows={1}
            className="input-field resize-none"
            disabled={loading}
          />
          <button onClick={() => handleSend(input)} disabled={loading || !input.trim()} className="btn-primary flex-shrink-0">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
