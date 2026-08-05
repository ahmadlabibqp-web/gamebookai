import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-6xl font-bold text-slate-900">404</h1>
        <p className="mt-4 text-lg text-slate-600">
          The page you're looking for doesn't exist.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/" className="btn-secondary">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <Link to="/dashboard" className="btn-primary">
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
