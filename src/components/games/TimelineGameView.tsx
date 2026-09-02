import { useState } from 'react';
import { Clock, CheckCircle2, XCircle, ArrowUp, ArrowDown } from 'lucide-react';
import type { TimelineGame } from '@/lib/types';
import { Timer } from './Timer';
import { GameResult } from './GameResult';

interface Props {
  game: TimelineGame;
  onFinish: (result: { score: number; maxScore: number; correct: number; total: number; answers: any[] }) => void;
  backLink: string;
}

export function TimelineGameView({ game, onFinish, backLink }: Props) {
  const [events] = useState(() => {
    const shuffled = [...game.events].sort(() => Math.random() - 0.5);
    return shuffled.map((e, i) => ({ ...e, currentOrder: i }));
  });
  const [order, setOrder] = useState(events);
  const [submitted, setSubmitted] = useState(false);
  const [paused] = useState(false);

  const move = (index: number, dir: -1 | 1) => {
    if (submitted) return;
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= order.length) return;
    const next = [...order];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setOrder(next);
  };

  const check = () => {
    setSubmitted(true);
    const correctArr = [...game.events].sort((a, b) => a.order - b.order);
    let correctCount = 0;
    order.forEach((e, i) => {
      if (e.id === correctArr[i].id) correctCount++;
    });
    onFinish({
      score: correctCount,
      maxScore: game.events.length,
      correct: correctCount,
      total: game.events.length,
      answers: order.map((e, i) => ({
        question: e.event,
        userAnswer: `Position ${i + 1}`,
        correct: e.id === correctArr[i].id,
      })),
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">Timeline Game</h2>
        <Timer paused={paused} />
      </div>
      <p className="text-sm text-slate-600 mb-4">Arrange these events in chronological order using the arrows.</p>

      <div className="space-y-3">
        {order.map((event, index) => (
          <div
            key={event.id}
            className={`flex items-center gap-3 rounded-xl border-2 p-4 transition-colors ${
              submitted
                ? event.order === index + 1
                  ? 'border-green-300 bg-green-50'
                  : 'border-red-300 bg-red-50'
                : 'border-slate-200 bg-white hover:border-indigo-200'
            }`}
          >
            <div className="flex flex-col gap-1">
              <button
                onClick={() => move(index, -1)}
                disabled={index === 0 || submitted}
                className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowUp className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={() => move(index, 1)}
                disabled={index === order.length - 1 || submitted}
                className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowDown className="w-4 h-4 text-slate-600" />
              </button>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-semibold text-indigo-600">{event.date}</span>
              </div>
              <p className="text-sm text-slate-700">{event.event}</p>
              {event.description && (
                <p className="text-xs text-slate-500 mt-1">{event.description}</p>
              )}
            </div>
            {submitted && (
              event.order === index + 1
                ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                : <XCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
        ))}
      </div>

      {!submitted && (
        <button
          onClick={check}
          className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          Check Order
        </button>
      )}

      {submitted && (
        <GameResult
          score={order.filter((e, i) => e.order === i + 1).length}
          maxScore={game.events.length}
          correct={order.filter((e, i) => e.order === i + 1).length}
          total={game.events.length}
          onRetry={() => window.location.reload()}
          backLink={backLink}
        />
      )}
    </div>
  );
}
