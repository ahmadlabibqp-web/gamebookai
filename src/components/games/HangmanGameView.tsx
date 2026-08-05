import { useState } from 'react';
import { Heart, RotateCcw } from 'lucide-react';
import type { HangmanGame as HangmanGameType } from '@/lib/types';
import { Timer } from './Timer';
import { GameResult } from './GameResult';

interface HangmanGameViewProps {
  game: HangmanGameType;
  onFinish: (result: { score: number; maxScore: number; correct: number; total: number; answers: any[] }) => void;
  backLink: string;
}

const MAX_WRONG = 6;

export function HangmanGameView({ game, onFinish, backLink }: HangmanGameViewProps) {
  const [wordIdx, setWordIdx] = useState(0);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState(0);
  const [solved, setSolved] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [paused, setPaused] = useState(false);

  const currentWord = game.words[wordIdx];
  const wordLetters = new Set(currentWord?.word.replace(/\s/g, '') ?? '');
  const wordSolved = [...wordLetters].every((l) => guessed.has(l));
  const isDead = wrong >= MAX_WRONG;

  const handleGuess = (letter: string) => {
    if (guessed.has(letter) || isDead || wordSolved) return;
    const next = new Set(guessed);
    next.add(letter);
    setGuessed(next);
    if (!wordLetters.has(letter)) {
      setWrong((w) => w + 1);
    }
  };

  // Check word completion
  if ((wordSolved || isDead) && !showResult && currentWord) {
    const newSolved = wordSolved ? solved + 1 : solved;
    if (wordIdx === game.words.length - 1) {
      onFinish({
        score: newSolved,
        maxScore: game.words.length,
        correct: newSolved,
        total: game.words.length,
        answers: [],
      });
      setTimeout(() => setShowResult(true), 300);
    } else {
      setTimeout(() => {
        setSolved(newSolved);
        setWordIdx((i) => i + 1);
        setGuessed(new Set());
        setWrong(0);
      }, 1500);
    }
  }

  const retry = () => {
    setWordIdx(0);
    setGuessed(new Set());
    setWrong(0);
    setSolved(0);
    setShowResult(false);
    setPaused(false);
  };

  if (showResult) {
    return (
      <GameResult
        score={solved}
        maxScore={game.words.length}
        correct={solved}
        total={game.words.length}
        onRetry={retry}
        backLink={backLink}
      />
    );
  }

  if (!currentWord) return null;

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <span className="badge bg-teal-100 text-teal-700">
          Word {wordIdx + 1} / {game.words.length}
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {Array.from({ length: MAX_WRONG }).map((_, i) => (
              <Heart
                key={i}
                className={`h-4 w-4 ${
                  i < MAX_WRONG - wrong ? 'fill-rose-500 text-rose-500' : 'text-slate-200'
                }`}
              />
            ))}
          </div>
          <Timer paused={paused} />
        </div>
      </div>

      <div className="card p-8 text-center">
        <p className="mb-6 text-sm text-slate-500">Hint: {currentWord.hint}</p>

        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {currentWord.word.split('').map((letter, i) => (
            <div
              key={i}
              className={`flex h-12 w-10 items-center justify-center rounded-lg border-2 font-display text-2xl font-bold ${
                letter === ' '
                  ? 'border-transparent'
                  : guessed.has(letter)
                    ? 'border-teal-300 bg-teal-50 text-teal-700'
                    : wordSolved || isDead
                      ? 'border-slate-200 bg-slate-50 text-slate-400'
                      : 'border-slate-300 text-transparent'
              }`}
            >
              {(guessed.has(letter) || isDead) && letter !== ' ' ? letter : letter === ' ' ? '' : '_'}
            </div>
          ))}
        </div>

        {isDead && (
          <p className="mb-4 text-sm font-semibold text-rose-600">
            Out of guesses! The word was: {currentWord.word}
          </p>
        )}
        {wordSolved && !isDead && (
          <p className="mb-4 text-sm font-semibold text-teal-600">Correct!</p>
        )}

        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-9">
          {alphabet.map((letter) => {
            const isGuessed = guessed.has(letter);
            const isCorrect = isGuessed && wordLetters.has(letter);
            const isWrong = isGuessed && !wordLetters.has(letter);
            return (
              <button
                key={letter}
                onClick={() => handleGuess(letter)}
                disabled={isGuessed || isDead || wordSolved}
                className={`flex h-9 items-center justify-center rounded-lg text-sm font-bold transition-all ${
                  isCorrect
                    ? 'bg-teal-500 text-white'
                    : isWrong
                      ? 'bg-rose-100 text-rose-400'
                      : 'bg-slate-100 text-slate-700 hover:bg-teal-100 hover:text-teal-700 disabled:opacity-40'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">
        Solved: <strong className="text-teal-600">{solved}</strong> / {game.words.length}
      </p>
    </div>
  );
}
