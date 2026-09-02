import { Link, useLocation } from 'react-router-dom';
import { BookOpen, LayoutDashboard, Upload, Menu, X, Settings, Trophy } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Home', icon: BookOpen },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/upload', label: 'Upload', icon: Upload },
    { to: '/progress', label: 'Progress', icon: Trophy },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
              BOOKGAME<span className="text-indigo-500">AI</span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-600">
              Interactive Learning Hub
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.to)
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden md:block">
          <Link to="/upload" className="btn-primary">
            <Upload className="h-4 w-4" />
            Get Started
          </Link>
        </div>

        <button
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive(item.to)
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
