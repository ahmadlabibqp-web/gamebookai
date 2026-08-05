export type DocumentStatus = 'processing' | 'analyzed' | 'failed';

export type GameType =
  | 'quiz'
  | 'flashcards'
  | 'matching'
  | 'wordsearch'
  | 'unscramble'
  | 'hangman'
  | 'memory'
  | 'sequence'
  | 'crossword';

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface Concept {
  term: string;
  definition: string;
  occurrences: number;
}

export interface ChapterSection {
  heading: string;
  level: number;
  page: number;
  text: string;
}

export interface ImportantTerm {
  term: string;
  definition: string;
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export interface DocumentAnalysis {
  title: string;
  summary: string;
  chapters: ChapterSection[];
  concepts: Concept[];
  keywords: string[];
  learning_objectives: string[];
  important_terms: ImportantTerm[];
  glossary: GlossaryEntry[];
  difficulty: Difficulty;
  estimatedAge: string;
  language: string;
  stats: {
    pages: number;
    words: number;
    sentences: number;
    avgWordsPerSentence: number;
  };
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer';
  question: string;
  options?: string[];
  answer: string;
  explanation?: string;
  concept: string;
  difficulty: Difficulty;
}

export interface QuizGame {
  questions: QuizQuestion[];
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  category: string;
  difficulty: Difficulty;
}

export interface FlashcardsGame {
  cards: Flashcard[];
}

export interface MatchingPair {
  id: string;
  concept: string;
  definition: string;
}

export interface MatchingGame {
  pairs: MatchingPair[];
}

export interface WordSearchGame {
  grid: string[][];
  words: { word: string; clue: string; found: boolean }[];
  size: number;
}

export interface UnscrambleItem {
  id: string;
  scrambled: string;
  answer: string;
  clue: string;
}

export interface UnscrambleGame {
  items: UnscrambleItem[];
}

export interface HangmanGame {
  words: { word: string; hint: string }[];
}

export interface MemoryPair {
  id: string;
  concept: string;
  definition: string;
}

export interface MemoryGame {
  pairs: MemoryPair[];
}

export interface SequenceItem {
  id: string;
  step: string;
  order: number;
}

export interface SequenceGame {
  items: SequenceItem[];
}

export interface CrosswordClue {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
  number: number;
}

export interface CrosswordGame {
  grid: (string | null)[][];
  clues: CrosswordClue[];
  size: number;
}

export type GameContent =
  | QuizGame
  | FlashcardsGame
  | MatchingGame
  | WordSearchGame
  | UnscrambleGame
  | HangmanGame
  | MemoryGame
  | SequenceGame
  | CrosswordGame;

export interface GameConfig {
  questionCount?: number;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  learningMode?: 'child' | 'student' | 'professional';
}

export interface DocumentRow {
  id: string;
  title: string;
  file_name: string;
  page_count: number;
  word_count: number;
  status: DocumentStatus;
  summary: string | null;
  analysis: DocumentAnalysis | null;
  raw_text: string | null;
  difficulty: string | null;
  estimated_age: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameRow {
  id: string;
  document_id: string;
  type: GameType;
  title: string;
  config: GameConfig | null;
  content: any;
  created_at: string;
}

export interface GameSessionRow {
  id: string;
  game_id: string;
  document_id: string;
  score: number;
  max_score: number;
  correct: number;
  total: number;
  duration_ms: number;
  completed: boolean;
  answers: any;
  created_at: string;
}

export const GAME_LABELS: Record<GameType, string> = {
  quiz: 'Quiz',
  flashcards: 'Flashcards',
  matching: 'Matching',
  wordsearch: 'Word Search',
  unscramble: 'Unscramble',
  hangman: 'Hangman',
  memory: 'Memory Cards',
  sequence: 'Sequence',
  crossword: 'Crossword',
};

export const GAME_DESCRIPTIONS: Record<GameType, string> = {
  quiz: 'Multiple choice, true/false, fill-in-the-blank, and short answer questions.',
  flashcards: 'Flip cards with questions, answers, categories, and difficulty.',
  matching: 'Match concepts with their correct definitions.',
  wordsearch: 'Find hidden vocabulary words in a letter grid.',
  unscramble: 'Rearrange shuffled letters to form key terms.',
  hangman: 'Guess vocabulary words letter by letter.',
  memory: 'Flip cards to find matching concept-definition pairs.',
  sequence: 'Arrange process or learning steps in the correct order.',
  crossword: 'Solve a crossword using concept-based clues.',
};
