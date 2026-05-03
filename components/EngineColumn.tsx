import { EngineResult } from "@/lib/parseResponse";

interface EngineColumnProps {
  result: EngineResult;
}

const ENGINE_STYLES = {
  "Llama (Groq)": {
    accent: "bg-[#6366F1]", // Indigo
    dot: "bg-[#6366F1]",
  },
  Gemini: {
    accent: "bg-[#22D3EE]", // Cyan
    dot: "bg-[#22D3EE]",
  },
  "Amazon BSR": {
    accent: "bg-[#10B981]", // Emerald
    dot: "bg-[#10B981]",
  },
};

export default function EngineColumn({ result }: EngineColumnProps) {
  const style = ENGINE_STYLES[result.engine as keyof typeof ENGINE_STYLES] || ENGINE_STYLES["Llama (Groq)"];

  return (
    <div className="obsidian-card relative overflow-hidden group flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shadow-[0_0_10px_rgba(255,255,255,0.2)]`} />
          <h2 className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
            {result.engine}
          </h2>
        </div>
        <div className="font-sans text-[10px] text-zinc-600 uppercase tracking-widest">
          {result.mentions.length} Brands
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4 flex-1">
        {result.error && (
          <div className="py-12 text-center">
            <p className="font-sans text-[10px] text-zinc-600 uppercase tracking-widest">{result.error}</p>
          </div>
        )}

        {result.mentions.map((m) => (
          <div 
            key={m.brand} 
            className="p-5 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-serif text-3xl text-zinc-800 group-hover:text-zinc-700 transition-colors leading-none">
                {m.rank}
              </span>
              <div className="font-sans text-[9px] text-zinc-600 uppercase tracking-widest border border-white/5 px-2 py-0.5 rounded">
                Verified
              </div>
            </div>
            <h3 className="font-serif text-lg text-white mb-2">{m.brand}</h3>
            <p className="font-sans text-[11px] leading-relaxed text-zinc-500 italic opacity-80">
              &ldquo;{m.excerpt}&rdquo;
            </p>
          </div>
        ))}
      </div>

      {/* Bottom Accent */}
      <div className={`accent-bar ${style.accent} opacity-40 group-hover:opacity-100 transition-opacity`} />
    </div>
  );
}
