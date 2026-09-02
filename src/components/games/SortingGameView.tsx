import { useState } from 'react';
import { CheckCircle2, XCircle, FolderInput } from 'lucide-react';
import type { SortingGame } from '@/lib/types';
import { Timer } from './Timer';
import { GameResult } from './GameResult';

interface Props {
  game: SortingGame;
  onFinish: (result: { score: number; maxScore: number; correct: number; total: number; answers: any[] }) => void;
  backLink: string;
}

export function SortingGameView({ game, onFinish }: Props) {
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [paused] = useState(false);

  const unsorted = game.items.filter((item) => !placements[item.id]);

  const assign = (itemId: string, categoryId: string) => {
    if (submitted) return;
    setPlacements({ ...placements, [itemId]: categoryId });
  };

  const unassign = (itemId: string) => {
    if (submitted) return;
    const next = { ...placements };
    delete next[itemId];
    setPlacements(next);
  };

  const check = () => {
    setSubmitted(true);
    let correctCount = 0;
    game.items.forEach((item) => {
      if (placements[item.id] === item.category) correctCount++;
    });
    onFinish({
      score: correctCount,
      maxScore: game.items.length,
      correct: correctCount,
      total: game.items.length,
      answers: game.items.map((item) => ({
        question: item.label,
        userAnswer: placements[item.id] || 'Not sorted',
        correct: placements[item.id] === item.category,
      })),
    });
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">Sorting Game</h2>
        <Timer paused={paused} />
      </div>
      <p className="text-sm text-slate-600 mb-4">Drag each item into the correct category by clicking a category button.</p>

      {unsorted.length > 0 && !submitted && (
        <div className="mb-6 rounded-xl border-2 border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Items to sort:</h3>
          <div className="flex flex-wrap gap-2">
            {unsorted.map((item) => (
              <div key={item.id} className="rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm">
                {item.label}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {game.categories.map((cat) => {
          const itemsInCat = game.items.filter((item) => placements[item.id] === cat.id);
          return (
            <div
              key={cat.id}
              className="rounded-xl border-2 border-slate-200 bg-white p-4 min-h-[120px]"
            >
              <h3 className="text-sm font-bold text-indigo-600 mb-3 flex items-center gap-2">
                <FolderInput className="w-4 h-4" />
                {cat.name}
              </h3>
              <div className="space-y-2">
                {itemsInCat.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      submitted
                        ? placements[item.id] === item.category
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                        : 'bg-indigo-50 text-slate-700'
                    }`}
                  >
                    <span>{item.label}</span>
                    {submitted ? (
                      placements[item.id] === item.category
                        ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                        : <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <button
                        onClick={() => unassign(item.id)}
                        className="text-xs text-slate-400 hover:text-red-500"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {!submitted && unsorted.length > 0 && (
                  <button
                    onClick={() => {
                      const next = unsorted[0];
                      if (next) assign(next.id, cat.id);
                    }}
                    className="w-full text-xs text-slate-400 hover:text-indigo-500 py-1"
                  >
                    + Place next item here
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!submitted && unsorted.length === 0 && (
        <button
          onClick={check}
          className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
        >
          Check Answers
        </button>
      )}

      {submitted && (
        <GameResult
          score={game.items.filter((item) => placements[item.id] === item.category).length}
          maxScore={game.items.length}
          correct={game.items.filter((item) => placements[item.id] === item.category).length}
          total={game.items.length}
          onRetry={() => window.location.reload()}
          backLink={backLink}
        />
      )}
    </div>
  );
}
