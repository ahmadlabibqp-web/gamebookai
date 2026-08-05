import { useState } from 'react';
import { CheckCircle2, Search } from 'lucide-react';
import type { WordSearchGame } from '@/lib/types';
import { Timer } from './Timer';
import { GameResult } from './GameResult';

interface WordSearchGameViewProps {
  game: WordSearchGame;
  onFinish: (result: { score: number; maxScore: number; correct: number; total: number; answers: any[] }) => void;
  backLink: string;
}

export function WordSearchGameView({ game, onFinish, backLink }: WordSearchGameViewProps) {
  const [found, setFound] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [start, setStart] = useState<[number, number] | null>(null);
  const [end, setEnd] = useState<[number, number] | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [paused, setPaused] = useState(false);

  const getSelectedCells = (): [number, number][] => {
    if (!start || !end) return [];
    const cells: [number, number][] = [];
    const [r1, c1] = start;
    const [r2, c2] = end;
    const dr = Math.sign(r2 - r1);
    const dc = Math.sign(c2 - c1);
    const len = Math.max(Math.abs(r2 - r1), Math.abs(c2 - c1));
    if (r1 !== r2 && c1 !== c2 && Math.abs(r2 - r1) !== Math.abs(c2 - c1)) return [];
    for (let i = 0; i <= len; i++) {
      cells.push([r1 + dr * i, c1 + dc * i]);
    }
    return cells;
  };

  const checkSelection = () => {
    const cells = getSelectedCells();
    if (cells.length < 2) return;
    const word = cells.map(([r, c]) => game.grid[r]?.[c] ?? '').join('');
    const reversed = word.split('').reverse().join('');
    const match = game.words.find(
      (w) => !found.has(w.word) && (w.word === word || w.word === reversed),
    );
    if (match) {
      const next = new Set(found);
      next.add(match.word);
      setFound(next);
      if (next.size === game.words.length) {
        onFinish({
          score: game.words.length,
          maxScore: game.words.length,
          correct: game.words.length,
          total: game.words.length,
          answers: [],
        });
        setShowResult(true);
      }
    }
    setStart(null);
    setEnd(null);
  };

  const isCellSelected = (r: number, c: number): boolean => {
    return getSelectedCells().some(([sr, sc]) => sr === r && sc === c);
  };

  const isCellFound = (r: number, c: number): boolean => {
    for (const word of found) {
      const w = game.words.find((x) => x.word === word);
      if (!w) continue;
      // Check all directions from each starting position — simplified: just highlight by letter match
    }
    return false;
  };

  const retry = () => {
    setFound(new Set());
    setStart(null);
    setEnd(null);
    setShowResult(false);
    setPaused(false);
  };

  if (showResult) {
    return (
      <GameResult
        score={found.size}
        maxScore={game.words.length}
        correct={found.size}
        total={game.words.length}
        onRetry={retry}
        backLink={backLink}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <span className="badge bg-teal-100 text-teal-700">
          Found {found.size} / {game.words.length}
        </span>
        <Timer paused={paused} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {game.words.map((w) => (
          <span
            key={w.word}
            className={`badge ${
              found.has(w.word)
                ? 'bg-teal-100 text-teal-700 line-through'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {found.has(w.word) && <CheckCircle2 className="h-3 w-3" />}
            {w.word}
          </span>
        ))}
      </div>

      <div className="mx-auto w-fit overflow-x-auto">
        <div
          className="inline-grid gap-0.5 select-none"
          style={{ gridTemplateColumns: `repeat(${game.size}, minmax(0, 1fr))` }}
          onMouseLeave={() => {
            if (selecting) checkSelection();
            setSelecting(false);
          }}
        >
          {game.grid.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                onMouseDown={() => {
                  setSelecting(true);
                  setStart([r, c]);
                  setEnd([r, c]);
                }}
                onMouseEnter={() => selecting && setEnd([r, c])}
                onMouseUp={() => {
                  if (selecting) checkSelection();
                  setSelecting(false);
                }}
                className={`flex h-7 w-7 items-center justify-center rounded text-xs font-bold transition-colors sm:h-8 sm:w-8 ${
                  isCellSelected(r, c)
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cell}
              </div>
            )),
          )}
        </div>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-sm text-slate-500">
        <Search className="h-4 w-4" />
        Click and drag to select letters. Words can be horizontal, vertical, or diagonal.
      </p>
    </div>
  );
}
