"use client";

import { ParsedResult } from "@/lib/parseResponse";
import BrandBadge from "./BrandBadge";

interface EngineColumnProps {
  result: ParsedResult & { error?: string };
  isLeft?: boolean;
}

const ENGINE_STYLES = {
  Claude: {
    accent: "text-amber-400",
    border: "border-amber-400/20",
    headerBg: "bg-amber-400/5",
    dot: "bg-amber-400",
    logo: "●",
  },
  Gemini: {
    accent: "text-sky-400",
    border: "border-sky-400/20",
    headerBg: "bg-sky-400/5",
    dot: "bg-sky-400",
    logo: "◆",
  },
};

export default function EngineColumn({ result, isLeft }: EngineColumnProps) {
  const style = ENGINE_STYLES[result.engine as keyof typeof ENGINE_STYLES] ?? ENGINE_STYLES.Claude;

  return (
    <div className={`flex flex-col border ${style.border} rounded-xl overflow-hidden`}>
      {/* Column header */}
      <div className={`${style.headerBg} border-b ${style.border} px-5 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-2.5">
          <span className={`font-mono text-lg ${style.accent}`}>{style.logo}</span>
          <span className={`font-mono text-sm font-bold tracking-widest uppercase ${style.accent}`}>
            {result.engine}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${style.dot} animate-pulse`} />
          <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
            {result.mentions.length > 0 ? `${result.mentions.length} brands` : "no data"}
          </span>
        </div>
      </div>

      {/* Mentions list */}
      <div className="flex-1 p-4 space-y-3">
        {result.error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-3xl mb-3">⚠</span>
            <p className="font-mono text-xs text-zinc-500 max-w-[200px]">{result.error}</p>
          </div>
        ) : result.mentions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-3xl mb-3 opacity-40">◌</span>
            <p className="font-mono text-xs text-zinc-500">No brands detected</p>
          </div>
        ) : (
          result.mentions.map((mention) => (
            <BrandBadge key={`${result.engine}-${mention.brand}`} mention={mention} />
          ))
        )}
      </div>

      {/* Raw text drawer — collapsed by default */}
      {result.rawText && (
        <details className={`border-t ${style.border} group`}>
          <summary className="px-5 py-3 cursor-pointer font-mono text-[10px] text-zinc-600 uppercase tracking-widest hover:text-zinc-400 transition-colors select-none list-none flex items-center gap-2">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            View raw response
          </summary>
          <div className="px-5 pb-4">
            <pre className="text-[10px] font-mono text-zinc-500 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-700">
              {result.rawText}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}
