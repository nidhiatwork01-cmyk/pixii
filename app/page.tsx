"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import LoadingSequence from "@/components/LoadingSequence";

const EXAMPLE_QUERIES = [
  "best magnesium supplement for seniors",
  "organic protein powder for women",
  "collagen peptides for joint health",
  "probiotic supplements for gut health",
  "creatine monohydrate for beginners",
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

      // Store results in sessionStorage and navigate
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
    <>
      <LoadingSequence isVisible={isLoading} />

      {/* Scanline texture */}
      <div className="results-scan-overlay" />

      <main className="relative z-10 min-h-screen flex flex-col">
        {/* Live ticker bar */}
        <div className="border-b border-zinc-900 bg-zinc-950/80 py-2 overflow-hidden">
          <div className="ticker-bar">
            <div className="ticker-inner font-mono text-[10px] text-zinc-600 uppercase tracking-widest">
              {[...Array(2)].flatMap((_, i) =>
                EXAMPLE_QUERIES.map((q, j) => (
                  <span key={`${i}-${j}`} className="shrink-0">
                    <span className="text-amber-400/50 mr-2">◈</span>
                    {q}
                    <span className="mx-6 text-zinc-800">|</span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="border-b border-zinc-900/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-amber-400 text-lg font-bold">◈</span>
            <span className="font-mono text-sm font-bold tracking-widest text-white uppercase">
              Pixii
            </span>
            <span className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest ml-1">
              / AEO Scout
            </span>
          </div>
          <a
            href="https://pixii.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest hover:text-amber-400 transition-colors"
          >
            pixii.ai →
          </a>
        </nav>

        {/* Hero */}
        <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 border border-amber-400/30 bg-amber-400/5 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-mono text-[10px] text-amber-400 uppercase tracking-widest">
              Answer Engine Optimization Diagnostic
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-fraunces text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-[1.05] max-w-4xl">
            Where does{" "}
            <span className="relative inline-block">
              <span className="text-amber-400">AI send</span>
              <span className="absolute -bottom-1 left-0 right-0 h-px bg-amber-400/40" />
            </span>{" "}
            <br className="hidden sm:block" />
            your customers?
          </h1>

          {/* Subheadline */}
          <p className="mt-6 max-w-xl font-mono text-sm text-zinc-400 leading-relaxed">
            When shoppers ask AI &ldquo;what should I buy?&rdquo; — Claude and Gemini become the new
            shelf. AEO Scout shows exactly which brands get mentioned, ranked, and recommended — and
            where yours stands.
          </p>

          {/* Search box */}
          <div className="mt-12 w-full max-w-2xl">
            <div className="relative group">
              <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-amber-400/30 via-amber-400/10 to-amber-400/30 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="relative flex items-center bg-zinc-900 border border-zinc-800 group-focus-within:border-amber-400/50 rounded-xl transition-colors duration-200">
                <span className="pl-5 font-mono text-zinc-600 shrink-0 text-lg">$</span>
                <input
                  ref={inputRef}
                  id="query-input"
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder='Try: "best magnesium supplement for seniors"'
                  className="flex-1 bg-transparent px-4 py-5 font-mono text-sm text-white placeholder:text-zinc-600 outline-none"
                  aria-label="Shopping query"
                  maxLength={300}
                  disabled={isLoading}
                />
                <button
                  id="scout-btn"
                  onClick={() => handleSearch()}
                  disabled={isLoading || !query.trim()}
                  className="mr-2 shrink-0 px-6 py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-black font-mono text-xs font-bold uppercase tracking-widest rounded-lg transition-all duration-200 hover:shadow-[0_0_20px_rgba(245,166,35,0.4)] active:scale-95"
                >
                  Scout →
                </button>
              </div>
            </div>

            {error && (
              <p className="mt-3 font-mono text-xs text-red-400 text-left">{error}</p>
            )}

            {/* Example queries */}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {EXAMPLE_QUERIES.slice(0, 4).map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setQuery(q);
                    handleSearch(q);
                  }}
                  disabled={isLoading}
                  className="font-mono text-[10px] text-zinc-600 hover:text-amber-400 border border-zinc-800 hover:border-amber-400/30 rounded-full px-3 py-1.5 transition-all duration-150 disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-16 flex flex-wrap justify-center gap-8">
            {[
              { value: "2", label: "AI engines scanned" },
              { value: "<10s", label: "average scan time" },
              { value: "A–F", label: "brand visibility grade" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-mono text-2xl font-black text-amber-400">{stat.value}</div>
                <div className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-zinc-900 px-6 py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-mono text-[10px] text-zinc-600 uppercase tracking-widest text-center mb-10">
              How AEO Scout works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  title: "You type a query",
                  body: "Any shopping question your customer might ask an AI — product category, use case, concern.",
                },
                {
                  step: "02",
                  title: "We query the engines",
                  body: "Claude and Gemini both receive your query simultaneously. Real responses, real data.",
                },
                {
                  step: "03",
                  title: "You see the truth",
                  body: "Which brands get named, in what order, with what language — and where yours ranks.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="border border-zinc-900 rounded-xl p-6 hover:border-zinc-800 transition-colors"
                >
                  <span className="font-mono text-3xl font-black text-amber-400/40">
                    {item.step}
                  </span>
                  <h3 className="font-fraunces text-base font-semibold text-white mt-2">
                    {item.title}
                  </h3>
                  <p className="font-mono text-xs text-zinc-500 mt-2 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-zinc-900 px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-mono text-[10px] text-zinc-700 uppercase tracking-widest">
            © 2024 Pixii — AI design tools for Amazon sellers
          </span>
          <a
            href="https://pixii.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] text-zinc-700 hover:text-amber-400 transition-colors uppercase tracking-widest"
          >
            pixii.ai
          </a>
        </footer>
      </main>
    </>
  );
}
