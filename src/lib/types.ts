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
  | 'crossword'
  | 'timeline'
  | 'sorting'
  | 'conceptmap';

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

export type TeacherMode = 'eli6' | 'eli12' | 'highschool' | 'university' | 'professional' | 'teacher';

// ─── Document Analysis Types ──────────────────────────────────────────────────

export interface Concept {
  term: string;
  definition: string;
  occurrences: number;
  type?: string;
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

export interface ImportantPerson {
  name: string;
  role: string;
  description: string;
}

export interface ImportantPlace {
  name: string;
  description: string;
}

export interface ImportantDate {
  date: string;
  event: string;
}

export interface ImportantNumber {
  value: string;
  context: string;
}

export interface Formula {
  formula: string;
  description: string;
}

export interface CauseEffect {
  cause: string;
  effect: string;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  type: string;
}

export interface KnowledgeGraphEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface KnowledgeGraph {
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface DocumentAnalysis {
  title: string;
  subtitle?: string;
  summary: string;
  executive_summary?: string;
  beginner_summary?: string;
  student_summary?: string;
  teacher_summary?: string;
  chapters: ChapterSection[];
  concepts: Concept[];
  keywords: string[];
  learning_objectives: string[];
  important_terms: ImportantTerm[];
  glossary: GlossaryEntry[];
  important_people?: ImportantPerson[];
  places?: ImportantPlace[];
  dates?: ImportantDate[];
  numbers?: ImportantNumber[];
  formulas?: Formula[];
  cause_effect?: CauseEffect[];
  examples?: string[];
  frequently_repeated?: string[];
  knowledge_graph?: KnowledgeGraph;
  difficulty: Difficulty;
  estimatedAge: string;
  estimated_study_time?: number;
  concept_count?: number;
  language: string;
  stats: {
    pages: number;
    words: number;
    sentences: number;
    avgWordsPerSentence: number;
  };
}

// ─── Game Content Types ───────────────────────────────────────────────────────

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'multiple_answer' | 'true_false' | 'fill_blank' | 'short_answer' | 'long_answer';
  question: string;
  options?: string[];
  answer: string;
  answers?: string[];
  explanation?: string;
  concept: string;
  difficulty: Difficulty;
  bloom_level?: BloomLevel;
  points?: string[];
}

export interface QuizGame {
  questions: QuizQuestion[];
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  hint?: string;
  category: string;
  difficulty: Difficulty;
  bloom_level?: BloomLevel;
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

export interface TimelineEvent {
  id: string;
  date: string;
  event: string;
  description: string;
  order: number;
}

export interface TimelineGame {
  events: TimelineEvent[];
}

export interface SortingCategory {
  id: string;
  name: string;
  items: string[];
}

export interface SortingItem {
  id: string;
  label: string;
  category: string;
}

export interface SortingGame {
  categories: SortingCategory[];
  items: SortingItem[];
}

export interface ConceptMapNode {
  id: string;
  label: string;
  type: 'central' | 'related' | 'example';
}

export interface ConceptMapEdge {
  source: string;
  target: string;
  label: string;
}

export interface ConceptMapGame {
  nodes: ConceptMapNode[];
  edges: ConceptMapEdge[];
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
  | CrosswordGame
  | TimelineGame
  | SortingGame
  | ConceptMapGame;

export interface GameConfig {
  questionCount?: number;
  difficulty?: Difficulty;
  learningMode?: 'child' | 'student' | 'professional';
  bloomLevel?: BloomLevel;
}

// ─── Database Row Types ───────────────────────────────────────────────────────

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
  subtitle?: string | null;
  estimated_study_time?: number | null;
  concept_count?: number | null;
  executive_summary?: string | null;
  beginner_summary?: string | null;
  student_summary?: string | null;
  teacher_summary?: string | null;
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
  xp_earned?: number;
  coins_earned?: number;
  bloom_level?: string;
  time_bonus?: number;
  created_at: string;
}

// ─── Gamification Types ───────────────────────────────────────────────────────

export interface UserStats {
  id: string;
  total_xp: number;
  coins: number;
  level: number;
  streak_days: number;
  last_activity_date: string | null;
  total_games_played: number;
  total_correct_answers: number;
  total_questions_answered: number;
  best_score: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xp_reward: number;
  condition: any;
  earned?: boolean;
  earned_at?: string;
}

export interface Mission {
  id: string;
  type: 'daily' | 'weekly';
  description: string;
  target: number;
  progress: number;
  xp_reward: number;
  coins_reward: number;
  completed: boolean;
  expires_at: string | null;
}

export interface LearningPath {
  id: string;
  document_id: string;
  type: 'daily' | 'weekly' | 'roadmap';
  title: string;
  description: string;
  data: any;
  estimated_completion_date: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface Recommendation {
  type: string;
  reason: string;
  specific_content: string;
  priority: 'high' | 'medium' | 'low';
}

export interface RecommendationResponse {
  weak_topics: string[];
  recommendations: Recommendation[];
  next_steps: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

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
  timeline: 'Timeline',
  sorting: 'Sorting Game',
  conceptmap: 'Concept Map',
};

export const GAME_DESCRIPTIONS: Record<GameType, string> = {
  quiz: 'Multiple choice, multiple answer, true/false, fill-in-the-blank, short and long answer questions with Bloom\'s Taxonomy levels.',
  flashcards: 'Flip cards with questions, answers, hints, categories, and difficulty levels.',
  matching: 'Match concepts with their correct definitions.',
  wordsearch: 'Find hidden vocabulary words in a letter grid.',
  unscramble: 'Rearrange shuffled letters to form key terms.',
  hangman: 'Guess vocabulary words letter by letter.',
  memory: 'Flip cards to find matching concept-definition pairs.',
  sequence: 'Arrange process or learning steps in the correct order.',
  crossword: 'Solve a crossword using concept-based clues.',
  timeline: 'Arrange events in chronological order on a timeline.',
  sorting: 'Categorize items into the correct groups.',
  conceptmap: 'Build a visual concept map showing how ideas connect.',
};

export const BLOOM_LABELS: Record<BloomLevel, string> = {
  remember: 'Remember',
  understand: 'Understand',
  apply: 'Apply',
  analyze: 'Analyze',
  evaluate: 'Evaluate',
  create: 'Create',
};

export const TEACHER_MODE_LABELS: Record<TeacherMode, string> = {
  eli6: "Explain Like I'm 6",
  eli12: "Explain Like I'm 12",
  highschool: 'High School',
  university: 'University',
  professional: 'Professional',
  teacher: 'Teacher Mode',
};
