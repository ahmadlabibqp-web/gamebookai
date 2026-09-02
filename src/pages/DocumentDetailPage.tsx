import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  FileText, ArrowLeft, Loader2, Sparkles, Brain, Tag, Layers, Clock,
  BookOpen, GraduationCap, Gauge, Download, Trash2, Play, Gamepad2,
  AlertCircle, CheckCircle2, FileJson, FileType, Target, Globe,
  Grid3x3, Shuffle, ListOrdered, MessageCircle, Send, User, Bot,
  Cpu, Network, Calendar, TrendingUp, Award, Flame, Coins, Zap,
  FileSpreadsheet, Printer, Baby, UserRound, Briefcase, Presentation,
} from 'lucide-react';
import {
  getDocument, getGames, createGame, deleteDocument, saveConcepts,
  getLearningPaths, getUserStats, getRecommendations, getMissions, getAchievements,
} from '@/lib/db';
import { generateContentWithAI } from '@/lib/contentGenerator';
import { generateLearningPath } from '@/lib/learningPath';
import { askTeacher, type ChatMessage } from '@/lib/aiTeacher';
import { exportJSON, exportAnalysisPDF, exportGamePDF, exportGameDOCX, exportCSV, exportPrint } from '@/lib/export';
import type { DocumentRow, GameRow, GameType, GameConfig, BloomLevel, TeacherMode, Difficulty } from '@/lib/types';
import { GAME_LABELS, GAME_DESCRIPTIONS, BLOOM_LABELS, TEACHER_MODE_LABELS } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

type Tab = 'summary' | 'games' | 'teacher' | 'knowledge' | 'learning' | 'progress';

const gameTypes: GameType[] = [
  'quiz', 'flashcards', 'matching', 'wordsearch', 'unscramble',
  'hangman', 'memory', 'sequence', 'crossword', 'timeline', 'sorting', 'conceptmap',
];

const gameIcons: Record<GameType, typeof FileText> = {
  quiz: Target, flashcards: Layers, matching: Brain, wordsearch: Grid3x3,
  unscramble: Shuffle, hangman: Gamepad2, memory: Brain, sequence: ListOrdered,
  crossword: Grid3x3, timeline: Clock, sorting: Shuffle, conceptmap: Network,
};

const quizCounts = [10, 20, 50, 100];
const difficultyLevels: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced'];
const bloomLevels: BloomLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
const teacherModes: { value: TeacherMode; label: string; icon: typeof User }[] = [
  { value: 'eli6', label: "I'm 6", icon: Baby },
  { value: 'eli12', label: "I'm 12", icon: UserRound },
  { value: 'highschool', label: 'High School', icon: GraduationCap },
  { value: 'university', label: 'University', icon: BookOpen },
  { value: 'professional', label: 'Pro', icon: Briefcase },
  { value: 'teacher', label: 'Teacher', icon: Presentation },
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
  const [difficulty, setDifficulty] = useState<Difficulty>('Intermediate');
  const [bloomLevel, setBloomLevel] = useState<BloomLevel | ''>('');
  const [exportMenu, setExportMenu] = useState<string | null>(null);
  const [learningPaths, setLearningPaths] = useState<any[]>([]);
  const [generatingPath, setGeneratingPath] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [missions, setMissions] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [d, g, paths, statsData, missionsData, achievementsData] = await Promise.all([
      getDocument(id), getGames(id), getLearningPaths(id),
      getUserStats(), getMissions(), getAchievements(),
    ]);
    setDoc(d);
    setGames(g);
    setLearningPaths(paths);
    setStats(statsData.stats);
    setMissions(missionsData);
    setAchievements(achievementsData);
    if (d?.analysis) {
      saveConcepts(d.id, d.analysis.concepts);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleGenerate = async (type: GameType) => {
    if (!doc?.analysis) return;
    setGenerating(type);
    setGenError(null);
    try {
      const config: GameConfig = {
        questionCount: type === 'quiz' ? quizCount : undefined,
        difficulty,
        bloomLevel: bloomLevel || undefined,
      };
      const content = await generateContentWithAI({ contentType: type, analysis: doc.analysis, config });
      const game = await createGame(doc.id, type, `${GAME_LABELS[type]} — ${doc.title}`, config, content);
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

  const handleExportAnalysis = (format: 'json' | 'pdf' | 'csv' | 'print') => {
    if (!doc?.analysis) return;
    if (format === 'json') exportJSON(doc.analysis, `${doc.title}-analysis.json`);
    else if (format === 'pdf') exportAnalysisPDF(doc.analysis, doc.title);
    else if (format === 'csv') {
      exportCSV(doc.analysis.concepts.map(c => ({ term: c.term, definition: c.definition, type: c.type || 'concept' })), `${doc.title}-concepts.csv`);
    } else if (format === 'print') {
      const html = `<h1>${doc.title}</h1><p>${doc.analysis.summary}</p><h2>Key Concepts</h2>${doc.analysis.concepts.map(c => `<div class="concept"><strong>${c.term}</strong>: ${c.definition}</div>`).join('')}`;
      exportPrint(doc.title, html);
    }
    setExportMenu(null);
  };

  const handleExportGame = async (game: GameRow, format: 'json' | 'pdf' | 'docx' | 'csv') => {
    if (format === 'json') exportJSON(game.content, `${doc?.title}-${game.type}.json`);
    else if (format === 'pdf') exportGamePDF(game.type, game.content, doc?.title ?? 'document');
    else if (format === 'docx') await exportGameDOCX(game.type, game.content, doc?.title ?? 'document');
    else if (format === 'csv') {
      const content = game.content as any;
      if (content.questions) exportCSV(content.questions, `${doc?.title}-${game.type}.csv`);
      else if (content.cards) exportCSV(content.cards, `${doc?.title}-${game.type}.csv`);
      else exportCSV([content], `${doc?.title}-${game.type}.csv`);
    }
    setExportMenu(null);
  };

  const handleGeneratePath = async (type: 'daily' | 'weekly' | 'roadmap') => {
    if (!doc?.analysis) return;
    setGeneratingPath(true);
    try {
      await generateLearningPath(doc.analysis, type, doc.id);
      const paths = await getLearningPaths(doc.id);
      setLearningPaths(paths);
    } catch (err) {
      console.error('Failed to generate learning path:', err);
    } finally {
      setGeneratingPath(false);
    }
  };

  const loadRecommendations = async () => {
    if (!doc?.analysis) return;
    const recs = await getRecommendations(doc.analysis);
    setRecommendations(recs);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="min-h-screen bg-slate-50">
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
    { id: 'knowledge', label: 'Knowledge Graph', icon: Network },
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'learning', label: 'Learning Path', icon: Calendar },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'teacher', label: 'AI Teacher', icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {/* Document header */}
        <div className="card mb-6 overflow-hidden">
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">{doc.title}</h1>
              {analysis?.subtitle && <p className="mt-0.5 text-sm text-slate-500">{analysis.subtitle}</p>}
              <p className="mt-1 text-xs text-slate-400">{doc.file_name}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {analysis && (
                  <>
                    <span className="badge bg-indigo-100 text-indigo-700"><Gauge className="h-3 w-3" />{analysis.difficulty}</span>
                    <span className="badge bg-amber-100 text-amber-700"><GraduationCap className="h-3 w-3" />{analysis.estimatedAge}</span>
                    <span className="badge bg-sky-100 text-sky-700"><BookOpen className="h-3 w-3" />{analysis.stats.pages} pages</span>
                    <span className="badge bg-slate-100 text-slate-700">{analysis.stats.words.toLocaleString()} words</span>
                    <span className="badge bg-violet-100 text-violet-700"><Globe className="h-3 w-3" />{analysis.language}</span>
                    {analysis.estimated_study_time && (
                      <span className="badge bg-indigo-100 text-indigo-700"><Clock className="h-3 w-3" />{analysis.estimated_study_time} min study</span>
                    )}
                    {analysis.concept_count && (
                      <span className="badge bg-emerald-100 text-indigo-700"><Brain className="h-3 w-3" />{analysis.concept_count} concepts</span>
                    )}
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
                    <div className="absolute right-0 z-10 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                      <button onClick={() => handleExportAnalysis('json')} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <FileJson className="h-4 w-4 text-amber-500" /> Analysis (JSON)
                      </button>
                      <button onClick={() => handleExportAnalysis('pdf')} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <FileType className="h-4 w-4 text-rose-500" /> Analysis (PDF)
                      </button>
                      <button onClick={() => handleExportAnalysis('csv')} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <FileSpreadsheet className="h-4 w-4 text-green-500" /> Concepts (CSV)
                      </button>
                      <button onClick={() => handleExportAnalysis('print')} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <Printer className="h-4 w-4 text-slate-500" /> Print Version
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
        <div className="mb-6 flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all min-w-fit ${
                  tab === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}>
                <Icon className="h-4 w-4" /> <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.split(' ')[0]}</span>
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
          <div className="space-y-6">
            {/* Multiple summaries */}
            <div className="grid gap-4 lg:grid-cols-2">
              {analysis.executive_summary && (
                <div className="card p-5">
                  <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-slate-900">
                    <Sparkles className="h-4 w-4 text-indigo-600" /> Executive Summary
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-600">{analysis.executive_summary}</p>
                </div>
              )}
              {analysis.beginner_summary && (
                <div className="card p-5">
                  <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-slate-900">
                    <Baby className="h-4 w-4 text-amber-500" /> Beginner Summary
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-600">{analysis.beginner_summary}</p>
                </div>
              )}
              {analysis.student_summary && (
                <div className="card p-5">
                  <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-slate-900">
                    <GraduationCap className="h-4 w-4 text-sky-500" /> Student Summary
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-600">{analysis.student_summary}</p>
                </div>
              )}
              {analysis.teacher_summary && (
                <div className="card p-5">
                  <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-slate-900">
                    <Presentation className="h-4 w-4 text-violet-500" /> Teacher Summary
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-600">{analysis.teacher_summary}</p>
                </div>
              )}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="card p-6 lg:col-span-2">
                <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                  <Sparkles className="h-5 w-5 text-indigo-600" /> Document Summary
                </h2>
                <p className="text-sm leading-relaxed text-slate-600">{analysis.summary}</p>

                <h3 className="mb-3 mt-6 flex items-center gap-2 font-display text-base font-bold text-slate-900">
                  <Layers className="h-4 w-4 text-indigo-600" /> Structure ({analysis.chapters.length} sections)
                </h3>
                <div className="space-y-1.5">
                  {analysis.chapters.slice(0, 12).map((ch, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="badge bg-indigo-100 text-indigo-700">Ch {ch.page}</span>
                      <span className="truncate text-slate-700">{ch.heading}</span>
                    </div>
                  ))}
                </div>

                {analysis.important_people && analysis.important_people.length > 0 && (
                  <>
                    <h3 className="mb-3 mt-6 flex items-center gap-2 font-display text-base font-bold text-slate-900">
                      <User className="h-4 w-4 text-indigo-600" /> Important People
                    </h3>
                    <div className="space-y-2">
                      {analysis.important_people.slice(0, 8).map((p, i) => (
                        <div key={i} className="rounded-lg border border-slate-100 p-3">
                          <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.role} — {p.description}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {analysis.dates && analysis.dates.length > 0 && (
                  <>
                    <h3 className="mb-3 mt-6 flex items-center gap-2 font-display text-base font-bold text-slate-900">
                      <Clock className="h-4 w-4 text-indigo-600" /> Important Dates
                    </h3>
                    <div className="space-y-1.5">
                      {analysis.dates.slice(0, 8).map((d, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <span className="badge bg-indigo-100 text-indigo-700">{d.date}</span>
                          <span className="text-slate-700">{d.event}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {analysis.formulas && analysis.formulas.length > 0 && (
                  <>
                    <h3 className="mb-3 mt-6 flex items-center gap-2 font-display text-base font-bold text-slate-900">
                      <Zap className="h-4 w-4 text-indigo-600" /> Formulas
                    </h3>
                    <div className="space-y-2">
                      {analysis.formulas.slice(0, 6).map((f, i) => (
                        <div key={i} className="rounded-lg bg-slate-50 p-3 font-mono text-sm">
                          <span className="font-bold text-slate-900">{f.formula}</span>
                          <p className="mt-1 text-xs text-slate-500">{f.description}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {analysis.cause_effect && analysis.cause_effect.length > 0 && (
                  <>
                    <h3 className="mb-3 mt-6 flex items-center gap-2 font-display text-base font-bold text-slate-900">
                      <TrendingUp className="h-4 w-4 text-indigo-600" /> Cause & Effect
                    </h3>
                    <div className="space-y-2">
                      {analysis.cause_effect.slice(0, 6).map((ce, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="rounded-lg bg-rose-50 px-3 py-1.5 text-rose-700">{ce.cause}</span>
                          <span className="text-slate-400">→</span>
                          <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-indigo-700">{ce.effect}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="card p-6">
                <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                  <Brain className="h-5 w-5 text-indigo-600" /> Key Concepts
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
                      <Target className="h-4 w-4 text-indigo-600" /> Learning Objectives
                    </h3>
                    <ul className="space-y-1.5">
                      {analysis.learning_objectives.slice(0, 6).map((obj, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-indigo-500" />{obj}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                <h3 className="mb-2 mt-5 flex items-center gap-2 font-display text-sm font-bold text-slate-900">
                  <Tag className="h-4 w-4 text-indigo-600" /> Keywords
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.keywords.slice(0, 20).map((kw, i) => (
                    <span key={i} className="badge bg-slate-100 text-slate-600">{kw}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Knowledge Graph Tab */}
        {tab === 'knowledge' && analysis?.knowledge_graph && (
          <KnowledgeGraphView graph={analysis.knowledge_graph} />
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
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${quizCount === n ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
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
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${difficulty === d ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-700">Bloom's Level:</span>
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => setBloomLevel('')}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${bloomLevel === '' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                      All
                    </button>
                    {bloomLevels.map((b) => (
                      <button key={b} onClick={() => setBloomLevel(b)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${bloomLevel === b ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                        {BLOOM_LABELS[b]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Game grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {gameTypes.map((type) => {
                const Icon = gameIcons[type];
                const isGenerating = generating === type;
                return (
                  <button key={type} onClick={() => handleGenerate(type)} disabled={!!generating}
                    className="group relative flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all hover:border-indigo-300 hover:shadow-md disabled:opacity-50">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm transition-transform group-hover:scale-110">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900">{GAME_LABELS[type]}</h3>
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{GAME_DESCRIPTIONS[type]}</p>
                    </div>
                    {isGenerating ? (
                      <div className="absolute right-4 top-4 flex items-center gap-1.5 text-xs font-medium text-indigo-600">
                        <Loader2 className="h-4 w-4 animate-spin" /> AI
                      </div>
                    ) : (
                      <Play className="absolute right-4 top-4 h-4 w-4 text-slate-300 transition-colors group-hover:text-indigo-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Generated games */}
            {games.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold text-slate-900">
                  <CheckCircle2 className="h-5 w-5 text-indigo-600" /> Generated Games ({games.length})
                </h2>
                <div className="space-y-3">
                  {games.map((game) => {
                    const Icon = gameIcons[game.type as GameType] || Gamepad2;
                    return (
                      <div key={game.id} className="card group flex items-center gap-4 p-4">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm">
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-semibold text-slate-900">{game.title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {GAME_LABELS[game.type as GameType] || game.type} · {formatDistanceToNow(new Date(game.created_at), { addSuffix: true })}
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
                              <button onClick={() => handleExportGame(game, 'csv')} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                <FileSpreadsheet className="h-4 w-4 text-green-500" /> Export CSV
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

        {/* Learning Path Tab */}
        {tab === 'learning' && analysis && (
          <div>
            <div className="mb-6 flex flex-wrap gap-3">
              <button onClick={() => handleGeneratePath('daily')} disabled={generatingPath}
                className="btn-secondary">
                {generatingPath ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                Daily Plan
              </button>
              <button onClick={() => handleGeneratePath('weekly')} disabled={generatingPath}
                className="btn-secondary">
                <Calendar className="h-4 w-4" /> Weekly Plan
              </button>
              <button onClick={() => handleGeneratePath('roadmap')} disabled={generatingPath}
                className="btn-secondary">
                <TrendingUp className="h-4 w-4" /> Full Roadmap
              </button>
            </div>

            {learningPaths.length > 0 ? (
              <div className="space-y-6">
                {learningPaths.map((path) => (
                  <div key={path.id} className="card p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="font-display text-lg font-bold text-slate-900">{path.title}</h2>
                        <p className="text-sm text-slate-500">{path.description}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="badge bg-indigo-100 text-indigo-700 capitalize">{path.type}</span>
                        {path.estimated_completion_date && (
                          <span className="badge bg-indigo-100 text-indigo-700">
                            <Calendar className="h-3 w-3" /> {path.estimated_completion_date}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Progress</span>
                        <span>{Math.round(path.progress * 100)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all"
                          style={{ width: `${path.progress * 100}%` }} />
                      </div>
                    </div>

                    {/* Sessions */}
                    {path.data?.sessions && (
                      <div className="space-y-3">
                        {path.data.sessions.map((session: any, i: number) => (
                          <div key={i} className="rounded-xl border border-slate-200 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-sm text-slate-900">
                                Day {session.day}: {session.title}
                              </h3>
                              <span className="badge bg-slate-100 text-slate-600">
                                <Clock className="h-3 w-3" /> {session.duration_minutes} min
                              </span>
                            </div>
                            {session.objectives && (
                              <ul className="space-y-1 mb-2">
                                {session.objectives.map((obj: string, j: number) => (
                                  <li key={j} className="flex items-start gap-2 text-xs text-slate-600">
                                    <Target className="h-3 w-3 mt-0.5 text-indigo-500" /> {obj}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {session.activities && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {session.activities.map((act: string, j: number) => (
                                  <span key={j} className="badge bg-sky-50 text-sky-600 text-xs">{act}</span>
                                ))}
                              </div>
                            )}
                            {session.games && session.games.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {session.games.map((g: string, j: number) => (
                                  <span key={j} className="badge bg-indigo-50 text-indigo-600 text-xs">
                                    <Gamepad2 className="h-3 w-3" /> {g}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Milestones */}
                    {path.data?.milestones && path.data.milestones.length > 0 && (
                      <div className="mt-4">
                        <h3 className="mb-2 font-display text-sm font-bold text-slate-900">Milestones</h3>
                        <div className="space-y-2">
                          {path.data.milestones.map((m: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm">
                              <Award className="h-4 w-4 text-amber-500" />
                              <span className="font-medium text-slate-700">{m.title}</span>
                              <span className="text-xs text-slate-500">— Day {m.day}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="card p-12 text-center">
                <Calendar className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                <h3 className="font-display text-lg font-bold text-slate-900">No learning paths yet</h3>
                <p className="mt-1 text-sm text-slate-500">Generate a daily, weekly, or full roadmap study plan above.</p>
              </div>
            )}
          </div>
        )}

        {/* Progress Tab */}
        {tab === 'progress' && (
          <div className="space-y-6">
            {/* Gamification stats */}
            {stats && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="card p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{stats.total_xp.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">Total XP</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Level {stats.level}</span>
                      <span>{stats.total_xp % 1000} / 1000 XP</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                        style={{ width: `${(stats.total_xp % 1000) / 10}%` }} />
                    </div>
                  </div>
                </div>

                <div className="card p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow-sm">
                      <Coins className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{stats.coins.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">Coins</p>
                    </div>
                  </div>
                </div>

                <div className="card p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-red-500 shadow-sm">
                      <Flame className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900">{stats.streak_days}</p>
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
                      <p className="text-2xl font-bold text-slate-900">{stats.total_games_played}</p>
                      <p className="text-xs text-slate-500">Games Played</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Missions */}
            {missions.length > 0 && (
              <div className="card p-6">
                <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                  <Target className="h-5 w-5 text-indigo-600" /> Daily Missions
                </h2>
                <div className="space-y-3">
                  {missions.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.completed ? 'bg-green-100' : 'bg-slate-100'}`}>
                        {m.completed ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-slate-400" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-700">{m.description}</p>
                        <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }} />
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
            {achievements.length > 0 && (
              <div className="card p-6">
                <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                  <Award className="h-5 w-5 text-indigo-600" /> Achievements
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {achievements.map((a) => (
                    <div key={a.id} className={`rounded-xl border-2 p-4 ${a.earned ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white opacity-60'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.earned ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-slate-200'}`}>
                          <Award className={`h-5 w-5 ${a.earned ? 'text-white' : 'text-slate-400'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{a.name}</p>
                          <p className="text-xs text-slate-500">{a.description}</p>
                        </div>
                      </div>
                      {a.earned && (
                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                          <CheckCircle2 className="h-3 w-3" /> Earned
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Recommendations */}
            <div className="card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                  <Brain className="h-5 w-5 text-indigo-600" /> AI Recommendations
                </h2>
                <button onClick={loadRecommendations} className="btn-secondary text-sm">
                  <Sparkles className="h-4 w-4" /> Analyze My Progress
                </button>
              </div>
              {recommendations ? (
                <div className="space-y-4">
                  {recommendations.weak_topics?.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-slate-700">Weak Topics</h3>
                      <div className="flex flex-wrap gap-2">
                        {recommendations.weak_topics.map((t: string, i: number) => (
                          <span key={i} className="badge bg-rose-100 text-rose-700">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {recommendations.recommendations?.map((r: any, i: number) => (
                    <div key={i} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge capitalize ${r.priority === 'high' ? 'bg-rose-100 text-rose-700' : r.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {r.priority}
                        </span>
                        <span className="badge bg-indigo-100 text-indigo-700 capitalize">{r.type}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-700">{r.specific_content}</p>
                      <p className="text-xs text-slate-500 mt-1">{r.reason}</p>
                    </div>
                  ))}
                  {recommendations.next_steps?.length > 0 && (
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-slate-700">Next Steps</h3>
                      <ul className="space-y-1.5">
                        {recommendations.next_steps.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                            <CheckCircle2 className="h-4 w-4 mt-0.5 text-indigo-500" /> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-8">
                  Click "Analyze My Progress" to get personalized AI study recommendations based on your game performance.
                </p>
              )}
            </div>
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

// ─── Knowledge Graph View ─────────────────────────────────────────────────────

function KnowledgeGraphView({ graph }: { graph: any }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<any[]>([]);

  useEffect(() => {
    const w = containerRef.current?.clientWidth ?? 800;
    const h = Math.max(400, graph.nodes.length * 50);
    const center = graph.nodes.find((n: any) => n.type === 'central') || graph.nodes[0];
    const others = graph.nodes.filter((n: any) => n.id !== center?.id);
    const positioned: any[] = [];
    if (center) positioned.push({ ...center, x: w / 2, y: h / 2 });
    others.forEach((node: any, i: number) => {
      const angle = (i / others.length) * Math.PI * 2;
      const radius = Math.min(w, h) * 0.35;
      positioned.push({ ...node, x: w / 2 + Math.cos(angle) * radius, y: h / 2 + Math.sin(angle) * radius });
    });
    setNodes(positioned);
  }, [graph]);

  const getNode = (id: string) => nodes.find((n) => n.id === id);

  return (
    <div className="card p-6">
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-slate-900">
        <Network className="h-5 w-5 text-indigo-600" /> Knowledge Graph
      </h2>
      <p className="mb-4 text-sm text-slate-600">This semantic graph shows how key concepts in the document connect to each other.</p>

      <div ref={containerRef} className="relative w-full bg-slate-50 rounded-xl border-2 border-slate-200 overflow-hidden"
        style={{ height: Math.max(400, graph.nodes.length * 50) }}>
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {graph.edges.map((edge: any, i: number) => {
            const source = getNode(edge.source);
            const target = getNode(edge.target);
            if (!source || !target) return null;
            return (
              <g key={i}>
                <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="#6366f1" strokeWidth={2} />
                <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2} fill="#6366f1" fontSize={10} textAnchor="middle" className="select-none">
                  {edge.relationship}
                </text>
              </g>
            );
          })}
        </svg>
        {nodes.map((node) => (
          <div key={node.id} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl px-4 py-3 text-sm font-medium shadow-md"
            style={{
              left: node.x, top: node.y,
              background: node.type === 'central' ? '#0d9488' : 'white',
              color: node.type === 'central' ? 'white' : '#334155',
              border: node.type === 'central' ? 'none' : '2px solid #14b8a6',
            }}>
            <span className="flex items-center gap-1">
              <Network className="w-3 h-3" /> {node.label}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {graph.nodes.map((node: any) => (
          <div key={node.id} className="rounded-lg border border-slate-100 p-3">
            <p className="text-sm font-semibold text-slate-900">{node.label}</p>
            <p className="text-xs text-slate-500 capitalize">{node.type}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── AI Teacher Chat Component ───

function TeacherChat({ documentText, documentTitle }: {
  documentText: string;
  documentTitle: string;
  documentLanguage: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<TeacherMode>('university');
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
      const answer = await askTeacher({ documentText, documentTitle, question: question.trim(), mode, history: messages });
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get a response.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card flex flex-col" style={{ height: '70vh' }}>
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <Bot className="h-5 w-5 text-indigo-600" />
        <span className="text-sm font-semibold text-slate-700">AI Teacher</span>
        <div className="ml-auto flex flex-wrap gap-1">
          {teacherModes.map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.value} onClick={() => setMode(m.value)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${mode === m.value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <Icon className="h-3.5 w-3.5" /> {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md">
              <MessageCircle className="h-7 w-7 text-white" />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900">Ask AI Teacher</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Ask any question about this document. The AI teacher answers only from the document and cites the chapter.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => handleSend(s)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-sm text-slate-600 transition-all hover:border-indigo-300 hover:bg-indigo-50/30 hover:text-indigo-700">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${msg.role === 'user' ? 'bg-slate-200' : 'bg-gradient-to-br from-indigo-500 to-indigo-600'}`}>
              {msg.role === 'user' ? <User className="h-4 w-4 text-slate-600" /> : <Bot className="h-4 w-4 text-white" />}
            </div>
            <div className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="mb-4 flex gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
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
