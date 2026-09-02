import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  Brain,
} from 'lucide-react';
import type { QuizGame, QuizQuestion, BloomLevel } from '@/lib/types';
import { BLOOM_LABELS } from '@/lib/types';
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

const bloomColors: Record<string, string> = {
  remember: 'bg-blue-100 text-blue-700',
  understand: 'bg-cyan-100 text-cyan-700',
  apply: 'bg-indigo-100 text-indigo-700',
  analyze: 'bg-amber-100 text-amber-700',
  evaluate: 'bg-orange-100 text-orange-700',
  create: 'bg-violet-100 text-violet-700',
};

function getPoints(q: QuizQuestion): number {
  if (q.type === 'long_answer') return 5;
  if (q.type === 'short_answer') return 3;
  if (q.type === 'multiple_choice') return 2;
  return 1;
}

export function QuizGameView({ game, onFinish, backLink }: QuizGameViewProps) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());
  const [textAnswer, setTextAnswer] = useState('');
  const [answers, setAnswers] = useState<
    { question: string; userAnswer: string; correct: string; isCorrect: boolean }[]
  >([]);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [paused] = useState(false);

  const question: QuizQuestion | undefined = game.questions[current];
  const isLast = current === game.questions.length - 1;

  const checkAnswer = (userAnswer: string, q: QuizQuestion): boolean => {
    if (q.type === 'short_answer' || q.type === 'fill_blank') {
      const ua = userAnswer.trim().toLowerCase();
      const ca = q.answer.trim().toLowerCase();
      return ua === ca || ca.includes(ua) || ua.includes(ca);
    }
    if (q.type === 'long_answer') {
      return userAnswer.trim().length > 20;
    }
    return userAnswer === q.answer;
  };

  const checkMultiAnswer = (selected: Set<string>, q: QuizQuestion): boolean => {
    if (!q.answers) return false;
    const correctSet = new Set(q.answers);
    if (selected.size !== correctSet.size) return false;
    for (const a of selected) {
      if (!correctSet.has(a)) return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!question) return;

    let userAnswer = '';
    let isCorrect = false;

    if (question.type === 'multiple_answer') {
      userAnswer = Array.from(multiSelected).join(', ');
      isCorrect = checkMultiAnswer(multiSelected, question);
    } else if (question.type === 'short_answer' || question.type === 'fill_blank' || question.type === 'long_answer') {
      userAnswer = textAnswer;
      isCorrect = checkAnswer(textAnswer, question);
    } else {
      userAnswer = selected ?? '';
      isCorrect = checkAnswer(userAnswer, question);
    }

    const points = getPoints(question);
    const newAnswers = [
      ...answers,
      {
        question: question.question,
        userAnswer,
        correct: question.type === 'multiple_answer' ? (question.answers?.join(', ') || '') : question.answer,
        isCorrect,
      },
    ];
    setAnswers(newAnswers);

    if (isCorrect) {
      setScore((s) => s + points);
      setCorrectCount((c) => c + 1);
    }

    if (isLast) {
      const maxScore = game.questions.reduce((sum, q) => sum + getPoints(q), 0);
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
      setMultiSelected(new Set());
      setTextAnswer('');
    }
  };

  const retry = () => {
    setCurrent(0);
    setSelected(null);
    setMultiSelected(new Set());
    setTextAnswer('');
    setAnswers([]);
    setScore(0);
    setCorrectCount(0);
    setShowResult(false);
  };

  if (showResult) {
    const maxScore = game.questions.reduce((sum, q) => sum + getPoints(q), 0);
    return (
      <div className="mx-auto max-w-3xl">
        <GameResult
          score={score}
          maxScore={maxScore}
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

  const toggleMulti = (opt: string) => {
    const next = new Set(multiSelected);
    if (next.has(opt)) next.delete(opt);
    else next.add(opt);
    setMultiSelected(next);
  };

  const isDisabled =
    question.type === 'multiple_answer'
      ? multiSelected.size === 0
      : question.type === 'short_answer' || question.type === 'fill_blank' || question.type === 'long_answer'
      ? !textAnswer.trim()
      : !selected;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="badge bg-indigo-100 text-indigo-700">
            Q {current + 1} / {game.questions.length}
          </span>
          <span className="badge bg-slate-100 text-slate-600 capitalize">
            {question.type.replace('_', ' ')}
          </span>
          {question.bloom_level && (
            <span className={`badge capitalize ${bloomColors[question.bloom_level] || 'bg-slate-100 text-slate-600'}`}>
              <Brain className="h-3 w-3" /> {BLOOM_LABELS[question.bloom_level as BloomLevel] || question.bloom_level}
            </span>
          )}
          {question.difficulty && (
            <span className="badge bg-slate-100 text-slate-500">{question.difficulty}</span>
          )}
        </div>
        <Timer paused={paused} />
      </div>

      <div className="card p-6">
        <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all"
            style={{ width: `${((current + 1) / game.questions.length) * 100}%` }}
          />
        </div>

        <h2 className="mt-5 font-display text-xl font-bold text-slate-900">
          {question.question}
        </h2>

        {question.type === 'multiple_answer' && (
          <p className="mt-1 text-xs text-slate-500">Select all correct answers.</p>
        )}

        <div className="mt-6 space-y-3">
          {question.type === 'short_answer' || question.type === 'fill_blank' ? (
            <input
              type="text"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder={question.type === 'fill_blank' ? 'Type the missing word…' : 'Type your answer…'}
              className="input-field"
              autoFocus
            />
          ) : question.type === 'long_answer' ? (
            <div>
              <textarea
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="Write your detailed answer…"
                rows={5}
                className="input-field resize-none"
                autoFocus
              />
              {question.points && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-1">Key points to include:</p>
                  <ul className="space-y-1">
                    {question.points.map((p, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-slate-500">
                        <CheckCircle2 className="h-3 w-3 mt-0.5 text-indigo-500" /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : question.type === 'multiple_answer' ? (
            question.options?.map((opt, i) => {
              const isSelected = multiSelected.has(opt);
              return (
                <button
                  key={i}
                  onClick={() => toggleMulti(opt)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border-2 text-sm font-bold ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500 text-white'
                        : 'border-slate-300 text-slate-400'
                    }`}
                  >
                    {isSelected ? <CheckCircle2 className="h-4 w-4" /> : String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-sm text-slate-700">{opt}</span>
                </button>
              );
            })
          ) : (
            question.options?.map((opt, i) => {
              const isSelected = selected === opt;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(opt)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500 text-white'
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
            disabled={isDisabled}
            className="btn-primary"
          >
            {isLast ? 'Finish' : 'Next'}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>Score: <strong className="text-slate-900">{score}</strong></span>
        <span>Correct: <strong className="text-indigo-600">{correctCount}</strong></span>
      </div>
    </div>
  );
}
