import jsPDF from 'jspdf';
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
} from 'docx';
import { saveAs } from 'file-saver';
import type { DocumentAnalysis, GameType } from '@/lib/types';
import { GAME_LABELS } from '@/lib/types';

export function exportCSV(data: any[], fileName: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = typeof row[h] === 'object' ? JSON.stringify(row[h]) : String(row[h] ?? '');
      return `"${val.replace(/"/g, '""')}"`;
    }).join(','),
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  saveAs(blob, fileName);
}

export function exportPrint(title: string, content: string) {
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`
    <html><head><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
      h1 { font-size: 24px; }
      h2 { font-size: 18px; margin-top: 24px; }
      .concept { margin-bottom: 12px; }
      @media print { body { padding: 0; } }
    </style></head><body>${content}</body></html>
  `);
  win.document.close();
  win.print();
}

export function exportJSON(data: any, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  saveAs(blob, fileName);
}

export function exportAnalysisPDF(analysis: DocumentAnalysis, title: string) {
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title || analysis.title, 20, y);
  y += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Difficulty: ${analysis.difficulty}  |  Age: ${analysis.estimatedAge}`, 20, y);
  y += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const summaryLines = doc.splitTextToSize(analysis.summary, 170);
  doc.text(summaryLines, 20, y);
  y += summaryLines.length * 6 + 6;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Concepts', 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  for (const c of analysis.concepts.slice(0, 20)) {
    const lines = doc.splitTextToSize(`${c.term}: ${c.definition}`, 170);
    if (y + lines.length * 6 > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines, 20, y);
    y += lines.length * 6 + 3;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Keywords', 20, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const kwLines = doc.splitTextToSize(analysis.keywords.join(', '), 170);
  doc.text(kwLines, 20, y);

  doc.save(`${title || analysis.title}-analysis.pdf`);
}

export function exportGamePDF(
  type: GameType,
  content: any,
  title: string,
) {
  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${GAME_LABELS[type]} — ${title}`, 20, y);
  y += 14;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  switch (type) {
    case 'quiz': {
      const quiz = content as { questions: any[] };
      quiz.questions.forEach((q, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.setFont('helvetica', 'bold');
        const qLines = doc.splitTextToSize(`${i + 1}. ${q.question}`, 170);
        doc.text(qLines, 20, y);
        y += qLines.length * 6;
        doc.setFont('helvetica', 'normal');
        if (q.options) {
          for (const opt of q.options) {
            const optLines = doc.splitTextToSize(`   - ${opt}`, 170);
            doc.text(optLines, 20, y);
            y += optLines.length * 6;
          }
        }
        const ansLines = doc.splitTextToSize(`Answer: ${q.answer}`, 170);
        doc.text(ansLines, 20, y);
        y += ansLines.length * 6 + 4;
      });
      break;
    }
    case 'flashcards': {
      const fc = content as { cards: any[] };
      fc.cards.forEach((c, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const qLines = doc.splitTextToSize(`${i + 1}. Q: ${c.question}`, 170);
        doc.text(qLines, 20, y);
        y += qLines.length * 6;
        const aLines = doc.splitTextToSize(`   A: ${c.answer}`, 170);
        doc.text(aLines, 20, y);
        y += aLines.length * 6 + 4;
      });
      break;
    }
    case 'matching': {
      const m = content as { pairs: any[] };
      m.pairs.forEach((p, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const lines = doc.splitTextToSize(
          `${i + 1}. ${p.concept}  —  ${p.definition}`,
          170,
        );
        doc.text(lines, 20, y);
        y += lines.length * 6 + 3;
      });
      break;
    }
    case 'wordsearch': {
      const ws = content as { grid: string[][]; words: any[] };
      doc.text('Words to find:', 20, y);
      y += 6;
      doc.text(ws.words.map((w) => w.word).join(', '), 20, y);
      y += 10;
      const cellSize = 8;
      const startX = 20;
      ws.grid.forEach((row, r) => {
        row.forEach((cell, c) => {
          doc.text(cell, startX + c * cellSize, y + r * cellSize);
        });
      });
      break;
    }
    case 'unscramble': {
      const u = content as { items: any[] };
      u.items.forEach((it, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const lines = doc.splitTextToSize(
          `${i + 1}. ${it.scrambled}  (Answer: ${it.answer})`,
          170,
        );
        doc.text(lines, 20, y);
        y += lines.length * 6 + 3;
      });
      break;
    }
    case 'hangman': {
      const h = content as { words: any[] };
      h.words.forEach((w, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const lines = doc.splitTextToSize(
          `${i + 1}. ${w.word}  — Hint: ${w.hint}`,
          170,
        );
        doc.text(lines, 20, y);
        y += lines.length * 6 + 3;
      });
      break;
    }
    case 'memory': {
      const mem = content as { pairs: any[] };
      mem.pairs.forEach((p, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const lines = doc.splitTextToSize(
          `${i + 1}. ${p.concept}  —  ${p.definition}`,
          170,
        );
        doc.text(lines, 20, y);
        y += lines.length * 6 + 3;
      });
      break;
    }
    case 'sequence': {
      const seq = content as { items: any[] };
      seq.items.forEach((it, i) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const lines = doc.splitTextToSize(
          `${it.order}. ${it.step}`,
          170,
        );
        doc.text(lines, 20, y);
        y += lines.length * 6 + 3;
      });
      break;
    }
    case 'crossword': {
      const cw = content as { clues: any[] };
      doc.text('Across', 20, y);
      y += 6;
      cw.clues.filter((c: any) => c.direction === 'across').forEach((c: any) => {
        const lines = doc.splitTextToSize(`${c.number}. ${c.clue}`, 170);
        doc.text(lines, 20, y);
        y += lines.length * 6 + 2;
      });
      y += 4;
      doc.text('Down', 20, y);
      y += 6;
      cw.clues.filter((c: any) => c.direction === 'down').forEach((c: any) => {
        const lines = doc.splitTextToSize(`${c.number}. ${c.clue}`, 170);
        doc.text(lines, 20, y);
        y += lines.length * 6 + 2;
      });
      break;
    }
    case 'timeline': {
      const tl = content as { events: any[] };
      const sorted = [...tl.events].sort((a, b) => a.order - b.order);
      sorted.forEach((e, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const lines = doc.splitTextToSize(`${i + 1}. ${e.date} — ${e.event}`, 170);
        doc.text(lines, 20, y);
        y += lines.length * 6 + 3;
      });
      break;
    }
    case 'sorting': {
      const sg = content as { categories: any[]; items: any[] };
      sg.categories.forEach((cat) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.text(cat.name, 20, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        const catItems = sg.items.filter((it) => it.category === cat.id);
        catItems.forEach((it) => {
          const lines = doc.splitTextToSize(`   - ${it.label}`, 170);
          doc.text(lines, 20, y);
          y += lines.length * 6 + 2;
        });
        y += 4;
      });
      break;
    }
    case 'conceptmap': {
      const cm = content as { nodes: any[]; edges: any[] };
      doc.text('Nodes:', 20, y);
      y += 6;
      cm.nodes.forEach((n, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const lines = doc.splitTextToSize(`${i + 1}. ${n.label} (${n.type})`, 170);
        doc.text(lines, 20, y);
        y += lines.length * 6 + 2;
      });
      y += 4;
      doc.text('Connections:', 20, y);
      y += 6;
      cm.edges.forEach((e) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const src = cm.nodes.find((n) => n.id === e.source);
        const tgt = cm.nodes.find((n) => n.id === e.target);
        const lines = doc.splitTextToSize(`${src?.label} → ${tgt?.label}: ${e.label}`, 170);
        doc.text(lines, 20, y);
        y += lines.length * 6 + 2;
      });
      break;
    }
  }

  doc.save(`${title}-${type}.pdf`);
}

export async function exportGameDOCX(
  type: GameType,
  content: any,
  title: string,
) {
  const children: Paragraph[] = [];
  children.push(
    new Paragraph({
      text: `${GAME_LABELS[type]} — ${title}`,
      heading: HeadingLevel.HEADING_1,
    }),
  );

  switch (type) {
    case 'quiz': {
      const quiz = content as { questions: any[] };
      quiz.questions.forEach((q, i) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `${i + 1}. ${q.question}`, bold: true })],
          }),
        );
        if (q.options) {
          q.options.forEach((opt: string) => {
            children.push(new Paragraph({ text: `   - ${opt}` }));
          });
        }
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `Answer: ${q.answer}`, italics: true })],
          }),
        );
        children.push(new Paragraph({ text: '' }));
      });
      break;
    }
    case 'flashcards': {
      const fc = content as { cards: any[] };
      fc.cards.forEach((c, i) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: `${i + 1}. Q: ${c.question}`, bold: true })],
          }),
        );
        children.push(new Paragraph({ text: `   A: ${c.answer}` }));
        children.push(new Paragraph({ text: '' }));
      });
      break;
    }
    case 'matching':
    case 'memory': {
      const m = content as { pairs: any[] };
      m.pairs.forEach((p, i) => {
        children.push(
          new Paragraph({ text: `${i + 1}. ${p.concept} — ${p.definition}` }),
        );
      });
      break;
    }
    case 'wordsearch': {
      const ws = content as { grid: string[][]; words: any[] };
      children.push(new Paragraph({ text: `Words: ${ws.words.map((w) => w.word).join(', ')}` }));
      children.push(new Paragraph({ text: '' }));
      ws.grid.forEach((row) => {
        children.push(new Paragraph({ text: row.join('  ') }));
      });
      break;
    }
    case 'unscramble': {
      const u = content as { items: any[] };
      u.items.forEach((it, i) => {
        children.push(
          new Paragraph({ text: `${i + 1}. ${it.scrambled}  (Answer: ${it.answer})` }),
        );
      });
      break;
    }
    case 'hangman': {
      const h = content as { words: any[] };
      h.words.forEach((w, i) => {
        children.push(
          new Paragraph({ text: `${i + 1}. ${w.word} — Hint: ${w.hint}` }),
        );
      });
      break;
    }
    case 'sequence': {
      const seq = content as { items: any[] };
      seq.items.forEach((it) => {
        children.push(new Paragraph({ text: `${it.order}. ${it.step}` }));
      });
      break;
    }
    case 'crossword': {
      const cw = content as { clues: any[] };
      children.push(new Paragraph({ text: 'Across', heading: HeadingLevel.HEADING_2 }));
      cw.clues
        .filter((c: any) => c.direction === 'across')
        .forEach((c: any) => {
          children.push(new Paragraph({ text: `${c.number}. ${c.clue}` }));
        });
      children.push(new Paragraph({ text: 'Down', heading: HeadingLevel.HEADING_2 }));
      cw.clues
        .filter((c: any) => c.direction === 'down')
        .forEach((c: any) => {
          children.push(new Paragraph({ text: `${c.number}. ${c.clue}` }));
        });
      break;
    }
    case 'timeline': {
      const tl = content as { events: any[] };
      const sorted = [...tl.events].sort((a, b) => a.order - b.order);
      sorted.forEach((e, i) => {
        children.push(new Paragraph({ text: `${i + 1}. ${e.date} — ${e.event}` }));
      });
      break;
    }
    case 'sorting': {
      const sg = content as { categories: any[]; items: any[] };
      sg.categories.forEach((cat) => {
        children.push(new Paragraph({ text: cat.name, heading: HeadingLevel.HEADING_2 }));
        const catItems = sg.items.filter((it) => it.category === cat.id);
        catItems.forEach((it) => {
          children.push(new Paragraph({ text: `   - ${it.label}` }));
        });
        children.push(new Paragraph({ text: '' }));
      });
      break;
    }
    case 'conceptmap': {
      const cm = content as { nodes: any[]; edges: any[] };
      children.push(new Paragraph({ text: 'Concepts', heading: HeadingLevel.HEADING_2 }));
      cm.nodes.forEach((n, i) => {
        children.push(new Paragraph({ text: `${i + 1}. ${n.label} (${n.type})` }));
      });
      children.push(new Paragraph({ text: 'Connections', heading: HeadingLevel.HEADING_2 }));
      cm.edges.forEach((e) => {
        const src = cm.nodes.find((n) => n.id === e.source);
        const tgt = cm.nodes.find((n) => n.id === e.target);
        children.push(new Paragraph({ text: `${src?.label} → ${tgt?.label}: ${e.label}` }));
      });
      break;
    }
  }

  const doc = new DocxDocument({
    sections: [{ children }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title}-${type}.docx`);
}
