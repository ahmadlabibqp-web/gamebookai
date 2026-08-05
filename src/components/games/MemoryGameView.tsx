import { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { MemoryGame, MemoryPair } from '@/lib/types';
import { Timer } from './Timer';
import { GameResult } from './GameResult';

interface MemoryGameViewProps {
  game: MemoryGame;
  onFinish: (result: { score: number; maxScore: number; correct: number; total: number; answers: any[] }) => void;
  backLink: string;
}

interface Card {
  id: string;
  pairId: string;
  text: string;
  type: 'concept' | 'definition';
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MemoryGameView({ game, onFinish, backLink }: MemoryGameViewProps) {
  const cards: Card[] = game.pairs.flatMap((p: MemoryPair) => [
    { id: `${p.id}-c`, pairId: p.id, text: p.concept, type: 'concept' as const },
    { id: `${p.id}-d`, pairId: p.id, text: p.definition, type: 'definition' as const },
  ]);
  const [deck] = useState(() => shuffle(cards));
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [paused, setPaused] = useState(false);

  const handleClick = (card: Card) => {
    if (flipped.length >= 2 || flipped.includes(card.id) || matched.has(card.pairId)) return;
    const newFlipped = [...flipped, card.id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [first, second] = newFlipped.map((id) => deck.find((c) => c.id === id)!);
      if (first.pairId === second.pairId) {
        setTimeout(() => {
          const next = new Set(matched);
          next.add(first.pairId);
          setMatched(next);
          setFlipped([]);
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
        }, 500);
      } else {
        setWrong(newFlipped);
        setTimeout(() => {
          setFlipped([]);
          setWrong([]);
        }, 800);
      }
    }
  };

  const retry = () => {
    setFlipped([]);
    setMatched(new Set());
    setWrong([]);
    setMoves(0);
    setShowResult(false);
    setPaused(false);
  };

  if (showResult) {
    return (
      <GameResult
        score={game.pairs.length}
        maxScore={game.pairs.length}
        correct={game.pairs.length}
        total={game.pairs.length}
        onRetry={retry}
        backLink={backLink}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge bg-teal-100 text-teal-700">
            Pairs {matched.size} / {game.pairs.length}
          </span>
          <span className="badge bg-slate-100 text-slate-600">Moves: {moves}</span>
        </div>
        <Timer paused={paused} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {deck.map((card) => {
          const isFlipped = flipped.includes(card.id) || matched.has(card.pairId);
          const isWrong = wrong.includes(card.id);
          const isMatched = matched.has(card.pairId);
          return (
            <button
              key={card.id}
              onClick={() => handleClick(card)}
              disabled={isFlipped}
              className={`relative h-32 rounded-2xl border-2 p-3 text-center transition-all duration-300 [transform-style:preserve-3d] ${
                isFlipped ? '[transform:rotateY(180deg)]' : ''
              }`}
              style={{
                borderColor: isMatched
                  ? 'rgb(20 184 166)'
                  : isWrong
                    ? 'rgb(251 113 133)'
                    : 'rgb(226 232 240)',
                background: isFlipped
                  ? isMatched
                    ? 'rgb(204 251 241)'
                    : 'rgb(248 250 252)'
                  : 'linear-gradient(135deg, rgb(20 184 166), rgb(5 150 105))',
              }}
            >
              {isFlipped ? (
                <div className="flex h-full flex-col items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  {isMatched && <CheckCircle2 className="mb-1 h-4 w-4 text-teal-600" />}
                  {isWrong && <XCircle className="mb-1 h-4 w-4 text-rose-600" />}
                  <p className="text-xs font-medium text-slate-700">{card.text}</p>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center [backface-visibility:hidden]">
                  <span className="font-display text-2xl text-white/80">?</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Flip cards to find matching concept-definition pairs.
      </p>
    </div>
  );
}
