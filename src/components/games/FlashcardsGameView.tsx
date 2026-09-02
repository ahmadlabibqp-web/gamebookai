import { useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import type { FlashcardsGame, Flashcard } from '@/lib/types';
import { Timer } from './Timer';
import { GameResult } from './GameResult';

interface FlashcardsGameViewProps {
  game: FlashcardsGame;
  onFinish: (result: { score: number; maxScore: number; correct: number; total: number; answers: any[] }) => void;
  backLink: string;
}

export function FlashcardsGameView({ game, onFinish, backLink }: FlashcardsGameViewProps) {
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [showResult, setShowResult] = useState(false);
  const [paused, setPaused] = useState(false);

  const card: Flashcard | undefined = game.cards[current];
  const isLast = current === game.cards.length - 1;

  const markKnown = (isKnown: boolean) => {
    if (!card) return;
    const next = new Set(known);
    if (isKnown) next.add(card.id);
    else next.delete(card.id);
    setKnown(next);
    setFlipped(false);
    if (isLast) {
      onFinish({
        score: next.size,
        maxScore: game.cards.length,
        correct: next.size,
        total: game.cards.length,
        answers: [],
      });
      setShowResult(true);
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const retry = () => {
    setCurrent(0);
    setFlipped(false);
    setKnown(new Set());
    setShowResult(false);
    setPaused(false);
  };

  if (showResult) {
    return (
      <GameResult
        score={known.size}
        maxScore={game.cards.length}
        correct={known.size}
        total={game.cards.length}
        onRetry={retry}
        backLink={backLink}
      />
    );
  }

  if (!card) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <span className="badge bg-indigo-100 text-indigo-700">
          Card {current + 1} / {game.cards.length}
        </span>
        <Timer paused={paused} />
      </div>

      <div
        onClick={() => setFlipped(!flipped)}
        className="group relative h-72 cursor-pointer [perspective:1000px]"
      >
        <div
          className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* Front */}
          <div className="card absolute inset-0 flex flex-col items-center justify-center p-8 text-center [backface-visibility:hidden]">
            <span className="mb-3 badge bg-slate-100 text-slate-500">
              {card.category} · {card.difficulty}
            </span>
            <p className="font-display text-xl font-bold text-slate-900">
              {card.question}
            </p>
            <p className="mt-4 text-xs text-slate-400">Click to flip</p>
          </div>
          {/* Back */}
          <div className="card absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-emerald-50 p-8 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="font-display text-lg font-semibold text-slate-900">
              {card.answer}
            </p>
            <p className="mt-3 text-xs text-slate-400">Click to flip back</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          onClick={() => markKnown(false)}
          className="btn-secondary"
        >
          <ChevronLeft className="h-4 w-4" />
          Don't Know
        </button>
        <button onClick={() => markKnown(true)} className="btn-primary">
          I Know This
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">
        Known: <strong className="text-indigo-600">{known.size}</strong> / {game.cards.length}
      </p>
    </div>
  );
}
