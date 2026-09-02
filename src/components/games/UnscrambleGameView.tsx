import { useState } from 'react';
import { CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import type { UnscrambleGame } from '@/lib/types';
import { Timer } from './Timer';
import { GameResult, AnswerReview } from './GameResult';

interface UnscrambleGameViewProps {
  game: UnscrambleGame;
  onFinish: (result: { score: number; maxScore: number; correct: number; total: number; answers: any[] }) => void;
  backLink: string;
}

export function UnscrambleGameView({ game, onFinish, backLink }: UnscrambleGameViewProps) {
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState('');
  const [answers, setAnswers] = useState<
    { question: string; userAnswer: string; correct: string; isCorrect: boolean }[]
  >([]);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [paused, setPaused] = useState(false);

  const item = game.items[current];
  const isLast = current === game.items.length - 1;

  const handleSubmit = () => {
    if (!answer.trim() || !item) return;
    const isCorrect = answer.trim().toUpperCase() === item.answer;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setTimeout(() => {
      const newAnswers = [
        ...answers,
        {
          question: `Unscramble: ${item.scrambled}`,
          userAnswer: answer.trim().toUpperCase(),
          correct: item.answer,
          isCorrect,
        },
      ];
      setAnswers(newAnswers);
      if (isCorrect) {
        setScore((s) => s + 1);
        setCorrectCount((c) => c + 1);
      }
      if (isLast) {
        onFinish({
          score: isCorrect ? score + 1 : score,
          maxScore: game.items.length,
          correct: isCorrect ? correctCount + 1 : correctCount,
          total: game.items.length,
          answers: newAnswers,
        });
        setShowResult(true);
      } else {
        setCurrent((c) => c + 1);
        setAnswer('');
        setFeedback(null);
      }
    }, 500);
  };

  const retry = () => {
    setCurrent(0);
    setAnswer('');
    setAnswers([]);
    setScore(0);
    setCorrectCount(0);
    setFeedback(null);
    setShowResult(false);
    setPaused(false);
  };

  if (showResult) {
    return (
      <div className="mx-auto max-w-3xl">
        <GameResult
          score={score}
          maxScore={game.items.length}
          correct={correctCount}
          total={game.items.length}
          onRetry={retry}
          backLink={backLink}
        />
        <AnswerReview answers={answers} />
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <span className="badge bg-indigo-100 text-indigo-700">
          Word {current + 1} / {game.items.length}
        </span>
        <Timer paused={paused} />
      </div>

      <div className="card p-8 text-center">
        <p className="mb-2 text-sm text-slate-500">{item.clue}</p>
        <div className="my-6 flex flex-wrap justify-center gap-2">
          {item.scrambled.split('').map((letter, i) => (
            <div
              key={i}
              className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-indigo-200 bg-indigo-50 font-display text-xl font-bold text-indigo-700"
            >
              {letter}
            </div>
          ))}
        </div>

        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Type the unscrambled word…"
          className="input-field text-center font-semibold uppercase"
          autoFocus
          disabled={feedback !== null}
        />

        {feedback === 'correct' && (
          <div className="mt-4 flex items-center justify-center gap-2 text-indigo-600">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">Correct!</span>
          </div>
        )}
        {feedback === 'wrong' && (
          <div className="mt-4 flex items-center justify-center gap-2 text-rose-600">
            <XCircle className="h-5 w-5" />
            <span className="font-semibold">Not quite — the answer is {item.answer}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!answer.trim() || feedback !== null}
          className="btn-primary mt-6"
        >
          {isLast ? 'Finish' : 'Submit'}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
