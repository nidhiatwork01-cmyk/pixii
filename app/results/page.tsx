"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EngineColumn from "@/components/EngineColumn";
import ScoreCard from "@/components/ScoreCard";
import { ParsedResult } from "@/lib/parseResponse";

interface ResultData {
  query: string;
  results: (ParsedResult & { error?: string })[];
}

function getSummaryInsight(results: (ParsedResult & { error?: string })[]): {
  text: string;
  type: "both" | "one" | "none" | "neutral";
} {
  if (!results.length || results.every((r) => r.mentions.length === 0)) {
    return { text: "No brand data returned from either engine.", type: "none" };
  }

  // Find #1 ranked brand per engine
  const topBrands = results
    .filter((r) => r.mentions.length > 0)
    .map((r) => ({ engine: r.engine, brand: r.mentions[0].brand }));

  if (topBrands.length === 2) {
    if (topBrands[0].brand.toLowerCase() === topBrands[1].brand.toLowerCase()) {
      return {
        text: `${topBrands[0].brand} dominates — ranked #1 in both Claude and Gemini. Strong AEO signal.`,
        type: "both",
      };
    }
    return {
      text: `Split verdict: ${topBrands[0].engine} favours ${topBrands[0].brand}, ${topBrands[1].engine} favours ${topBrands[1].brand}.`,
      type: "one",
    };
  }

  if (topBrands.length === 1) {
    return {
      text: `Only ${topBrands[0].engine} returned results. ${topBrands[0].brand} leads there.`,
      type: "neutral",
    };
  }

  return { text: "Insufficient data to determine a leader.", type: "neutral" };
}

export default function ResultsPage() {
  const [data, setData] = useState<ResultData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const raw = sessionStorage.getItem("aeo_results");
    if (!raw) {
      setNotFound(true);
      return;
    }
    try {
      setData(JSON.parse(raw));
    } catch {
      setNotFound(true);
    }
  }, []);

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <span className="font-mono text-4xl text-zinc-700 mb-4">◌</span>
        <h1 className="font-fraunces text-2xl text-white mb-2">No results found</h1>
        <p className="font-mono text-xs text-zinc-500 mb-6">
          Results expire when you close the tab. Run a new query.
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-amber-400 text-black font-mono text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-amber-300 transition-colors"
        >
          ← New Query
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="font-mono text-xs text-zinc-600 animate-pulse">Loading results…</span>
      </div>
    );
  }

  const insight = getSummaryInsight(data.results);

  const insightStyles = {
    both: "border-emerald-400/30 bg-emerald-400/5 text-emerald-300",
    one: "border-amber-400/30 bg-amber-400/5 text-amber-300",
    none: "border-zinc-700 bg-zinc-900/50 text-zinc-500",
    neutral: "border-zinc-700 bg-zinc-900/50 text-zinc-400",
  };

  return (
    <>
      {/* Subtle scanline texture */}
      <div className="results-scan-overlay" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Top bar */}
        <nav className="border-b border-zinc-900 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0A0A0A]/95 backdrop-blur-sm z-20">
          <div className="flex items-center gap-2">
            <span className="font-mono text-amber-400 text-lg">◈</span>
            <span className="font-mono text-sm font-bold tracking-widest text-white uppercase">
              Pixii
            </span>
            <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest ml-1 hidden sm:inline">
              / AEO Scout
            </span>
          </div>
          <button
            id="new-query-btn"
            onClick={() => router.push("/")}
            className="font-mono text-[10px] text-zinc-500 hover:text-amber-400 uppercase tracking-widest border border-zinc-800 hover:border-amber-400/30 px-4 py-2 rounded-lg transition-all duration-150"
          >
            ← New Query
          </button>
        </nav>

        <main className="flex-1 px-4 sm:px-6 py-8 max-w-7xl mx-auto w-full">
          {/* Query display */}
          <div className="mb-6">
            <p className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mb-1">
              Scanned query
            </p>
            <h1 className="font-fraunces text-2xl sm:text-3xl text-white font-semibold">
              &ldquo;{data.query}&rdquo;
            </h1>
          </div>

          {/* Killer insight banner */}
          <div
            className={`border rounded-xl px-5 py-4 mb-8 flex items-start gap-3 ${insightStyles[insight.type]}`}
            role="alert"
          >
            <span className="font-mono text-base mt-0.5 shrink-0">
              {insight.type === "both" ? "★" : insight.type === "one" ? "◑" : "◌"}
            </span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest opacity-60 mb-0.5">
                AI Engine Verdict
              </p>
              <p className="font-mono text-sm font-bold leading-relaxed">{insight.text}</p>
            </div>
          </div>

          {/* Ticker strip */}
          <div className="border border-zinc-900 rounded-lg bg-zinc-950/40 py-2 px-4 mb-8 overflow-hidden ticker-shimmer">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px] text-amber-400 uppercase tracking-widest shrink-0">
                Live
              </span>
              <span className="w-px h-3 bg-zinc-800 shrink-0" />
              <div className="overflow-hidden">
                <div className="ticker-bar">
                  <div className="ticker-inner">
                    {[...Array(2)].flatMap(() =>
                      data.results.flatMap((r) =>
                        r.mentions.slice(0, 3).map((m) => (
                          <span key={`${r.engine}-${m.brand}`} className="shrink-0 font-mono text-[10px] text-zinc-500">
                            <span className={r.engine === "Claude" ? "text-amber-400/60" : "text-sky-400/60"}>
                              {r.engine}
                            </span>{" "}
                            #{m.rank} {m.brand}
                            <span className="mx-4 text-zinc-800">·</span>
                          </span>
                        ))
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Two-column engine layout */}
          <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_1px_1fr] gap-6 lg:gap-0 mb-10">
            {data.results[0] && (
              <div className="lg:pr-6">
                <EngineColumn result={data.results[0]} isLeft />
              </div>
            )}

            {/* Amber divider (desktop only) */}
            <div className="hidden lg:block">
              <div className="amber-divider h-full mx-auto" />
            </div>

            {data.results[1] && (
              <div className="lg:pl-6">
                <EngineColumn result={data.results[1]} />
              </div>
            )}
          </div>

          {/* Score card */}
          <ScoreCard results={data.results} />
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-900 px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-mono text-[10px] text-zinc-700 uppercase tracking-widest">
            Pixii AEO Scout — AI visibility diagnostic for Amazon sellers
          </span>
          <a
            href="https://pixii.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-zinc-700 hover:text-amber-400 transition-colors"
          >
            pixii.ai →
          </a>
        </footer>
      </div>
    </>
  );
}
