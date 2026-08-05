import { Trophy, RotateCcw, CheckCircle2, XCircle, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface GameResultProps {
  score: number;
  maxScore: number;
  correct: number;
  total: number;
  onRetry: () => void;
  backLink: string;
}

export function GameResult({
  score,
  maxScore,
  correct,
  total,
  onRetry,
  backLink,
}: GameResultProps) {
  const pct = maxScore ? Math.round((score / maxScore) * 100) : 0;
  const passed = pct >= 60;

  return (
    <div className="animate-scale-in mx-auto max-w-md text-center">
      <div
        className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl shadow-lg ${
          passed
            ? 'bg-gradient-to-br from-teal-500 to-emerald-600'
            : 'bg-gradient-to-br from-amber-500 to-orange-500'
        }`}
      >
        <Trophy className="h-10 w-10 text-white" />
      </div>
      <h2 className="font-display text-3xl font-bold text-slate-900">
        {passed ? 'Well done!' : 'Keep practicing!'}
      </h2>
      <p className="mt-2 text-slate-600">
        You scored {score} out of {maxScore} points
      </p>

      <div className="my-8 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="font-display text-2xl font-bold text-slate-900">{pct}%</div>
          <div className="text-xs text-slate-500">Score</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="font-display text-2xl font-bold text-teal-600">{correct}</div>
          <div className="text-xs text-slate-500">Correct</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="font-display text-2xl font-bold text-slate-900">{total}</div>
          <div className="text-xs text-slate-500">Total</div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button onClick={onRetry} className="btn-primary">
          <RotateCcw className="h-4 w-4" />
          Play Again
        </button>
        <Link to={backLink} className="btn-secondary">
          <Home className="h-4 w-4" />
          Back
        </Link>
      </div>
    </div>
  );
}

export function AnswerReview({
  answers,
}: {
  answers: { question: string; userAnswer: string; correct: string; isCorrect: boolean }[];
}) {
  return (
    <div className="mt-8 space-y-3">
      <h3 className="font-display text-lg font-bold text-slate-900">Review Answers</h3>
      {answers.map((a, i) => (
        <div
          key={i}
          className={`rounded-xl border p-4 ${
            a.isCorrect
              ? 'border-teal-200 bg-teal-50'
              : 'border-rose-200 bg-rose-50'
          }`}
        >
          <div className="flex items-start gap-3">
            {a.isCorrect ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-teal-600" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{a.question}</p>
              <p className="mt-1 text-sm text-slate-600">
                Your answer: <span className="font-medium">{a.userAnswer || '—'}</span>
              </p>
              {!a.isCorrect && (
                <p className="mt-0.5 text-sm text-teal-700">
                  Correct: <span className="font-medium">{a.correct}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
