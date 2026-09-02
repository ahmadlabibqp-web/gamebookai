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
import { extractPdf, PdfExtractionError } from '@/lib/pdf';
import { analyzeWithAI } from '@/lib/aiClient';
import { createDocument, updateDocumentAnalysis } from '@/lib/db';

type Stage = 'idle' | 'extracting' | 'analyzing' | 'saving' | 'done' | 'error';

const PIPELINE_TIMEOUT_MS = 120_000;

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
      if (!file) {
        setError('No file selected.');
        setStage('error');
        return;
      }
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        setError('Please upload a PDF file.');
        setStage('error');
        return;
      }

      setError(null);
      setFileName(file.name);
      setStage('extracting');
      setProgress(5);

      let pipelineTimedOut = false;
      const pipelineTimer = setTimeout(() => {
        pipelineTimedOut = true;
        setError(
          `Processing timed out after ${PIPELINE_TIMEOUT_MS / 1000} seconds. The document may be too large or the AI service is slow. Try a shorter PDF.`,
        );
        setStage('error');
      }, PIPELINE_TIMEOUT_MS);

      try {
        setProgress(10);
        const extracted = await extractPdf(file);
        setProgress(35);

        if (!extracted.fullText || extracted.wordCount < 10) {
          throw new PdfExtractionError(
            'This PDF appears to contain no extractable text. It may be a scanned image PDF.',
          );
        }

        setStage('analyzing');
        setProgress(45);
        const { analysis } = await analyzeWithAI({
          text: extracted.fullText,
          fileName: file.name,
          pageCount: extracted.pageCount,
          wordCount: extracted.wordCount,
        });
        setProgress(75);

        setStage('saving');
        setProgress(85);
        const doc = await createDocument({
          title: analysis.title,
          file_name: file.name,
          page_count: extracted.pageCount,
          word_count: extracted.wordCount,
        });

        if (!doc) {
          throw new Error('Failed to save document to the database. Please try again.');
        }

        await updateDocumentAnalysis(doc.id, analysis, extracted.fullText);

        setProgress(100);
        setStage('done');

        setTimeout(() => {
          navigate(`/document/${doc.id}`);
        }, 900);
      } catch (err) {
        if (pipelineTimedOut) return;

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
    <div className="p-6 md:p-10 max-w-xl mx-auto w-full">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Upload PDF Ebook</h2>
        <p className="text-sm text-slate-500 mt-1">Upload your document to turn it into quizzes, flashcards, and interactive games.</p>
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
          className={`bg-white rounded-3xl border-2 border-dashed p-8 text-center relative hover:border-indigo-500 transition-all cursor-pointer ${
            dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
            }}
          />
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
              <UploadCloud className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Click to upload or drag & drop</p>
              <p className="text-xs text-slate-400 mt-1">PDF format (Max limit 25MB)</p>
            </div>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex justify-between text-xs font-semibold text-slate-700">
            <span>Uploading & Extracting Text...</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="space-y-3 pt-3">
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
                    done ? 'bg-indigo-50' : active ? 'bg-amber-50' : 'bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                      done
                        ? 'bg-indigo-500 text-white'
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
                      done ? 'text-indigo-800' : active ? 'text-amber-800' : 'text-slate-500'
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
        <div className="animate-scale-in rounded-3xl border border-indigo-200 bg-indigo-50 p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500 shadow-lg">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-indigo-900">Document analyzed!</h3>
          <p className="mt-2 text-indigo-700">Taking you to your document to start generating games…</p>
          <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-indigo-600" />
        </div>
      )}

      {stage === 'error' && (
        <div className="animate-scale-in rounded-3xl border border-rose-200 bg-rose-50 p-10">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-rose-100">
              <AlertCircle className="h-6 w-6 text-rose-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-rose-900">Couldn't process this PDF</h3>
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
  );
}
