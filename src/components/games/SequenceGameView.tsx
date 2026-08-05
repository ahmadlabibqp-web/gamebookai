import { useState } from 'react';
import { ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react';
import type { SequenceGame } from '@/lib/types';
import { Timer } from './Timer';
import { GameResult } from './GameResult';

interface SequenceGameViewProps {
  game: SequenceGame;
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

export function SequenceGameView({ game, onFinish, backLink }: SequenceGameViewProps) {
  const [order, setOrder] = useState(() =>
    shuffle(game.items.map((it) => it.id)),
  );
  const [showResult, setShowResult] = useState(false);
  const [paused, setPaused] = useState(false);

  const move = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= order.length) return;
    const next = [...order];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setOrder(next);
  };

  const checkOrder = () => {
    let correct = 0;
    order.forEach((id, i) => {
      const item = game.items.find((it) => it.id === id);
      if (item && item.order === i + 1) correct++;
    });
    onFinish({
      score: correct,
      maxScore: game.items.length,
      correct,
      total: game.items.length,
      answers: [],
    });
    setShowResult(true);
  };

  const retry = () => {
    setOrder(shuffle(game.items.map((it) => it.id)));
    setShowResult(false);
    setPaused(false);
  };

  if (showResult) {
    const correctCount = order.filter((id, i) => {
      const item = game.items.find((it) => it.id === id);
      return item && item.order === i + 1;
    }).length;
    return (
      <div className="mx-auto max-w-2xl">
        <GameResult
          score={correctCount}
          maxScore={game.items.length}
          correct={correctCount}
          total={game.items.length}
          onRetry={retry}
          backLink={backLink}
        />
        <div className="mt-8 space-y-2">
          <h3 className="font-display text-lg font-bold text-slate-900">Correct Order</h3>
          {game.items
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((it) => (
              <div
                key={it.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <span className="badge bg-teal-100 text-teal-700">{it.order}</span>
                <span className="text-sm text-slate-700">{it.step}</span>
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <span className="badge bg-teal-100 text-teal-700">
          {game.items.length} steps to arrange
        </span>
        <Timer paused={paused} />
      </div>

      <p className="mb-6 text-center text-sm text-slate-500">
        Use the arrows to arrange the steps in the correct order.
      </p>

      <div className="space-y-3">
        {order.map((id, i) => {
          const item = game.items.find((it) => it.id === id)!;
          return (
            <div
              key={id}
              className="card flex items-center gap-3 p-4"
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                {i + 1}
              </span>
              <p className="flex-1 text-sm text-slate-700">{item.step}</p>
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-teal-600 disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-teal-600 disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <button onClick={checkOrder} className="btn-primary">
          <CheckCircle2 className="h-4 w-4" />
          Check Order
        </button>
      </div>
    </div>
  );
}
