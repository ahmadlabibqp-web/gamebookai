import { useState, useRef, useEffect } from 'react';
import { Network, CheckCircle2 } from 'lucide-react';
import type { ConceptMapGame } from '@/lib/types';
import { Timer } from './Timer';
import { GameResult } from './GameResult';

interface Props {
  game: ConceptMapGame;
  onFinish: (result: { score: number; maxScore: number; correct: number; total: number; answers: any[] }) => void;
  backLink: string;
}

interface PositionedNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
}

export function ConceptMapView({ game, onFinish, backLink }: Props) {
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [paused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<PositionedNode[]>([]);

  useEffect(() => {
    const w = containerRef.current?.clientWidth ?? 600;
    const h = Math.max(400, game.nodes.length * 60);
    const center = game.nodes.find((n) => n.type === 'central') || game.nodes[0];
    const others = game.nodes.filter((n) => n.id !== center?.id);

    const positioned: PositionedNode[] = [];
    if (center) {
      positioned.push({ ...center, x: w / 2, y: h / 2 });
    }
    others.forEach((node, i) => {
      const angle = (i / others.length) * Math.PI * 2;
      const radius = Math.min(w, h) * 0.35;
      positioned.push({
        ...node,
        x: w / 2 + Math.cos(angle) * radius,
        y: h / 2 + Math.sin(angle) * radius,
      });
    });
    setNodes(positioned);
  }, [game.nodes]);

  const reveal = (id: string) => {
    if (submitted || revealed.has(id)) return;
    const next = new Set(revealed);
    next.add(id);
    setRevealed(next);
  };

  const revealAll = () => {
    setRevealed(new Set(game.nodes.map((n) => n.id)));
    setSubmitted(true);
    const allRevealed = game.nodes.length;
    onFinish({
      score: allRevealed,
      maxScore: game.nodes.length,
      correct: allRevealed,
      total: game.nodes.length,
      answers: game.nodes.map((n) => ({
        question: n.label,
        userAnswer: 'Revealed',
        correct: true,
      })),
    });
  };

  const getNode = (id: string) => nodes.find((n) => n.id === id);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-slate-800">Concept Map</h2>
        <Timer paused={paused} />
      </div>
      <p className="text-sm text-slate-600 mb-4">Click each node to reveal the concept. Explore how ideas connect.</p>

      <div
        ref={containerRef}
        className="relative w-full bg-slate-50 rounded-xl border-2 border-slate-200 overflow-hidden"
        style={{ height: Math.max(400, game.nodes.length * 60) }}
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {game.edges.map((edge, i) => {
            const source = getNode(edge.source);
            const target = getNode(edge.target);
            if (!source || !target) return null;
            const isRevealed = revealed.has(edge.source) && revealed.has(edge.target);
            return (
              <g key={i}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isRevealed ? '#6366f1' : '#cbd5e1'}
                  strokeWidth={2}
                  strokeDasharray={isRevealed ? '0' : '4'}
                />
                {isRevealed && (
                  <text
                    x={(source.x + target.x) / 2}
                    y={(source.y + target.y) / 2}
                    fill="#6366f1"
                    fontSize={10}
                    textAnchor="middle"
                    className="select-none"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {nodes.map((node) => {
          const isRevealed = revealed.has(node.id);
          return (
            <button
              key={node.id}
              onClick={() => reveal(node.id)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                isRevealed
                  ? node.type === 'central'
                    ? 'bg-indigo-600 text-white shadow-lg scale-105'
                    : 'bg-white text-slate-700 border-2 border-indigo-300 shadow-md'
                  : 'bg-slate-200 text-slate-400 border-2 border-dashed border-slate-300 hover:border-indigo-300 hover:bg-slate-100'
              }`}
              style={{ left: node.x, y: node.y }}
            >
              {isRevealed ? (
                <span className="flex items-center gap-1">
                  <Network className="w-3 h-3" />
                  {node.label}
                </span>
              ) : (
                <span className="text-xs">?</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {revealed.size} / {game.nodes.length} concepts revealed
        </span>
        {!submitted && (
          <button
            onClick={revealAll}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Reveal All & Finish
          </button>
        )}
      </div>

      {submitted && (
        <GameResult
          score={game.nodes.length}
          maxScore={game.nodes.length}
          correct={game.nodes.length}
          total={game.nodes.length}
          onRetry={() => window.location.reload()}
          backLink={backLink}
        />
      )}
    </div>
  );
}
