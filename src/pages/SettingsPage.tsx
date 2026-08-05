import { useEffect, useState, useCallback } from 'react';
import {
  Settings,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Cpu,
  Save,
  Zap,
  AlertCircle,
  Shield,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-ai-settings`;
const HEADERS = {
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

const DEFAULT_MODEL = 'gemini-2.5-flash';

type StatusState = 'loading' | 'configured' | 'missing';
type TestState = 'idle' | 'testing' | 'success' | 'error';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface SettingsResponse {
  configured: boolean;
  model: string;
  updatedAt: string | null;
}

interface TestResponse {
  success: boolean;
  message: string;
}

export function SettingsPage() {
  const [status, setStatus] = useState<StatusState>('loading');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [testState, setTestState] = useState<TestState>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [error, setError] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ action: 'getStatus' }),
      });
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data: SettingsResponse = await res.json();
      setStatus(data.configured ? 'configured' : 'missing');
      setModel(data.model || DEFAULT_MODEL);
    } catch {
      setStatus('missing');
      setError('Could not load settings. Please check your connection and try again.');
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setSaveState('error');
      setSaveMessage('Please enter an API key.');
      return;
    }

    setSaveState('saving');
    setSaveMessage('');
    setError('');

    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          action: 'save',
          apiKey: apiKey.trim(),
          model: model.trim() || DEFAULT_MODEL,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to save API key.');
      }

      setSaveState('saved');
      setSaveMessage('API Key configured successfully.');
      setApiKey('');
      setShowKey(false);
      setStatus('configured');
      setTestState('idle');
      setTestMessage('');
    } catch (err) {
      setSaveState('error');
      setSaveMessage(
        err instanceof Error
          ? err.message
          : 'Failed to save API key. Please try again.',
      );
    }
  };

  const handleTestConnection = async () => {
    setTestState('testing');
    setTestMessage('');
    setError('');

    try {
      const res = await fetch(FUNCTION_URL, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ action: 'testConnection' }),
      });

      const data: TestResponse = await res.json();

      if (data.success) {
        setTestState('success');
        setTestMessage('Connection successful');
      } else {
        setTestState('error');
        setTestMessage(data.message || 'Invalid API key');
      }
    } catch {
      setTestState('error');
      setTestMessage('Network error. Could not reach the server.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          to="/dashboard"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-teal-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-sm">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
            Settings
          </h1>
          <p className="mt-1 text-slate-600">
            Configure your AI provider for document analysis and game generation.
          </p>
        </div>

        {/* Status Card */}
        <div className="card mb-6 p-6">
          <div className="mb-4 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-teal-600" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              AI Configuration Status
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm">
                  <span className="text-xs font-bold text-slate-700">AI</span>
                </div>
                <span className="text-sm font-semibold text-slate-700">Google Gemini</span>
              </div>
              {status === 'loading' ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              ) : status === 'configured' ? (
                <span className="badge bg-teal-100 text-teal-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Configured
                </span>
              ) : (
                <span className="badge bg-rose-100 text-rose-700">
                  <XCircle className="h-3.5 w-3.5" />
                  Missing
                </span>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-sm font-medium text-slate-600">Model</span>
              <code className="text-sm font-semibold text-slate-800">{model}</code>
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="card p-6">
          <div className="mb-5 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-teal-600" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              AI Configuration
            </h2>
          </div>

          {/* API Key Field */}
          <div className="mb-5">
            <label
              htmlFor="api-key"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              Gemini API Key
            </label>
            <div className="relative">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  if (saveState === 'saved' || saveState === 'error') {
                    setSaveState('idle');
                    setSaveMessage('');
                  }
                }}
                placeholder={status === 'configured' ? '••••••••••••••••' : 'Enter your Gemini API key'}
                className="input-field pr-12"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {status === 'configured'
                ? 'API Key configured successfully.'
                : 'No API Key configured.'}
            </p>
          </div>

          {/* Model Field */}
          <div className="mb-6">
            <label
              htmlFor="model"
              className="mb-1.5 block text-sm font-semibold text-slate-700"
            >
              Model
            </label>
            <input
              id="model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={DEFAULT_MODEL}
              className="input-field"
            />
            <p className="mt-1.5 text-xs text-slate-500">
              The Gemini model identifier used for AI analysis (e.g. gemini-2.5-flash).
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={handleSave}
              disabled={saveState === 'saving' || !apiKey.trim()}
              className="btn-primary flex-1"
            >
              {saveState === 'saving' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save
                </>
              )}
            </button>
            <button
              onClick={handleTestConnection}
              disabled={testState === 'testing' || status === 'loading'}
              className="btn-secondary flex-1"
            >
              {testState === 'testing' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Test Connection
                </>
              )}
            </button>
          </div>

          {/* Save Feedback */}
          {saveState === 'saved' && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-700">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              {saveMessage}
            </div>
          )}
          {saveState === 'error' && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {saveMessage}
            </div>
          )}

          {/* Test Feedback */}
          {testState === 'success' && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-700">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              {testMessage}
            </div>
          )}
          {testState === 'error' && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {testMessage}
            </div>
          )}

          {/* General Error */}
          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Security Note */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-teal-600" />
          <p className="text-xs leading-relaxed text-slate-500">
            Your API key is encrypted at rest and stored securely in Supabase Vault.
            It is never sent to the browser after saving, never logged, and never
            included in API responses.
          </p>
        </div>
      </div>
    </div>
  );
}
