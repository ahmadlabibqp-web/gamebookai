import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { CrosswordGame } from '@/lib/types';
import { Timer } from './Timer';
import { GameResult } from './GameResult';

interface CrosswordGameViewProps {
  game: CrosswordGame;
  onFinish: (result: { score: number; maxScore: number; correct: number; total: number; answers: any[] }) => void;
  backLink: string;
}

export function CrosswordGameView({ game, onFinish, backLink }: CrosswordGameViewProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [paused, setPaused] = useState(false);

  const getKey = (r: number, c: number) => `${r}-${c}`;

  const isCellActive = (r: number, c: number): boolean => {
    return game.grid[r]?.[c] !== null && game.grid[r]?.[c] !== undefined;
  };

  const checkSolution = () => {
    let correct = 0;
    for (const clue of game.clues) {
      let word = '';
      for (let i = 0; i < clue.word.length; i++) {
        const r = clue.direction === 'across' ? clue.row : clue.row + i;
        const c = clue.direction === 'across' ? clue.col + i : clue.col;
        word += answers[getKey(r, c)] ?? '';
      }
      if (word.toUpperCase() === clue.word) correct++;
    }
    onFinish({
      score: correct,
      maxScore: game.clues.length,
      correct,
      total: game.clues.length,
      answers: [],
    });
    setShowResult(true);
  };

  const retry = () => {
    setAnswers({});
    setShowResult(false);
    setPaused(false);
  };

  if (showResult) {
    const correctCount = game.clues.filter((clue) => {
      let word = '';
      for (let i = 0; i < clue.word.length; i++) {
        const r = clue.direction === 'across' ? clue.row : clue.row + i;
        const c = clue.direction === 'across' ? clue.col + i : clue.col;
        word += answers[getKey(r, c)] ?? '';
      }
      return word.toUpperCase() === clue.word;
    }).length;
    return (
      <GameResult
        score={correctCount}
        maxScore={game.clues.length}
        correct={correctCount}
        total={game.clues.length}
        onRetry={retry}
        backLink={backLink}
      />
    );
  }

  const acrossClues = game.clues.filter((c) => c.direction === 'across');
  const downClues = game.clues.filter((c) => c.direction === 'down');

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <span className="badge bg-teal-100 text-teal-700">
          {game.clues.length} clues
        </span>
        <Timer paused={paused} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Grid */}
        <div className="overflow-x-auto">
          <div className="inline-block">
            {game.grid.map((row, r) => (
              <div key={r} className="flex">
                {row.map((cell, c) => {
                  if (!isCellActive(r, c)) {
                    return <div key={c} className="h-8 w-8 sm:h-9 sm:w-9" />;
                  }
                  const clue = game.clues.find(
                    (cl) =>
                      cl.row === r && cl.col === c,
                  );
                  return (
                    <div
                      key={c}
                      className="relative h-8 w-8 border border-slate-300 sm:h-9 sm:w-9"
                    >
                      {clue && (
                        <span className="absolute left-0 top-0 text-[8px] font-bold text-teal-600">
                          {clue.number}
                        </span>
                      )}
                      <input
                        type="text"
                        maxLength={1}
                        value={answers[getKey(r, c)] ?? ''}
                        onChange={(e) =>
                          setAnswers({
                            ...answers,
                            [getKey(r, c)]: e.target.value.toUpperCase(),
                          })
                        }
                        className="h-full w-full bg-teal-50/30 text-center text-sm font-bold uppercase text-slate-800 focus:bg-teal-100 focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Clues */}
        <div className="space-y-4">
          <div>
            <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-slate-500">
              Across
            </h3>
            <div className="space-y-1.5">
              {acrossClues.map((clue) => (
                <div key={`${clue.number}-a`} className="flex gap-2 text-sm">
                  <span className="font-bold text-teal-600">{clue.number}.</span>
                  <span className="text-slate-600">{clue.clue}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-slate-500">
              Down
            </h3>
            <div className="space-y-1.5">
              {downClues.map((clue) => (
                <div key={`${clue.number}-d`} className="flex gap-2 text-sm">
                  <span className="font-bold text-teal-600">{clue.number}.</span>
                  <span className="text-slate-600">{clue.clue}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <button onClick={checkSolution} className="btn-primary">
        <CheckCircle2 className="h-4 w-4" />
        Check Solution
      </button>
      </div>
    </div>
  );
}
