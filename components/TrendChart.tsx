"use client";

interface ScanSummary {
  id: string;
  query: string;
  timestamp: string;
  total_brands?: number;
  blind_spots?: number;
}

interface TrendChartProps {
  scans: ScanSummary[];
}

export default function TrendChart({ scans }: TrendChartProps) {
  if (scans.length === 0) {
    return (
      <div className="obsidian-card p-8 text-center">
        <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-600">No Scan History</p>
        <p className="font-serif text-lg text-zinc-500 mt-2">Run your first scan to see trends.</p>
      </div>
    );
  }

  // Take last 10 scans for the chart
  const chartScans = scans.slice(0, 10).reverse();
  const maxBrands = Math.max(...chartScans.map(s => s.total_brands || 0), 1);

  return (
    <div className="obsidian-card overflow-hidden">
      <div className="px-6 py-4 border-b border-white/5">
        <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-600">Scan Activity</p>
        <h3 className="font-serif text-xl text-white mt-1">Recent Scans</h3>
      </div>
      <div className="p-6">
        {/* Simple bar chart */}
        <div className="flex items-end gap-2 h-32">
          {chartScans.map((scan, i) => {
            const height = ((scan.total_brands || 0) / maxBrands) * 100;
            const hasBlindSpots = (scan.blind_spots || 0) > 0;
            return (
              <div key={scan.id || i} className="flex-1 flex flex-col items-center gap-1" title={`${scan.query}\n${scan.timestamp}`}>
                <span className="font-sans text-[8px] text-zinc-600">{scan.total_brands || 0}</span>
                <div className="w-full flex flex-col-reverse gap-0.5 flex-1 items-center justify-end">
                  <div
                    className={`w-full rounded-t transition-all ${hasBlindSpots ? "bg-amber-500/60" : "bg-indigo-500/60"}`}
                    style={{ height: `${Math.max(height, 10)}%` }}
                  />
                </div>
                <span className="font-sans text-[7px] text-zinc-700 truncate max-w-full">
                  {new Date(scan.timestamp).toLocaleDateString("en", { month: "short", day: "numeric" })}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm bg-indigo-500/60" />
            <span className="font-sans text-[9px] text-zinc-600">Clean Scan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm bg-amber-500/60" />
            <span className="font-sans text-[9px] text-zinc-600">Blind Spots Found</span>
          </div>
        </div>
      </div>
    </div>
  );
}
