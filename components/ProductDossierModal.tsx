"use client";

import { ProductDossier } from "@/app/api/barcode/route";

interface ProductDossierModalProps {
  dossier: ProductDossier | null;
  isOpen: boolean;
  onClose: () => void;
  onScoutCategory: (query: string) => void;
}

const GRADE_STYLES: Record<string, { bg: string; text: string; glow: string }> = {
  A: { bg: "bg-emerald-500", text: "text-white", glow: "shadow-[0_0_20px_rgba(16,185,129,0.4)]" },
  B: { bg: "bg-indigo-500", text: "text-white", glow: "shadow-[0_0_20px_rgba(99,102,241,0.4)]" },
  C: { bg: "bg-amber-500", text: "text-black", glow: "shadow-[0_0_20px_rgba(245,166,35,0.4)]" },
  D: { bg: "bg-orange-600", text: "text-white", glow: "shadow-[0_0_20px_rgba(234,88,12,0.4)]" },
  F: { bg: "bg-red-500", text: "text-white", glow: "shadow-[0_0_20px_rgba(239,68,68,0.4)]" },
};

const VERDICT_STYLES: Record<string, { badge: string; border: string }> = {
  "AI CHAMPION": { badge: "bg-emerald-500/10 text-emerald-400", border: "border-emerald-500/30" },
  "AI CHALLENGER": { badge: "bg-indigo-500/10 text-indigo-400", border: "border-indigo-500/30" },
  "AI BLIND SPOT": { badge: "bg-red-500/10 text-red-400", border: "border-red-500/30" },
  "NICHE FAVORITE": { badge: "bg-amber-500/10 text-amber-400", border: "border-amber-500/30" },
};

export default function ProductDossierModal({
  dossier,
  isOpen,
  onClose,
  onScoutCategory,
}: ProductDossierModalProps) {
  if (!isOpen || !dossier) return null;

  const gradeStyle = GRADE_STYLES[dossier.aeo_grade] || GRADE_STYLES.C;
  const verdictStyle = VERDICT_STYLES[dossier.ai_verdict] || VERDICT_STYLES["AI CHALLENGER"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0F0F14] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Accent Line */}
        <div className="h-1 w-full bg-gradient-to-r from-[#6366F1] via-[#F5A623] to-[#22D3EE]" />

        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-white/5 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#F5A623] animate-pulse" />
              <span className="font-sans text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                Pixii Lens / AI Product Dossier
              </span>
              <span className="font-mono text-[9px] text-zinc-600 bg-white/5 px-2 py-0.5 rounded ml-2">
                UPC {dossier.barcode}
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl text-white leading-tight">
              {dossier.product_name}
            </h2>
            <p className="font-sans text-xs text-zinc-400 mt-1">
              by <span className="text-[#F5A623] font-semibold">{dossier.brand}</span> &bull;{" "}
              <span className="text-zinc-500">{dossier.category}</span>
            </p>
          </div>

          {/* Grade Badge */}
          <div className="flex flex-col items-center shrink-0">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-serif text-2xl font-bold ${gradeStyle.bg} ${gradeStyle.text} ${gradeStyle.glow}`}
            >
              {dossier.aeo_grade}
            </div>
            <span className="font-sans text-[9px] uppercase tracking-widest text-zinc-500 mt-1.5">
              AEO Grade
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[65vh] overflow-y-auto">
          {/* AI Verdict Banner */}
          <div className={`p-4 rounded-xl border ${verdictStyle.border} ${verdictStyle.badge} flex items-center justify-between gap-3`}>
            <div>
              <p className="font-sans text-[9px] uppercase tracking-[0.2em] opacity-70">Verdict</p>
              <p className="font-sans text-sm font-bold tracking-wider uppercase mt-0.5">
                {dossier.ai_verdict}
              </p>
            </div>
            <span className="font-sans text-[10px] text-zinc-400 bg-black/40 px-3 py-1 rounded-full">
              Evaluated across Gemini, Claude & Llama
            </span>
          </div>

          {/* AI Consensus Summary */}
          <div>
            <h4 className="font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">
              What AI Says About This Product
            </h4>
            <p className="font-sans text-sm text-zinc-200 leading-relaxed bg-white/[0.02] p-4 rounded-xl border border-white/5">
              &ldquo;{dossier.ai_consensus_summary}&rdquo;
            </p>
          </div>

          {/* Pros & Cons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pros */}
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-4">
              <h5 className="font-sans text-[10px] uppercase tracking-widest text-emerald-400 font-bold mb-2.5 flex items-center gap-1.5">
                <span>✓</span> Why AI Recommends It
              </h5>
              <ul className="space-y-2">
                {dossier.key_pros_ai_mentions.map((pro, i) => (
                  <li key={i} className="font-sans text-xs text-zinc-300 leading-normal flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0 mt-0.5">&bull;</span>
                    <span>{pro}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Cons / Gaps */}
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4">
              <h5 className="font-sans text-[10px] uppercase tracking-widest text-red-400 font-bold mb-2.5 flex items-center gap-1.5">
                <span>⚠</span> AI Hesitations / Gaps
              </h5>
              <ul className="space-y-2">
                {dossier.key_cons_ai_mentions.map((con, i) => (
                  <li key={i} className="font-sans text-xs text-zinc-300 leading-normal flex items-start gap-2">
                    <span className="text-red-400 shrink-0 mt-0.5">&bull;</span>
                    <span>{con}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Rivals AI Prefers */}
          {dossier.rivals_ai_prefers.length > 0 && (
            <div>
              <h4 className="font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-2">
                Rival Brands AI Recommends Over This One
              </h4>
              <div className="flex flex-wrap gap-2">
                {dossier.rivals_ai_prefers.map((rival, i) => (
                  <span
                    key={i}
                    className="font-sans text-xs text-zinc-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg"
                  >
                    ⚔️ {rival}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Strategic AEO Advice */}
          {dossier.actionable_aeo_advice && (
            <div className="p-4 rounded-xl bg-[#F5A623]/5 border border-[#F5A623]/20">
              <p className="font-sans text-[9px] uppercase tracking-widest text-[#F5A623] font-bold mb-1">
                Strategic AEO Playbook for {dossier.brand}
              </p>
              <p className="font-sans text-xs text-zinc-300 leading-relaxed">
                {dossier.actionable_aeo_advice}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-[#09090C] flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-sans text-xs text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 transition-all uppercase tracking-wider"
          >
            Close
          </button>

          <button
            onClick={() => {
              onClose();
              onScoutCategory(dossier.search_query_suggestion);
            }}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#F5A623] hover:bg-[#FBBF24] font-sans text-xs font-bold text-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Scout &ldquo;{dossier.search_query_suggestion}&rdquo;</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
