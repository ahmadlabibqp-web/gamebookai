import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { MatchingGame } from '@/lib/types';
import { Timer } from './Timer';
import { GameResult } from './GameResult';

interface MatchingGameViewProps {
  game: MatchingGame;
  onFinish: (result: { score: number; maxScore: number; correct: number; total: number; answers: any[] }) => void;
  backLink: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MatchingGameView({ game, onFinish, backLink }: MatchingGameViewProps) {
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [paused, setPaused] = useState(false);

  const concepts = game.pairs.map((p) => p.concept);
  const [definitions] = useState(() => shuffle(game.pairs.map((p) => p.definition)));

  const handleMatch = (definition: string) => {
    if (!selectedConcept) return;
    const pair = game.pairs.find((p) => p.concept === selectedConcept);
    if (pair && pair.definition === definition) {
      const next = new Set(matched);
      next.add(selectedConcept);
      setMatched(next);
      setSelectedConcept(null);
      if (next.size === game.pairs.length) {
        onFinish({
          score: game.pairs.length,
          maxScore: game.pairs.length,
          correct: game.pairs.length,
          total: game.pairs.length,
          answers: [],
        });
        setShowResult(true);
      }
    } else {
      setWrong(definition);
      setTimeout(() => setWrong(null), 600);
      setSelectedConcept(null);
    }
  };

  const retry = () => {
    setMatched(new Set());
    setSelectedConcept(null);
    setShowResult(false);
    setPaused(false);
  };

  if (showResult) {
    return (
      <GameResult
        score={matched.size}
        maxScore={game.pairs.length}
        correct={matched.size}
        total={game.pairs.length}
        onRetry={retry}
        backLink={backLink}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <span className="badge bg-teal-100 text-teal-700">
          Matched {matched.size} / {game.pairs.length}
        </span>
        <Timer paused={paused} />
      </div>

      <p className="mb-6 text-center text-sm text-slate-500">
        Click a concept, then click its matching definition.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-500">
            Concepts
          </h3>
          {concepts.map((c) => {
            const isMatched = matched.has(c);
            const isSelected = selectedConcept === c;
            return (
              <button
                key={c}
                onClick={() => !isMatched && setSelectedConcept(c)}
                disabled={isMatched}
                className={`flex w-full items-center justify-between gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                  isMatched
                    ? 'border-teal-300 bg-teal-50 opacity-60'
                    : isSelected
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 bg-white hover:border-teal-300'
                }`}
              >
                <span className="text-sm font-medium text-slate-800">{c}</span>
                {isMatched && <CheckCircle2 className="h-5 w-5 text-teal-600" />}
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-500">
            Definitions
          </h3>
          {definitions.map((d, i) => {
            const pair = game.pairs.find((p) => p.definition === d);
            const isMatched = pair && matched.has(pair.concept);
            const isWrong = wrong === d;
            return (
              <button
                key={i}
                onClick={() => !isMatched && handleMatch(d)}
                disabled={!!isMatched}
                className={`flex w-full items-start gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                  isMatched
                    ? 'border-teal-300 bg-teal-50 opacity-60'
                    : isWrong
                      ? 'border-rose-400 bg-rose-50'
                      : 'border-slate-200 bg-white hover:border-teal-300'
                }`}
              >
                <span className="text-sm text-slate-700">{d}</span>
                {isMatched && <CheckCircle2 className="ml-auto h-5 w-5 flex-shrink-0 text-teal-600" />}
                {isWrong && <XCircle className="ml-auto h-5 w-5 flex-shrink-0 text-rose-600" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
