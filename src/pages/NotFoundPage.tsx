import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto w-full text-center">
      <div>
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
