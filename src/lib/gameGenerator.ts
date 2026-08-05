import type {
  DocumentAnalysis,
  GameType,
  QuizGame,
  QuizQuestion,
  FlashcardsGame,
  Flashcard,
  MatchingGame,
  MatchingPair,
  WordSearchGame,
  UnscrambleGame,
  UnscrambleItem,
  HangmanGame,
  MemoryGame,
  MemoryPair,
  SequenceGame,
  SequenceItem,
  CrosswordGame,
  CrosswordClue,
  Difficulty,
} from '@/lib/types';

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickDifficulty(): Difficulty {
  const r = Math.random();
  return r < 0.4 ? 'Beginner' : r < 0.8 ? 'Intermediate' : 'Advanced';
}

function scrambleWord(word: string): string {
  if (word.length < 3) return word;
  let scrambled = word;
  let attempts = 0;
  while (scrambled === word && attempts < 20) {
    scrambled = shuffle(word.split('')).join('');
    attempts++;
  }
  return scrambled;
}

function makeDistractors(correct: string, pool: string[], count: number): string[] {
  const others = pool.filter((p) => p.toLowerCase() !== correct.toLowerCase());
  const selected = shuffle(others).slice(0, count);
  while (selected.length < count) {
    selected.push(`Option ${selected.length + 1}`);
  }
  return selected;
}

export function generateQuiz(
  analysis: DocumentAnalysis,
  count: number,
): QuizGame {
  const concepts = analysis.concepts;
  const keywords = analysis.keywords;
  const sentences = analysis.summary.split(/(?<=[.!?])\s+/).filter((s) => s.length > 20);
  const questions: QuizQuestion[] = [];

  const usedTerms = new Set<string>();

  // Multiple choice from concepts
  for (const c of shuffle(concepts)) {
    if (questions.length >= count) break;
    if (usedTerms.has(c.term.toLowerCase())) continue;
    usedTerms.add(c.term.toLowerCase());
    const distractors = makeDistractors(
      c.definition,
      concepts.map((x) => x.definition),
      3,
    );
    const options = shuffle([c.definition, ...distractors]);
    questions.push({
      id: uid('q'),
      type: 'multiple_choice',
      question: `Which of the following best defines "${c.term}"?`,
      options,
      answer: c.definition,
      explanation: `"${c.term}" refers to: ${c.definition}`,
      concept: c.term,
      difficulty: pickDifficulty(),
    });
  }

  // True/False from definitions
  for (const c of shuffle(concepts)) {
    if (questions.length >= count) break;
    if (usedTerms.has(c.term.toLowerCase())) continue;
    usedTerms.add(c.term.toLowerCase());
    const isTrue = Math.random() > 0.5;
    const otherDef = concepts.find((x) => x.term !== c.term);
    const statement = isTrue
      ? c.definition
      : otherDef
        ? otherDef.definition
        : c.definition + ' (incorrect context)';
    questions.push({
      id: uid('q'),
      type: 'true_false',
      question: `True or False: "${c.term}" — ${statement}`,
      options: ['True', 'False'],
      answer: isTrue ? 'True' : 'False',
      explanation: isTrue
        ? `This is the correct definition of "${c.term}".`
        : `This is not the correct definition of "${c.term}".`,
      concept: c.term,
      difficulty: 'Beginner',
    });
  }

  // Fill in the blank from keywords
  for (const kw of shuffle(keywords)) {
    if (questions.length >= count) break;
    if (usedTerms.has(kw.toLowerCase())) continue;
    usedTerms.add(kw.toLowerCase());
    const sentence = sentences.find((s) => s.toLowerCase().includes(kw));
    if (sentence) {
      const blanked = sentence.replace(new RegExp(kw, 'i'), '_____');
      questions.push({
        id: uid('q'),
        type: 'fill_blank',
        question: `Fill in the blank: ${blanked}`,
        answer: kw,
        explanation: `The missing word is "${kw}".`,
        concept: kw,
        difficulty: 'Intermediate',
      });
    } else {
      questions.push({
        id: uid('q'),
        type: 'fill_blank',
        question: `Fill in the blank: A key term in this document is "${kw}". What belongs in the blank? The document discusses _____.`,
        answer: kw,
        explanation: `The key term is "${kw}".`,
        concept: kw,
        difficulty: 'Intermediate',
      });
    }
  }

  // Short answer from concepts
  for (const c of shuffle(concepts)) {
    if (questions.length >= count) break;
    if (usedTerms.has(c.term.toLowerCase())) continue;
    usedTerms.add(c.term.toLowerCase());
    questions.push({
      id: uid('q'),
      type: 'short_answer',
      question: `Briefly explain the concept of "${c.term}".`,
      answer: c.definition,
      explanation: c.definition,
      concept: c.term,
      difficulty: 'Advanced',
    });
  }

  // Pad if needed
  while (questions.length < count && concepts.length > 0) {
    const c = concepts[questions.length % concepts.length];
    questions.push({
      id: uid('q'),
      type: 'multiple_choice',
      question: `What is "${c.term}"?`,
      options: shuffle([c.definition, ...makeDistractors(c.definition, concepts.map((x) => x.definition), 3)]),
      answer: c.definition,
      explanation: c.definition,
      concept: c.term,
      difficulty: 'Beginner',
    });
  }

  return { questions: questions.slice(0, count) };
}

export function generateFlashcards(analysis: DocumentAnalysis): FlashcardsGame {
  const cards: Flashcard[] = [];

  for (const c of analysis.concepts) {
    cards.push({
      id: uid('f'),
      question: `What is ${c.term}?`,
      answer: c.definition,
      category: 'Concept',
      difficulty: pickDifficulty(),
    });
  }
  for (const t of analysis.important_terms || []) {
    if (cards.some((c) => c.question.includes(t.term))) continue;
    cards.push({
      id: uid('f'),
      question: `Define: ${t.term}`,
      answer: t.definition,
      category: 'Important Term',
      difficulty: pickDifficulty(),
    });
  }
  for (const g of analysis.glossary || []) {
    if (cards.some((c) => c.question.includes(g.term))) continue;
    cards.push({
      id: uid('f'),
      question: `Glossary: ${g.term}`,
      answer: g.definition,
      category: 'Glossary',
      difficulty: 'Beginner',
    });
  }
  for (const kw of analysis.keywords.slice(0, 15)) {
    if (cards.some((c) => c.question.toLowerCase().includes(kw.toLowerCase()))) continue;
    cards.push({
      id: uid('f'),
      question: `Define or describe: ${kw}`,
      answer: `A key term mentioned in ${analysis.title}.`,
      category: 'Keyword',
      difficulty: 'Beginner',
    });
  }
  return { cards: cards.slice(0, 40) };
}

export function generateMatching(analysis: DocumentAnalysis): MatchingGame {
  const pairs: MatchingPair[] = [];
  for (const c of analysis.concepts.slice(0, 10)) {
    pairs.push({ id: uid('m'), concept: c.term, definition: c.definition });
  }
  if (pairs.length < 8) {
    for (const t of analysis.important_terms || []) {
      if (pairs.length >= 10) break;
      if (pairs.some((p) => p.concept === t.term)) continue;
      pairs.push({ id: uid('m'), concept: t.term, definition: t.definition });
    }
  }
  if (pairs.length < 4) {
    for (const kw of analysis.keywords) {
      if (pairs.length >= 8) break;
      pairs.push({
        id: uid('m'),
        concept: kw,
        definition: `A key term from the document.`,
      });
    }
  }
  return { pairs };
}

export function generateWordSearch(analysis: DocumentAnalysis): WordSearchGame {
  const words = analysis.keywords
    .filter((w) => w.length >= 3 && w.length <= 12 && /^[a-z]+$/i.test(w))
    .slice(0, 10);
  const size = 14;
  const grid: string[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ''),
  );

  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [0, -1],
  ];

  for (const word of words) {
    let placed = false;
    for (let attempt = 0; attempt < 50 && !placed; attempt++) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);
      const endRow = row + dir[0] * (word.length - 1);
      const endCol = col + dir[1] * (word.length - 1);
      if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;
      let fits = true;
      for (let i = 0; i < word.length; i++) {
        const r = row + dir[0] * i;
        const c = col + dir[1] * i;
        if (grid[r][c] !== '' && grid[r][c] !== word[i].toUpperCase()) {
          fits = false;
          break;
        }
      }
      if (!fits) continue;
      for (let i = 0; i < word.length; i++) {
        const r = row + dir[0] * i;
        const c = col + dir[1] * i;
        grid[r][c] = word[i].toUpperCase();
      }
      placed = true;
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      }
    }
  }

  return {
    grid,
    words: words.map((w) => ({ word: w.toUpperCase(), clue: w, found: false })),
    size,
  };
}

export function generateUnscramble(analysis: DocumentAnalysis): UnscrambleGame {
  const items: UnscrambleItem[] = analysis.keywords
    .filter((w) => w.length >= 4 && w.length <= 15 && /^[a-z]+$/i.test(w))
    .slice(0, 12)
    .map((w) => ({
      id: uid('u'),
      scrambled: scrambleWord(w.toUpperCase()),
      answer: w.toUpperCase(),
      clue: `A key term from ${analysis.title}`,
    }));
  return { items };
}

export function generateHangman(analysis: DocumentAnalysis): HangmanGame {
  const words = analysis.keywords
    .filter((w) => w.length >= 4 && w.length <= 14 && /^[a-z]+$/i.test(w))
    .slice(0, 15)
    .map((w) => ({
      word: w.toUpperCase(),
      hint: `A key term from ${analysis.title}`,
    }));
  if (words.length === 0) {
    analysis.concepts.forEach((c) =>
      words.push({ word: c.term.toUpperCase().slice(0, 14), hint: c.definition }),
    );
  }
  return { words };
}

export function generateMemory(analysis: DocumentAnalysis): MemoryGame {
  const pairs: MemoryPair[] = [];
  for (const c of analysis.concepts.slice(0, 8)) {
    pairs.push({ id: uid('mem'), concept: c.term, definition: c.definition });
  }
  if (pairs.length < 6) {
    for (const t of analysis.important_terms || []) {
      if (pairs.length >= 8) break;
      if (pairs.some((p) => p.concept === t.term)) continue;
      pairs.push({ id: uid('mem'), concept: t.term, definition: t.definition });
    }
  }
  if (pairs.length < 3) {
    analysis.keywords.slice(0, 6).forEach((kw) =>
      pairs.push({
        id: uid('mem'),
        concept: kw,
        definition: `Key term from ${analysis.title}`,
      }),
    );
  }
  return { pairs: pairs.slice(0, 8) };
}

export function generateSequence(analysis: DocumentAnalysis): SequenceGame {
  const items: SequenceItem[] = [];

  if (analysis.learning_objectives && analysis.learning_objectives.length >= 3) {
    analysis.learning_objectives.slice(0, 8).forEach((obj, i) => {
      items.push({ id: uid('s'), step: obj, order: i + 1 });
    });
  } else {
    const chapters = analysis.chapters.filter((c) => c.heading.length > 3);
    if (chapters.length >= 3) {
      chapters.slice(0, 8).forEach((ch, i) => {
        items.push({ id: uid('s'), step: ch.heading, order: i + 1 });
      });
    } else {
      const sentences = analysis.summary
        .split(/(?<=[.!?])\s+/)
        .filter((s) => s.length > 20)
        .slice(0, 6);
      sentences.forEach((s, i) => {
        items.push({ id: uid('s'), step: s, order: i + 1 });
      });
    }
  }
  return { items };
}

export function generateCrossword(analysis: DocumentAnalysis): CrosswordGame {
  const terms = analysis.concepts
    .filter((c) => /^[a-z\s]+$/i.test(c.term) && c.term.length >= 3 && c.term.length <= 12)
    .slice(0, 10)
    .map((c) => ({ word: c.term.toUpperCase().replace(/\s/g, ''), clue: c.definition }));

  if (terms.length === 0) {
    analysis.keywords
      .filter((w) => w.length >= 3 && w.length <= 12 && /^[a-z]+$/i.test(w))
      .slice(0, 10)
      .forEach((w) => terms.push({ word: w.toUpperCase(), clue: `Key term: ${w}` }));
  }

  const size = 15;
  const grid: (string | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null),
  );
  const clues: CrosswordClue[] = [];
  let number = 1;

  // Place first word horizontally in the middle
  if (terms.length > 0) {
    const first = terms[0];
    const startRow = Math.floor(size / 2);
    const startCol = Math.floor((size - first.word.length) / 2);
    for (let i = 0; i < first.word.length; i++) {
      grid[startRow][startCol + i] = first.word[i];
    }
    clues.push({
      word: first.word,
      clue: first.clue,
      row: startRow,
      col: startCol,
      direction: 'across',
      number,
    });
    number++;
  }

  // Place remaining words by intersecting
  for (let t = 1; t < terms.length; t++) {
    const term = terms[t];
    let placed = false;
    for (const clue of [...clues]) {
      for (let i = 0; i < clue.word.length && !placed; i++) {
        const letter = clue.word[i];
        const idx = term.word.indexOf(letter);
        if (idx === -1) continue;
        let row: number, col: number;
        if (clue.direction === 'across') {
          row = clue.row + 1;
          col = clue.col + i - idx;
        } else {
          row = clue.row + i - idx;
          col = clue.col + 1;
        }
        if (row < 0 || col < 0 || row + term.word.length > size || col + term.word.length > size) continue;
        if (clue.direction === 'across') {
          let fits = true;
          for (let j = 0; j < term.word.length; j++) {
            const r = row + j;
            const c = col;
            if (grid[r][c] !== null && grid[r][c] !== term.word[j]) {
              fits = false;
              break;
            }
          }
          if (!fits) continue;
          for (let j = 0; j < term.word.length; j++) {
            grid[row + j][col] = term.word[j];
          }
          clues.push({
            word: term.word,
            clue: term.clue,
            row,
            col,
            direction: 'down',
            number,
          });
          number++;
          placed = true;
        } else {
          let fits = true;
          for (let j = 0; j < term.word.length; j++) {
            const r = row;
            const c = col + j;
            if (grid[r][c] !== null && grid[r][c] !== term.word[j]) {
              fits = false;
              break;
            }
          }
          if (!fits) continue;
          for (let j = 0; j < term.word.length; j++) {
            grid[row][col + j] = term.word[j];
          }
          clues.push({
            word: term.word,
            clue: term.clue,
            row,
            col,
            direction: 'across',
            number,
          });
          number++;
          placed = true;
        }
      }
      if (placed) break;
    }
  }

  return { grid, clues, size };
}

export function generateGame(
  type: GameType,
  analysis: DocumentAnalysis,
  config: { questionCount?: number } = {},
): any {
  switch (type) {
    case 'quiz':
      return generateQuiz(analysis, config.questionCount ?? 10);
    case 'flashcards':
      return generateFlashcards(analysis);
    case 'matching':
      return generateMatching(analysis);
    case 'wordsearch':
      return generateWordSearch(analysis);
    case 'unscramble':
      return generateUnscramble(analysis);
    case 'hangman':
      return generateHangman(analysis);
    case 'memory':
      return generateMemory(analysis);
    case 'sequence':
      return generateSequence(analysis);
    case 'crossword':
      return generateCrossword(analysis);
  }
}
