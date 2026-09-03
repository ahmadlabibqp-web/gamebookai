import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Pause,
  Play,
} from 'lucide-react';
import { getGame, getDocument, saveSession, processGameSession } from '@/lib/db';
import type { GameRow, DocumentRow, GameType } from '@/lib/types';
import { GAME_LABELS } from '@/lib/types';
import { QuizGameView } from '@/components/games/QuizGameView';
import { FlashcardsGameView } from '@/components/games/FlashcardsGameView';
import { MatchingGameView } from '@/components/games/MatchingGameView';
import { WordSearchGameView } from '@/components/games/WordSearchGameView';
import { UnscrambleGameView } from '@/components/games/UnscrambleGameView';
import { HangmanGameView } from '@/components/games/HangmanGameView';
import { MemoryGameView } from '@/components/games/MemoryGameView';
import { SequenceGameView } from '@/components/games/SequenceGameView';
import { CrosswordGameView } from '@/components/games/CrosswordGameView';
import { TimelineGameView } from '@/components/games/TimelineGameView';
import { SortingGameView } from '@/components/games/SortingGameView';
import { ConceptMapView } from '@/components/games/ConceptMapGameView';

interface GameResult {
  score: number;
  maxScore: number;
  correct: number;
  total: number;
  answers: any[];
}

export function PlayGamePage() {
  const { id: docId, gameId } = useParams<{ id: string; gameId: string }>();
  const [game, setGame] = useState<GameRow | null>(null);
  const [doc, setDoc] = useState<DocumentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const load = async () => {
      if (!docId || !gameId) return;
      startTimeRef.current = Date.now();
      const [g, d] = await Promise.all([getGame(gameId), getDocument(docId)]);
      setGame(g);
      setDoc(d);
      setLoading(false);
    };
    load();
  }, [docId, gameId]);

  const handleFinish = async (result: GameResult) => {
    if (!game || !doc || sessionSaved) return;
    setSessionSaved(true);
    const durationMs = Date.now() - startTimeRef.current;
    const session = await saveSession({
      game_id: game.id,
      document_id: doc.id,
      score: result.score,
      max_score: result.maxScore,
      correct: result.correct,
      total: result.total,
      duration_ms: durationMs,
      completed: true,
      answers: result.answers,
    });
    if (session) {
      try {
        await processGameSession(session.id);
      } catch (err) {
        console.error('Failed to process gamification:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!game || !doc) {
    return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <AlertCircle className="mx-auto mb-4 h-12 w-12 text-rose-400" />
      <h1 className="font-display text-2xl font-bold text-slate-900">
        Game not found
      </h1>
      <Link to="/dashboard" className="btn-primary mt-6">
        Back to Dashboard
      </Link>
    </div>
    );
  }

  const backLink = `/document/${doc.id}`;
  const content = game.content;
  const type = game.type as GameType;

  const renderGame = () => {
    switch (type) {
      case 'quiz':
        return <QuizGameView game={content} onFinish={handleFinish} backLink={backLink} />;
      case 'flashcards':
        return <FlashcardsGameView game={content} onFinish={handleFinish} backLink={backLink} />;
      case 'matching':
        return <MatchingGameView game={content} onFinish={handleFinish} backLink={backLink} />;
      case 'wordsearch':
        return <WordSearchGameView game={content} onFinish={handleFinish} backLink={backLink} />;
      case 'unscramble':
        return <UnscrambleGameView game={content} onFinish={handleFinish} backLink={backLink} />;
      case 'hangman':
        return <HangmanGameView game={content} onFinish={handleFinish} backLink={backLink} />;
      case 'memory':
        return <MemoryGameView game={content} onFinish={handleFinish} backLink={backLink} />;
      case 'sequence':
        return <SequenceGameView game={content} onFinish={handleFinish} backLink={backLink} />;
      case 'crossword':
        return <CrosswordGameView game={content} onFinish={handleFinish} backLink={backLink} />;
      case 'timeline':
        return <TimelineGameView game={content} onFinish={handleFinish} backLink={backLink} />;
      case 'sorting':
        return <SortingGameView game={content} onFinish={handleFinish} backLink={backLink} />;
      case 'conceptmap':
        return <ConceptMapView game={content} onFinish={handleFinish} backLink={backLink} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to={backLink}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to document
          </Link>
          <button
            onClick={() => setPaused(!paused)}
            className="btn-ghost"
            aria-label={paused ? 'Resume' : 'Pause'}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {paused ? 'Resume' : 'Pause'}
          </button>
        </div>

        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">
            {GAME_LABELS[type]}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{doc.title}</p>
        </div>

        {renderGame()}
      </div>
  );
}
