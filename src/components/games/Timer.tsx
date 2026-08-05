import { useEffect, useRef, useState } from 'react';
import { Clock, Pause, Play } from 'lucide-react';

interface GameTimerProps {
  paused: boolean;
  onTick?: (ms: number) => void;
}

export function useGameTimer(paused: boolean) {
  const [ms, setMs] = useState(0);
  const startRef = useRef<number>(Date.now());
  const accumRef = useRef<number>(0);
  const lastTickRef = useRef<number>(Date.now());

  useEffect(() => {
    if (paused) {
      accumRef.current += Date.now() - lastTickRef.current;
      return;
    }
    lastTickRef.current = Date.now();
    const interval = setInterval(() => {
      setMs(accumRef.current + (Date.now() - lastTickRef.current));
    }, 100);
    return () => {
      accumRef.current += Date.now() - lastTickRef.current;
      clearInterval(interval);
    };
  }, [paused]);

  return ms;
}

export function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function Timer({ paused }: GameTimerProps) {
  const ms = useGameTimer(paused);
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
      {paused ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      <Clock className="h-3.5 w-3.5 text-slate-400" />
      {formatTime(ms)}
    </div>
  );
}
