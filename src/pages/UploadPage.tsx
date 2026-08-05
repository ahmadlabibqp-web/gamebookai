import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Brain,
  ListChecks,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { extractPdf, PdfExtractionError } from '@/lib/pdf';
import { analyzeWithAI } from '@/lib/aiClient';
import { createDocument, updateDocumentAnalysis } from '@/lib/db';

type Stage = 'idle' | 'extracting' | 'analyzing' | 'saving' | 'done' | 'error';

// Hard ceiling: if the entire pipeline exceeds this, force an error.
const PIPELINE_TIMEOUT_MS = 120_000; // 2 minutes

interface ProgressStep {
  label: string;
  icon: typeof FileText;
}

const steps: ProgressStep[] = [
  { label: 'Extracting text from PDF pages', icon: FileText },
  { label: 'AI analyzing content via Gemini', icon: Brain },
  { label: 'Generating structured analysis', icon: Sparkles },
  { label: 'Saving to your library', icon: ListChecks },
];

export function UploadPage() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      // [1] Upload started
      console.log(`[Upload] [1] Upload started — file: "${file.name}", size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);

      // ── File validation ───────────────────────────────────────────────────
      if (!file) {
        setError('No file selected.');
        setStage('error');
        return;
      }
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        console.error('[Upload] Validation failed: not a PDF');
        setError('Please upload a PDF file.');
        setStage('error');
        return;
      }
      console.log('[Upload] [2] File validation completed — is PDF');

      setError(null);
      setFileName(file.name);
      setStage('extracting');
      setProgress(5);

      // ── Global safety timeout ─────────────────────────────────────────────
      // If the entire pipeline exceeds PIPELINE_TIMEOUT_MS, force the UI out
      // of the loading state. This guarantees the spinner never spins forever.
      let pipelineTimedOut = false;
      const pipelineTimer = setTimeout(() => {
        pipelineTimedOut = true;
        console.error(`[Upload] Pipeline timed out after ${PIPELINE_TIMEOUT_MS / 1000}s`);
        setError(
          `Processing timed out after ${PIPELINE_TIMEOUT_MS / 1000} seconds. The document may be too large or the AI service is slow. Try a shorter PDF.`,
        );
        setStage('error');
      }, PIPELINE_TIMEOUT_MS);

      try {
        // ── PDF extraction ──────────────────────────────────────────────────
        setProgress(10);
        console.log('[Upload] [3] PDF extraction started');
        const extracted = await extractPdf(file);
        console.log(
          `[Upload] [4] PDF extraction completed — ${extracted.pageCount} pages, ${extracted.wordCount} words, ${extracted.fullText.length} chars`,
        );
        setProgress(35);

        if (!extracted.fullText || extracted.wordCount < 10) {
          throw new PdfExtractionError(
            'This PDF appears to contain no extractable text. It may be a scanned image PDF.',
          );
        }
        console.log(`[Upload] [5] Extracted characters: ${extracted.fullText.length}`);

        // ── AI analysis ─────────────────────────────────────────────────────
        setStage('analyzing');
        setProgress(45);
        console.log('[Upload] [6] Calling Edge Function analyze-document');
        const { analysis } = await analyzeWithAI({
          text: extracted.fullText,
          fileName: file.name,
          pageCount: extracted.pageCount,
          wordCount: extracted.wordCount,
        });
        console.log(
          `[Upload] [9] Edge Function responded — title: "${analysis.title}", language: ${analysis.language}`,
        );
        setProgress(75);

        // ── Database save ───────────────────────────────────────────────────
        setStage('saving');
        setProgress(85);
        console.log('[Upload] [13] Saving document to database');
        const doc = await createDocument({
          title: analysis.title,
          file_name: file.name,
          page_count: extracted.pageCount,
          word_count: extracted.wordCount,
        });

        if (!doc) {
          throw new Error('Failed to save document to the database. Please try again.');
        }
        console.log(`[Upload] [14] Document row created — id: ${doc.id}`);

        await updateDocumentAnalysis(doc.id, analysis, extracted.fullText);
        console.log('[Upload] [15] Analysis saved to document');

        setProgress(100);
        setStage('done');
        console.log('[Upload] [16] Completed successfully');

        setTimeout(() => {
          navigate(`/document/${doc.id}`);
        }, 900);
      } catch (err) {
        if (pipelineTimedOut) return; // timeout handler already set the error UI
        console.error('[Upload] Pipeline error:', err);

        let userMessage: string;
        if (err instanceof PdfExtractionError) {
          userMessage = err.message;
        } else if (err instanceof Error) {
          if (err.name === 'AbortError') {
            userMessage = 'AI analysis timed out. The document may be too large. Try a shorter PDF.';
          } else if (err.message.includes('Network error')) {
            userMessage = 'Network error: could not reach the AI service. Check your internet connection.';
          } else {
            userMessage = err.message;
          }
        } else {
          userMessage = 'Something went wrong while processing your PDF.';
        }

        setError(userMessage);
        setStage('error');
      } finally {
        // ALWAYS clear the safety timer, no matter what path we took.
        clearTimeout(pipelineTimer);
      }
    },
    [navigate],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const reset = () => {
    setStage('idle');
    setError(null);
    setFileName('');
    setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  const isProcessing = stage === 'extracting' || stage === 'analyzing' || stage === 'saving';

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
            Upload a PDF
          </h1>
          <p className="mt-2 text-slate-600">
            We'll extract the text, analyze the content, and prepare it for game generation.
          </p>
        </div>

        {stage === 'idle' && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`animate-scale-in cursor-pointer rounded-3xl border-2 border-dashed p-12 text-center transition-all ${
              dragging
                ? 'border-teal-400 bg-teal-50 scale-[1.01]'
                : 'border-slate-300 bg-white hover:border-teal-300 hover:bg-teal-50/30'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) processFile(file);
              }}
            />
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg">
              <UploadCloud className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-display text-xl font-bold text-slate-900">
              Drag & drop your PDF here
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              or click to browse — textbooks, worksheets, study guides, any educational PDF
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-xs font-medium text-slate-600">
              <FileText className="h-4 w-4" />
              PDF files only, up to ~50MB
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="animate-scale-in rounded-3xl border border-slate-200 bg-white p-10">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50">
                <FileText className="h-6 w-6 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-slate-900">{fileName}</p>
                <p className="text-sm text-slate-500">Processing your document…</p>
              </div>
              <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
            </div>

            <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="space-y-3">
              {steps.map((step, i) => {
                const Icon = step.icon;
                const stepThresholds = [10, 45, 75, 85];
                const doneThresholds = [35, 75, 85, 100];
                const active = progress >= stepThresholds[i] && progress < doneThresholds[i];
                const done = progress >= doneThresholds[i];
                return (
                  <div
                    key={step.label}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-colors ${
                      done
                        ? 'bg-teal-50'
                        : active
                          ? 'bg-amber-50'
                          : 'bg-slate-50'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        done
                          ? 'bg-teal-500 text-white'
                          : active
                            ? 'bg-amber-400 text-white'
                            : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : active ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        done ? 'text-teal-800' : active ? 'text-amber-800' : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {stage === 'done' && (
          <div className="animate-scale-in rounded-3xl border border-teal-200 bg-teal-50 p-10 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500 shadow-lg">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-display text-xl font-bold text-teal-900">
              Document analyzed!
            </h3>
            <p className="mt-2 text-teal-700">
              Taking you to your document to start generating games…
            </p>
            <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-teal-600" />
          </div>
        )}

        {stage === 'error' && (
          <div className="animate-scale-in rounded-3xl border border-rose-200 bg-rose-50 p-10">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-rose-100">
                <AlertCircle className="h-6 w-6 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold text-rose-900">
                  Couldn't process this PDF
                </h3>
                <p className="mt-1 text-sm text-rose-700">{error}</p>
                <button onClick={reset} className="btn-secondary mt-5">
                  <X className="h-4 w-4" />
                  Try another file
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
