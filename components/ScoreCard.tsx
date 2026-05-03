"use client";

import { ParsedResult } from "@/lib/parseResponse";

interface ScoreCardProps {
  results: (ParsedResult & { error?: string })[];
}

type Grade = "A" | "B" | "C" | "D" | "F";

const GRADE_STYLES: Record<Grade, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-emerald-400/15", text: "text-emerald-400", border: "border-emerald-400/40" },
  B: { bg: "bg-amber-400/15", text: "text-amber-400", border: "border-amber-400/40" },
  C: { bg: "bg-orange-400/15", text: "text-orange-400", border: "border-orange-400/40" },
  D: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/40" },
  F: { bg: "bg-zinc-800", text: "text-zinc-500", border: "border-zinc-700" },
};

function calculateGrade(rank: number | null, sentiment: string | null): Grade {
  if (rank === null) return "F";
  let score = 100 - (rank - 1) * 20; // 100 for #1, 80 for #2, etc.
  if (sentiment === "positive") score += 15;
  if (sentiment === "mentioned briefly") score -= 20;
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 55) return "C";
  if (score >= 35) return "D";
  return "F";
}

function getBrandSummary(brand: string, results: (ParsedResult & { error?: string })[]): string {
  const appearances = results.map((r) => {
    const m = r.mentions.find((m) => m.brand.toLowerCase() === brand.toLowerCase());
    return m ? { engine: r.engine, rank: m.rank } : null;
  });
  const found = appearances.filter(Boolean);

  if (found.length === 2) {
    const ranks = found.map((f) => `#${f!.rank} on ${f!.engine}`).join(" & ");
    return `Appears in both engines — ${ranks}`;
  }
  if (found.length === 1) {
    const f = found[0]!;
    return `Only visible to ${f.engine} at position #${f.rank}`;
  }
  return "Invisible to AI — not mentioned in either engine";
}

export default function ScoreCard({ results }: ScoreCardProps) {
  // Collect all unique brands across both engines
  const allBrands = new Map<string, { engine: string; rank: number; sentiment: string }[]>();

  for (const result of results) {
    for (const mention of result.mentions) {
      const key = mention.brand.toLowerCase();
      if (!allBrands.has(key)) allBrands.set(key, []);
      allBrands.get(key)!.push({
        engine: result.engine,
        rank: mention.rank,
        sentiment: mention.sentiment,
      });
    }
  }

  // Sort: brands in both engines first, then by combined rank score
  const sorted = Array.from(allBrands.entries()).sort((a, b) => {
    const aScore = a[1].reduce((s, m) => s + (10 - m.rank), 0);
    const bScore = b[1].reduce((s, m) => s + (10 - m.rank), 0);
    return bScore - aScore;
  });

  const allEngines = results.map((r) => r.engine);

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <div className="border-b border-zinc-800 bg-zinc-900/60 px-5 py-4">
        <h2 className="font-mono text-xs font-bold tracking-widest uppercase text-zinc-400">
          ◈ Combined Score Card
        </h2>
        <p className="font-mono text-[10px] text-zinc-600 mt-0.5">
          Graded across all AI engines combined
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <th className="text-left px-5 py-3 font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                Brand
              </th>
              {allEngines.map((engine) => (
                <th
                  key={engine}
                  className="text-center px-4 py-3 font-mono text-[10px] text-zinc-500 uppercase tracking-widest"
                >
                  {engine}
                </th>
              ))}
              <th className="text-center px-4 py-3 font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                Grade
              </th>
              <th className="text-left px-5 py-3 font-mono text-[10px] text-zinc-500 uppercase tracking-widest hidden md:table-cell">
                Insight
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, 10).map(([brandKey, appearances]) => {
              // Recover display casing
              const displayName = results
                .flatMap((r) => r.mentions)
                .find((m) => m.brand.toLowerCase() === brandKey)?.brand ?? brandKey;

              const rankByEngine = Object.fromEntries(
                appearances.map((a) => [a.engine, { rank: a.rank, sentiment: a.sentiment }])
              );

              // Overall grade: average of per-engine grades
              const grades = allEngines.map((engine) => {
                const data = rankByEngine[engine];
                return calculateGrade(data?.rank ?? null, data?.sentiment ?? null);
              });
              const gradeOrder: Grade[] = ["A", "B", "C", "D", "F"];
              const worstGrade = grades.sort(
                (a, b) => gradeOrder.indexOf(b) - gradeOrder.indexOf(a)
              )[0] as Grade;
              const gradeStyle = GRADE_STYLES[worstGrade];

              const summary = getBrandSummary(displayName, results);

              return (
                <tr
                  key={brandKey}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <span className="font-fraunces text-sm text-white font-medium">
                      {displayName}
                    </span>
                  </td>
                  {allEngines.map((engine) => {
                    const data = rankByEngine[engine];
                    const g = calculateGrade(data?.rank ?? null, data?.sentiment ?? null);
                    const gs = GRADE_STYLES[g];
                    return (
                      <td key={engine} className="text-center px-4 py-3.5">
                        {data ? (
                          <span className="font-mono text-sm text-zinc-300">#{data.rank}</span>
                        ) : (
                          <span className="font-mono text-xs text-zinc-700">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-center px-4 py-3.5">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-md border font-mono text-sm font-black ${gradeStyle.bg} ${gradeStyle.text} ${gradeStyle.border}`}
                    >
                      {worstGrade}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className="font-mono text-[10px] text-zinc-500 leading-relaxed">
                      {summary}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="py-12 text-center font-mono text-xs text-zinc-600">
            No brand data to score yet.
          </div>
        )}
      </div>
    </div>
  );
}
