"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EngineResult } from "@/lib/parseResponse";
import EngineColumn from "@/components/EngineColumn";
import ScoreCard from "@/components/ScoreCard";
import LoadingSequence from "@/components/LoadingSequence";

export default function ResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<{ results: EngineResult[]; query: string } | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("aeo_results");
    if (!saved) {
      router.push("/");
      return;
    }
    setData(JSON.parse(saved));
  }, [router]);

  if (!data) return <LoadingSequence isVisible={true} />;

  const groq = data.results.find((r) => r.engine === "Llama (Groq)");
  const gemini = data.results.find((r) => r.engine === "Gemini");
  const bsr = data.results.find((r) => r.engine === "Amazon BSR");

  const allBrands = Array.from(new Set(data.results.flatMap((r) => r.mentions.map((m) => m.brand))));
  const dominator = allBrands.find(b => 
    groq?.mentions.some(m => m.brand === b && m.rank === 1) && 
    gemini?.mentions.some(m => m.brand === b && m.rank === 1)
  );

  const blindSpot = bsr?.mentions.find(b => 
    !groq?.mentions.some(m => m.brand === b.brand) && 
    !gemini?.mentions.some(m => m.brand === b.brand)
  );

  return (
    <div className="bg-obsidian-mesh tech-grid-silver min-h-screen pb-20 relative overflow-hidden">
      {/* Ambient Depth Orbs */}
      <div className="absolute top-0 right-[-10%] w-[800px] h-[800px] bg-[#6366F1]/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-[-10%] w-[600px] h-[600px] bg-[#22D3EE]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#09090B]/80 backdrop-blur-md border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-5 h-5 bg-[#F5A623] rotate-45 transition-transform duration-500" />
          <span className="font-sans text-[11px] font-bold uppercase tracking-[0.3em] text-white">Pixii</span>
          <span className="font-sans text-[10px] text-zinc-600 tracking-widest ml-1">/ DIAGNOSTIC CORE</span>
        </Link>
        <Link href="/" className="font-sans text-[10px] text-white hover:text-[#F5A623] transition-colors uppercase tracking-widest border border-white/10 px-5 py-1.5 rounded-full">
          ← New Query
        </Link>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-20">
        <header className="mb-16">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1] shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
            <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-600">Query Identified</p>
          </div>
          <h1 className="font-serif text-4xl md:text-6xl text-white mb-10 max-w-4xl leading-tight">
            &ldquo;{data.query}&rdquo;
          </h1>
          
          <div className="p-8 bg-[#111116] border border-white/5 rounded-2xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#6366F1]/50 to-transparent" />
            <div className="flex items-start gap-4">
              <div className="mt-1.5 w-3 h-3 rounded-full bg-[#6366F1] shadow-[0_0_15px_rgba(99,102,241,0.4)]" />
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-2">AI Engine Verdict</p>
                <div className="font-serif text-xl text-zinc-300 leading-relaxed">
                  {dominator ? (
                    <span className="flex flex-col sm:flex-row sm:items-center gap-3 items-start">
                      <span className="font-sans font-bold text-[10px] uppercase tracking-widest bg-[#F5A623]/10 text-[#F5A623] border border-[#F5A623]/20 px-3 py-1 rounded-full shrink-0">
                        Dominates
                      </span>
                      <span className="text-base sm:text-xl">{dominator.replace(/\*\*/g, "")} is the clear market leader in AI recommendations.</span>
                    </span>
                  ) : (
                    "No single brand dominance identified across AI models."
                  )}
                  {blindSpot && (
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 items-start">
                      <span className="font-sans font-bold text-[10px] uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full shrink-0">
                        AI Blind Spot
                      </span>
                      <span className="text-base sm:text-xl">{blindSpot.brand.replace(/\*\*/g, "")} is ranked #{blindSpot.rank} on Amazon but invisible to AI engines.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {data.results.map((res) => (
            <EngineColumn key={res.engine} result={res} />
          ))}
        </div>

        <ScoreCard data={data} />
        
        {/* Footer Ticker */}
        <div className="mt-32 pt-12 border-t border-white/5 opacity-40">
          <div className="ticker-bar">
            <div className="ticker-inner">
              {[...Array(2)].flatMap((_, i) =>
                data.results.flatMap((r, j) =>
                  r.mentions.slice(0, 3).map((m, k) => (
                    <span key={`ticker-${i}-${j}-${k}`} className="shrink-0 font-sans text-[9px] uppercase tracking-[0.2em] text-zinc-600">
                      [{r.engine}] #{m.rank} {m.brand} <span className="mx-6 text-white/5">/</span>
                    </span>
                  ))
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
