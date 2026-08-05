import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import type { QuizGame, QuizQuestion } from '@/lib/types';
import { Timer } from './Timer';
import { GameResult, AnswerReview } from './GameResult';

interface QuizGameViewProps {
  game: QuizGame;
  onFinish: (result: {
    score: number;
    maxScore: number;
    correct: number;
    total: number;
    answers: any[];
  }) => void;
  backLink: string;
}

export function QuizGameView({ game, onFinish, backLink }: QuizGameViewProps) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [shortAnswer, setShortAnswer] = useState('');
  const [answers, setAnswers] = useState<
    { question: string; userAnswer: string; correct: string; isCorrect: boolean }[]
  >([]);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [paused, setPaused] = useState(false);

  const question: QuizQuestion | undefined = game.questions[current];
  const isLast = current === game.questions.length - 1;

  const checkAnswer = (userAnswer: string, q: QuizQuestion): boolean => {
    if (q.type === 'short_answer') {
      return (
        userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase() ||
        q.answer.toLowerCase().includes(userAnswer.trim().toLowerCase())
      );
    }
    if (q.type === 'fill_blank') {
      return userAnswer.trim().toLowerCase() === q.answer.trim().toLowerCase();
    }
    return userAnswer === q.answer;
  };

  const handleNext = () => {
    if (!question) return;
    const userAnswer =
      question.type === 'short_answer' ? shortAnswer : selected ?? '';
    const isCorrect = checkAnswer(userAnswer, question);
    const points = question.type === 'short_answer' ? 3 : question.type === 'multiple_choice' ? 2 : 1;

    const newAnswers = [
      ...answers,
      {
        question: question.question,
        userAnswer,
        correct: question.answer,
        isCorrect,
      },
    ];
    setAnswers(newAnswers);
    if (isCorrect) {
      setScore((s) => s + points);
      setCorrectCount((c) => c + 1);
    }

    if (isLast) {
      const maxScore = game.questions.reduce(
        (sum, q) => sum + (q.type === 'short_answer' ? 3 : q.type === 'multiple_choice' ? 2 : 1),
        0,
      );
      onFinish({
        score: isCorrect ? score + points : score,
        maxScore,
        correct: isCorrect ? correctCount + 1 : correctCount,
        total: game.questions.length,
        answers: newAnswers,
      });
      setShowResult(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setShortAnswer('');
    }
  };

  const retry = () => {
    setCurrent(0);
    setSelected(null);
    setShortAnswer('');
    setAnswers([]);
    setScore(0);
    setCorrectCount(0);
    setShowResult(false);
    setPaused(false);
  };

  if (showResult) {
    return (
      <div className="mx-auto max-w-3xl">
        <GameResult
          score={score}
          maxScore={game.questions.reduce(
            (s, q) => s + (q.type === 'short_answer' ? 3 : q.type === 'multiple_choice' ? 2 : 1),
            0,
          )}
          correct={correctCount}
          total={game.questions.length}
          onRetry={retry}
          backLink={backLink}
        />
        <AnswerReview answers={answers} />
      </div>
    );
  }

  if (!question) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge bg-teal-100 text-teal-700">
            Q {current + 1} / {game.questions.length}
          </span>
          <span className="badge bg-slate-100 text-slate-600 capitalize">
            {question.type.replace('_', ' ')}
          </span>
        </div>
        <Timer paused={paused} />
      </div>

      <div className="card p-6">
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 transition-all"
            style={{ width: `${((current + 1) / game.questions.length) * 100}%` }}
          />
        </div>

        <h2 className="mt-5 font-display text-xl font-bold text-slate-900">
          {question.question}
        </h2>

        <div className="mt-6 space-y-3">
          {question.type === 'short_answer' ? (
            <input
              type="text"
              value={shortAnswer}
              onChange={(e) => setShortAnswer(e.target.value)}
              placeholder="Type your answer…"
              className="input-field"
              autoFocus
            />
          ) : question.type === 'fill_blank' ? (
            <input
              type="text"
              value={shortAnswer}
              onChange={(e) => setShortAnswer(e.target.value)}
              placeholder="Type the missing word…"
              className="input-field"
              autoFocus
            />
          ) : (
            question.options?.map((opt, i) => {
              const isSelected = selected === opt;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(opt)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                      isSelected
                        ? 'border-teal-500 bg-teal-500 text-white'
                        : 'border-slate-300 text-slate-400'
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-sm text-slate-700">{opt}</span>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleNext}
            disabled={
              question.type === 'short_answer' || question.type === 'fill_blank'
                ? !shortAnswer.trim()
                : !selected
            }
            className="btn-primary"
          >
            {isLast ? 'Finish' : 'Next'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>Score: <strong className="text-slate-900">{score}</strong></span>
        <span>Correct: <strong className="text-teal-600">{correctCount}</strong></span>
      </div>
    </div>
  );
}
