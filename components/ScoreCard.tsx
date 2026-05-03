import { EngineResult } from "@/lib/parseResponse";

interface ScoreCardProps {
  data: {
    results: EngineResult[];
  };
}

export default function ScoreCard({ data }: ScoreCardProps) {
  const allBrands = Array.from(
    new Set(data.results.flatMap((r) => r.mentions.map((m) => m.brand)))
  );

  const groq = data.results.find((r) => r.engine === "Llama (Groq)");
  const gemini = data.results.find((r) => r.engine === "Gemini");
  const bsr = data.results.find((r) => r.engine === "Amazon BSR");

  function getRank(engine: EngineResult | undefined, brand: string) {
    const mention = engine?.mentions.find((m) => m.brand === brand);
    return mention ? mention.rank : null;
  }

  function getGrade(brand: string) {
    const groqRank = getRank(groq, brand);
    const geminiRank = getRank(gemini, brand);
    const bsrRank = getRank(bsr, brand);
    
    let score = 0;
    if (groqRank) score += (6 - groqRank);
    if (geminiRank) score += (6 - geminiRank);
    if (bsrRank) score += (6 - bsrRank);

    if (score >= 12) return { l: "A", c: "bg-[#10B981]" }; // Emerald
    if (score >= 8) return { l: "B", c: "bg-[#6366F1]" }; // Indigo
    if (score >= 4) return { l: "C", c: "bg-[#F5A623]" }; // Amber
    return { l: "F", c: "bg-[#EF4444]" }; // Red
  }

  function getVerdict(brand: string) {
    const inGroq = !!getRank(groq, brand);
    const inGemini = !!getRank(gemini, brand);
    const inBSR = !!getRank(bsr, brand);

    if (inBSR && !inGroq && !inGemini) return { label: "AI Blind Spot", type: "F" };
    if (inGroq && inGemini && inBSR) return { label: "Dominates", type: "A" };
    return { label: "Weak Signal", type: "C" };
  }

  return (
    <div className="mt-24 space-y-8">
      <div>
        <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-1">Comparative Analytics</p>
        <h2 className="font-serif text-3xl text-white">Market Visibility Scorecard</h2>
      </div>

      <div className="bg-[#09090B] border border-white/5 rounded-xl overflow-hidden shadow-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-6 py-4 font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-500">Brand & Signal</th>
              <th className="px-4 py-4 font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-500">Groq</th>
              <th className="px-4 py-4 font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-500">Gemini</th>
              <th className="px-4 py-4 font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-500">Amazon BSR</th>
              <th className="px-6 py-4 font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-500">Visibility Bar</th>
              <th className="px-6 py-4 font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-500 text-right">Grade</th>
            </tr>
          </thead>
          <tbody>
            {allBrands.map((brand, i) => {
              const grade = getGrade(brand);
              const verdict = getVerdict(brand);
              const gRank = getRank(groq, brand);
              const gemRank = getRank(gemini, brand);
              const bsrRank = getRank(bsr, brand);
              
              const visWidth = gRank || gemRank || bsrRank ? (100 - ( ( (gRank||6) + (gemRank||6) + (bsrRank||6) ) / 18 * 100 ) ) : 10;

              return (
                <tr key={brand} className="group hover:bg-white/[0.02] transition-colors border-b border-white/[0.03] last:border-0 h-[48px]">
                  <td className="px-6 py-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-[3px] h-4 rounded-full ${grade.c}`} />
                      <span className="font-sans text-[14px] font-medium text-white">{brand}</span>
                      <span className="font-sans text-[10px] text-zinc-600 uppercase tracking-widest ml-1">{verdict.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-0 font-sans text-[13px]">
                    {gRank ? <span className="text-white">#{gRank}</span> : <span className="text-zinc-800">N/A</span>}
                  </td>
                  <td className="px-4 py-0 font-sans text-[13px]">
                    {gemRank ? <span className="text-white">#{gemRank}</span> : <span className="text-zinc-800">N/A</span>}
                  </td>
                  <td className="px-4 py-0 font-sans text-[13px]">
                    {bsrRank ? <span className="text-white">#{bsrRank}</span> : <span className="text-zinc-800">N/A</span>}
                  </td>
                  <td className="px-6 py-0 w-[200px]">
                    <div className="v-bar-track">
                      <div className={`v-bar-fill ${grade.c} opacity-80`} style={{ width: `${Math.max(visWidth, 20)}%` }} />
                    </div>
                  </td>
                  <td className="px-6 py-0 text-right">
                    <div className={`inline-flex w-[30px] h-[30px] rounded-full items-center justify-center font-sans text-[12px] font-bold text-white shadow-lg ${grade.c}`}>
                      {grade.l}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
