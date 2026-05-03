"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import LoadingSequence from "@/components/LoadingSequence";

const EXAMPLE_QUERIES = [
  "best korean sunscreen for oily skin",
  "best korean serum for glow",
  "organic protein powder for women",
  "collagen peptides for joint health",
  "best magnesium supplement for seniors",
];

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(q: string = query) {
    const trimmed = q.trim();
    if (!trimmed) {
      setError("Please enter a search query.");
      inputRef.current?.focus();
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      sessionStorage.setItem("aeo_results", JSON.stringify(data));
      router.push("/results");
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSearch();
  }

  return (
    <div className="bg-obsidian-mesh tech-grid-silver min-h-screen text-white relative overflow-hidden flex flex-col">
      <LoadingSequence isVisible={isLoading} />
      
      {/* Ambient Depth Orbs */}
      <div className="absolute top-0 right-[-10%] w-[800px] h-[800px] bg-[#6366F1]/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-[-10%] w-[600px] h-[600px] bg-[#22D3EE]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Live ticker bar */}
      <div className="border-b border-white/5 bg-black/40 py-2 backdrop-blur-sm overflow-hidden">
        <div className="ticker-bar">
          <div className="ticker-inner">
            {[...Array(2)].flatMap((_, i) =>
              EXAMPLE_QUERIES.map((q, j) => (
                <span key={`ticker-${i}-${j}`} className="shrink-0 font-sans text-[9px] uppercase tracking-[0.2em] text-zinc-500">
                  <span className="text-[#F5A623] mr-2">◈</span>
                  {q} <span className="mx-6 text-white/5">|</span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-[#F5A623] rotate-45" />
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.3em]">Pixii</span>
          <span className="font-sans text-[10px] text-zinc-600 tracking-widest ml-1">/ AEO SCOUT</span>
        </div>
        <a href="https://pixii.ai" className="font-sans text-[10px] text-zinc-500 hover:text-white uppercase tracking-widest transition-colors">
          pixii.ai →
        </a>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center relative z-10">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 rounded-full px-4 py-1.5 mb-10 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] shadow-[0_0_10px_rgba(99,102,241,0.5)] animate-pulse" />
          <span className="font-sans text-[10px] text-white/60 uppercase tracking-[0.2em]">
            Visibility Diagnostic Engine
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-serif text-4xl sm:text-5xl md:text-8xl text-white leading-tight max-w-5xl">
          Where does <span className="text-[#F5A623]">AI send</span> <br className="hidden sm:block" />
          your customers?
        </h1>

        <p className="mt-8 max-w-xl font-sans text-base text-zinc-400 leading-relaxed">
          Claude and Gemini are the new shelf. AEO Scout shows exactly which brands get ranked and recommended — and where you stand.
        </p>

        {/* Search box */}
        <div className="mt-14 w-full max-w-3xl">
          <div className="relative group">
            <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-[#6366F1]/40 to-[#22D3EE]/40 opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity" />
            <div className="relative flex items-center bg-[#111116] border border-white/10 group-focus-within:border-white/20 rounded-2xl p-1.5 transition-all">
              <span className="pl-5 font-sans text-zinc-700 text-xl">$</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Try: "best magnesium supplement"'
                className="flex-1 bg-transparent px-2 sm:px-4 py-3 sm:py-4 font-sans text-sm sm:text-base text-white placeholder:text-zinc-700 outline-none min-w-0"
              />
              <button
                onClick={() => handleSearch()}
                disabled={isLoading || !query.trim()}
                className="px-4 sm:px-8 py-3 sm:py-4 bg-[#F5A623] hover:bg-[#FBBF24] disabled:opacity-40 text-black font-sans text-[10px] sm:text-xs font-bold uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-xl whitespace-nowrap"
              >
                Scout →
              </button>
            </div>
          </div>
          {error && <p className="mt-4 font-sans text-xs text-red-400">{error}</p>}

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {EXAMPLE_QUERIES.slice(0, 4).map((q) => (
              <button
                key={q}
                onClick={() => { setQuery(q); handleSearch(q); }}
                className="font-sans text-[10px] text-zinc-500 hover:text-white border border-white/5 hover:border-white/20 bg-white/5 rounded-full px-4 py-2 transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Stats/How it works redesigned as obsidian cards */}
      <section className="px-6 py-20 relative z-10 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: "01", title: "Scan the Engines", body: "We query Claude, Gemini, and Amazon simultaneously to reveal the new search landscape." },
            { step: "02", title: "Detect Blind Spots", body: "Identify brands that dominate Amazon sales but are completely ignored by AI." },
            { step: "03", title: "Optimize Visibility", body: "Get the data you need to pivot your SEO and AEO strategy for the AI era." }
          ].map(item => (
            <div key={item.step} className="obsidian-card p-8 group hover:border-white/20 transition-all">
              <span className="font-serif text-4xl text-zinc-800 group-hover:text-[#F5A623]/20 transition-colors">{item.step}</span>
              <h3 className="font-serif text-xl text-white mt-4">{item.title}</h3>
              <p className="font-sans text-sm text-zinc-500 mt-3 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 py-10 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 opacity-40">
        <span className="font-sans text-[10px] uppercase tracking-widest text-zinc-600 text-center">© 2024 PIXII — AI AEO SCOUT</span>
        <a href="https://pixii.ai" className="font-sans text-[10px] uppercase tracking-widest text-zinc-600 hover:text-white transition-colors">pixii.ai</a>
      </footer>
    </div>
  );
}
