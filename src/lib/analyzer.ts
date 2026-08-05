import type {
  DocumentAnalysis,
  ChapterSection,
  Concept,
  Difficulty,
} from '@/lib/types';
import { STOPWORDS } from '@/lib/stopwords';

interface Page {
  pageNumber: number;
  text: string;
}

const SENTENCE_REGEX = /[^.!?]+[.!?]+/g;
const HEADING_PATTERNS = [
  /^\s*chapter\s+\d+/i,
  /^\s*unit\s+\d+/i,
  /^\s*lesson\s+\d+/i,
  /^\s*section\s+\d+/i,
  /^\s*part\s+\d+/i,
  /^\s*module\s+\d+/i,
  /^\s*\d+(\.\d+)*\s+[A-Z]/,
  /^\s*[A-Z][A-Za-z\s]{2,60}$/,
];

const PAGE_NUMBER_REGEX = /^\s*\d{1,4}\s*$/;
const SHORT_HEADER_FOOTER_REGEX = /^[A-Za-z0-9\s.,'&-]{1,60}$/;

export function analyzeDocument(
  pages: Page[],
  fullText: string,
  fileName: string,
): DocumentAnalysis {
  const cleanedPages = pages.map((p) => cleanPageText(p));
  const cleanedText = cleanedPages.map((p) => p.text).join('\n\n');

  const sentences = extractSentences(cleanedText);
  const words = extractWords(cleanedText);
  const title = deriveTitle(fileName, cleanedText);
  const chapters = detectChapters(cleanedPages);
  const concepts = extractConcepts(cleanedText);
  const keywords = extractKeywords(words, concepts);
  const summary = buildSummary(sentences, concepts);
  const difficulty = estimateDifficulty(sentences, words);
  const estimatedAge = estimateAge(difficulty);
  const language = detectLanguage(cleanedText);

  return {
    title,
    summary,
    chapters,
    concepts,
    keywords,
    learning_objectives: [],
    important_terms: [],
    glossary: [],
    difficulty,
    estimatedAge,
    language,
    stats: {
      pages: pages.length,
      words: words.length,
      sentences: sentences.length,
      avgWordsPerSentence: sentences.length
        ? Math.round((words.length / sentences.length) * 10) / 10
        : 0,
    },
  };
}

function cleanPageText(page: Page): Page {
  const lines = page.text.split('\n');
  const filtered = lines.filter((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    if (PAGE_NUMBER_REGEX.test(trimmed)) return false;
    if (idx < 3 && SHORT_HEADER_FOOTER_REGEX.test(trimmed) && trimmed.length < 40) {
      if (!/[.!?]$/.test(trimmed) && trimmed.split(/\s+/).length <= 6) return false;
    }
    if (idx >= lines.length - 3 && SHORT_HEADER_FOOTER_REGEX.test(trimmed) && trimmed.length < 40) {
      if (!/[.!?]$/.test(trimmed) && trimmed.split(/\s+/).length <= 6) return false;
    }
    return true;
  });
  return { ...page, text: filtered.join('\n') };
}

function extractSentences(text: string): string[] {
  return (text.match(SENTENCE_REGEX) || [])
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 4);
}

function extractWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-zà-ÿ\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function deriveTitle(fileName: string, text: string): string {
  const fromFile = fileName
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const firstLines = text.split('\n').filter((l) => l.trim()).slice(0, 5);
  for (const line of firstLines) {
    const trimmed = line.trim();
    if (trimmed.length >= 5 && trimmed.length <= 120 && /^[A-Z0-9]/.test(trimmed)) {
      if (!HEADING_PATTERNS.some((p) => p.test(trimmed))) {
        return trimmed.replace(/\s+/g, ' ');
      }
    }
  }
  return fromFile || 'Untitled Document';
}

function detectChapters(pages: Page[]): ChapterSection[] {
  const chapters: ChapterSection[] = [];
  for (const page of pages) {
    const lines = page.text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 3) continue;
      if (HEADING_PATTERNS.some((p) => p.test(trimmed))) {
        const level = /^chapter\s+\d+/i.test(trimmed) || /^unit\s+\d+/i.test(trimmed)
          ? 1
          : /^\d+\.\d+/.test(trimmed)
            ? 2
            : 3;
        chapters.push({
          heading: trimmed.replace(/\s+/g, ' '),
          level,
          page: page.pageNumber,
          text: '',
        });
      }
    }
  }
  if (chapters.length === 0) {
    const firstPage = pages[0];
    if (firstPage) {
      chapters.push({
        heading: 'Main Content',
        level: 1,
        page: 1,
        text: '',
      });
    }
  }
  return chapters.slice(0, 50);
}

function extractConcepts(text: string): Concept[] {
  const termCounts = new Map<string, number>();
  const definitionPatterns = [
    /([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+(?:is|are|refers to|means|describes|is defined as|is called)\s+([^.]{15,200})/g,
    /(?:definition of|meaning of|concept of)\s+([A-Za-z][A-Za-z\s]{2,40}?)\s*[:\-—]\s*([^.]{15,200})/g,
  ];

  for (const pattern of definitionPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const term = match[1].trim();
      const definition = match[2].trim();
      if (term.length < 3 || definition.length < 15) continue;
      if (STOPWORDS.has(term.toLowerCase())) continue;
      const key = term.toLowerCase();
      termCounts.set(key, (termCounts.get(key) || 0) + 1);
      if (!conceptMap.has(key)) {
        conceptMap.set(key, { term, definition, occurrences: 0 });
      }
      conceptMap.get(key)!.occurrences += 1;
    }
  }

  const concepts = Array.from(conceptMap.values())
    .filter((c) => c.definition.length >= 15)
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 40);

  conceptMap.clear();
  return concepts;
}

const conceptMap = new Map<string, Concept>();

function extractKeywords(words: string[], concepts: Concept[]): string[] {
  const freq = new Map<string, number>();
  for (const w of words) {
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  const conceptTerms = new Set(concepts.map((c) => c.term.toLowerCase()));
  const sorted = Array.from(freq.entries())
    .filter(([w, c]) => c >= 3 && w.length > 3 && !STOPWORDS.has(w))
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  const keywords: string[] = [];
  for (const w of sorted) {
    if (conceptTerms.has(w)) continue;
    keywords.push(w);
    if (keywords.length >= 25) break;
  }
  const allTerms = [...concepts.map((c) => c.term.toLowerCase()), ...keywords];
  return Array.from(new Set(allTerms)).slice(0, 30);
}

function buildSummary(sentences: string[], concepts: Concept[]): string {
  if (sentences.length === 0) return 'No readable text was extracted from this document.';
  const scored = sentences.slice(0, 200).map((s, i) => {
    let score = 0;
    const lower = s.toLowerCase();
    for (const c of concepts.slice(0, 10)) {
      if (lower.includes(c.term.toLowerCase())) score += 2;
    }
    if (/^(this|these|the following|here|in this)/i.test(s)) score += 1;
    if (i < 5) score += 3;
    score += Math.min(s.split(/\s+/).length / 20, 2);
    return { s, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3).map((x) => x.s);
  return top.join(' ');
}

function estimateDifficulty(sentences: string[], words: string[]): Difficulty {
  if (sentences.length === 0) return 'Beginner';
  const avgLen = words.length / Math.max(sentences.length, 1);
  const longWords = words.filter((w) => w.length > 8).length;
  const longRatio = longWords / Math.max(words.length, 1);
  if (avgLen > 22 || longRatio > 0.18) return 'Advanced';
  if (avgLen > 15 || longRatio > 0.1) return 'Intermediate';
  return 'Beginner';
}

function estimateAge(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'Beginner':
      return '8-12 years';
    case 'Intermediate':
      return '13-17 years';
    case 'Advanced':
      return '18+ years';
  }
}

function detectLanguage(text: string): string {
  const sample = text.slice(0, 1000).toLowerCase();
  const enMarkers = /\b(the|and|is|of|to|in|that|for|with|are|this)\b/g;
  const matches = sample.match(enMarkers);
  return matches && matches.length > 5 ? 'English' : 'Unknown';
}
