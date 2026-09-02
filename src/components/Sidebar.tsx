import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Gamepad2,
  LayoutDashboard,
  BookOpen,
  UploadCloud,
  Dices,
  Bot,
  Trophy,
  Settings,
} from 'lucide-react';

export function Sidebar({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (to: string) => location.pathname === to;

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/dashboard', label: 'My Library', icon: BookOpen },
    { to: '/upload', label: 'Upload PDF', icon: UploadCloud },
    { to: '/dashboard', label: 'Games Hub', icon: Dices },
    { to: '/dashboard', label: 'AI Tutor', icon: Bot },
    { to: '/progress', label: 'Progress', icon: Trophy },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-full flex flex-col md:flex-row bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 text-slate-300 flex-col justify-between border-r border-slate-800 fixed inset-y-0 left-0 z-30">
        <div>
          <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-600/30">
              <Gamepad2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-white tracking-wider text-lg">BOOKGAME<span className="text-indigo-400">AI</span></h1>
              <p className="text-xs text-slate-400">Interactive Learning Hub</p>
            </div>
          </div>

          <nav className="p-4 space-y-1.5">
            <Link
              to="/dashboard"
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                isActive('/dashboard')
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/dashboard"
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all hover:bg-slate-800 hover:text-white"
            >
              <BookOpen className="h-5 w-5" />
              <span>My Library</span>
            </Link>
            <Link
              to="/upload"
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                isActive('/upload')
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <UploadCloud className="h-5 w-5" />
              <span>Upload PDF</span>
            </Link>
            <Link
              to="/dashboard"
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all hover:bg-slate-800 hover:text-white"
            >
              <Dices className="h-5 w-5" />
              <span>Games Hub</span>
            </Link>
            <Link
              to="/dashboard"
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all hover:bg-slate-800 hover:text-white"
            >
              <Bot className="h-5 w-5" />
              <span>AI Tutor</span>
            </Link>
            <Link
              to="/progress"
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                isActive('/progress')
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Trophy className="h-5 w-5" />
              <span>Progress</span>
            </Link>
            <Link
              to="/settings"
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                isActive('/settings')
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
              U
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-white truncate">Guest User</p>
              <span className="inline-block px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold rounded">PLAN: FREE</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header with inline icon buttons */}
      <header className="md:hidden bg-slate-900 text-white px-4 py-3 flex justify-between items-center border-b border-slate-800 sticky top-0 z-30">
        <div className="flex items-center space-x-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
            <Gamepad2 className="h-4 w-4" />
          </div>
          <span className="font-bold text-sm tracking-wider">BOOKGAMEAI</span>
        </div>
        <div className="flex space-x-1">
          {navLinks.slice(0, 5).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                className={`p-2 rounded-lg text-xs transition-colors ${
                  isActive(item.to) ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
              </Link>
            );
          })}
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/95 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <nav className="p-6 space-y-2 mt-12">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    isActive(item.to) ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
