import { Link } from 'react-router-dom';
import {
  BookOpen,
  Upload,
  Sparkles,
  Brain,
  Trophy,
  Layers,
  Zap,
  Target,
  Clock,
  CheckCircle2,
  ArrowRight,
  FileText,
  Gamepad2,
  GraduationCap,
  Users,
  Grid3x3,
  Shuffle,
  ListOrdered,
  MessageCircle,
  Globe,
  Languages,
  Presentation,
  ClipboardList,
  Wand2,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';

const features = [
  {
    icon: Sparkles,
    title: 'AI Summary',
    description: 'Get instant summaries, key points, and keywords from any PDF — in any language.',
  },
  {
    icon: Target,
    title: 'AI Quiz Generator',
    description: 'Generate 10, 20, 50, or 100 quiz questions. Multiple choice, true/false, fill-in-the-blank, and essay.',
  },
  {
    icon: Layers,
    title: 'AI Flashcards',
    description: 'Turn any document into vocabulary, concept, formula, and memory flashcards.',
  },
  {
    icon: Gamepad2,
    title: 'AI Game Generator',
    description: '9 game types that adapt to your document — math games, vocabulary games, timeline games, and more.',
  },
  {
    icon: MessageCircle,
    title: 'AI Teacher Mode',
    description: 'Chat with an AI teacher that knows your document. Ask questions, get explanations, and learn at your pace.',
  },
  {
    icon: ClipboardList,
    title: 'AI Worksheet Generator',
    description: 'Create worksheets, exercises, and evaluations. Export to PDF or DOCX.',
  },
  {
    icon: Presentation,
    title: 'AI Presentation Maker',
    description: 'Turn any PDF into slide presentations with teacher notes.',
  },
  {
    icon: Globe,
    title: 'Multi-Language Support',
    description: 'Works with any language — English, Indonesian, Arabic, Chinese, and more.',
  },
];

const gameTypes = [
  { icon: Target, label: 'Quiz Battle', color: 'from-teal-500 to-emerald-500' },
  { icon: Brain, label: 'Matching Cards', color: 'from-amber-500 to-orange-500' },
  { icon: Grid3x3, label: 'Word Puzzle', color: 'from-sky-500 to-blue-500' },
  { icon: CheckCircle2, label: 'True/False', color: 'from-rose-500 to-pink-500' },
  { icon: Layers, label: 'Memory Game', color: 'from-violet-500 to-purple-500' },
  { icon: Shuffle, label: 'Drag & Drop', color: 'from-cyan-500 to-teal-500' },
  { icon: ListOrdered, label: 'Timeline', color: 'from-indigo-500 to-blue-500' },
  { icon: Gamepad2, label: 'Guess Answer', color: 'from-orange-500 to-red-500' },
];

const steps = [
  {
    icon: Upload,
    title: 'Upload any PDF',
    description: 'Textbooks, novels, holy books, research papers, worksheets — any PDF in any language.',
  },
  {
    icon: Brain,
    title: 'AI understands it',
    description: 'Our AI reads the entire document, extracts concepts, and builds a structured learning model.',
  },
  {
    icon: Wand2,
    title: 'Generate & learn',
    description: 'Create quizzes, games, flashcards, worksheets, or chat with the AI teacher — all in seconds.',
  },
];

const audience = [
  { icon: BookOpen, label: 'Kids' },
  { icon: GraduationCap, label: 'Students' },
  { icon: Users, label: 'Teachers' },
  { icon: Briefcase, label: 'Professionals' },
  { icon: FileText, label: 'Researchers' },
  { icon: Presentation, label: 'Schools' },
];

const supportedDocs = [
  'Textbooks (SD, SMP, SMA)',
  'Holy books & religious texts',
  'Novels & literature',
  'Research journals',
  'Foreign language books',
  'Math & science books',
  'Children\'s books',
  'Work documents',
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-50/60 via-white to-white" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-700">
              <Sparkles className="h-4 w-4" />
              AI Document Learning Platform
            </div>
            <h1 className="font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Turn any PDF into your{' '}
              <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
                private AI teacher
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
              Upload any PDF — textbooks, holy books, novels, research papers — and BOOK2GAME AI
              transforms it into quizzes, games, flashcards, worksheets, and an interactive AI tutor.
              In any language.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/upload" className="btn-primary text-base">
                <Upload className="h-5 w-5" />
                Upload a PDF
              </Link>
              <Link to="/dashboard" className="btn-secondary text-base">
                View Dashboard
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Floating preview cards */}
          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4">
            {gameTypes.slice(0, 4).map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="animate-slide-up card flex flex-col items-center gap-3 p-5"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${card.color} shadow-sm`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{card.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            { icon: FileText, value: 'Any PDF', label: 'Textbooks, novels, journals, holy books' },
            { icon: Globe, value: 'Any Language', label: 'English, Indonesian, Arabic, Chinese, more' },
            { icon: Zap, value: '9 Games', label: 'AI-generated per document' },
            { icon: Clock, value: 'Seconds', label: 'From upload to interactive learning' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="text-center">
                <Icon className="mx-auto mb-2 h-6 w-6 text-teal-600" />
                <div className="font-display text-2xl font-bold text-slate-900">{stat.value}</div>
                <div className="mt-1 text-sm text-slate-500">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Three steps from a static PDF to an interactive learning experience.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="relative">
                <div className="card h-full p-8">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
                    <Icon className="h-6 w-6 text-teal-600" />
                  </div>
                  <div className="mb-2 text-sm font-bold uppercase tracking-wider text-teal-600">
                    Step {i + 1}
                  </div>
                  <h3 className="font-display text-xl font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-slate-600">{step.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Supported documents */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Supports every kind of document
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              From children's books to research papers — if it's a PDF, our AI can learn from it.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            {supportedDocs.map((doc) => (
              <div key={doc} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-teal-500" />
                {doc}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to learn
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            A complete AI-powered learning platform built around your documents.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="animate-fade-in card group p-6"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-sm transition-transform group-hover:scale-110">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-display text-base font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Game types */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              8 ways to learn from every document
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Games adapt to your document — math PDFs get counting games, history PDFs get timeline games, language PDFs get vocabulary games.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {gameTypes.map((game, i) => {
              const Icon = game.icon;
              return (
                <div
                  key={game.label}
                  className="animate-fade-in card group flex flex-col items-center gap-3 p-5"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${game.color} shadow-sm transition-transform group-hover:scale-110`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{game.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Audience */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Built for everyone who learns or teaches
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
          {audience.map((a) => {
            const Icon = a.icon;
            return (
              <div
                key={a.label}
                className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center transition-all hover:border-teal-300 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50">
                  <Icon className="h-6 w-6 text-teal-600" />
                </div>
                <span className="text-sm font-semibold text-slate-700">{a.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-teal-600 to-emerald-700 py-20">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to make learning fun?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-teal-50">
            Upload your first PDF and generate quizzes, games, flashcards, and an AI tutor in under a minute.
          </p>
          <Link
            to="/upload"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-teal-700 shadow-lg transition-all hover:bg-teal-50 hover:shadow-xl active:scale-[0.98]"
          >
            <Upload className="h-5 w-5" />
            Upload a PDF
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-sm font-bold text-slate-900">BOOK2GAME AI</span>
          </div>
          <p className="text-sm text-slate-500">
            AI that turns every PDF into a private teacher, games, quizzes, and interactive learning.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Briefcase(props: any) {
  return <Layers {...props} />;
}
