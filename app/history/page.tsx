"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AlertFeed from "@/components/AlertFeed";
import TrendChart from "@/components/TrendChart";

interface ScanSummary {
  id: string;
  query: string;
  timestamp: string;
  total_brands?: number;
  blind_spots?: number;
  agent_response?: string;
}

interface Alert {
  timestamp: string;
  type: string;
  brand: string;
  message: string;
  severity: string;
  delivered: boolean;
  channel?: string;
}

export default function HistoryPage() {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/history")
      .then(res => res.json())
      .then(data => {
        setScans(data.scans || []);
        setAlerts(data.alerts || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
          <span className="font-sans text-[10px] text-zinc-600 tracking-widest ml-1">/ SENTINEL LOG</span>
        </Link>
        <Link href="/" className="font-sans text-[10px] text-white hover:text-[#F5A623] transition-colors uppercase tracking-widest border border-white/10 px-5 py-1.5 rounded-full">
          ← Dashboard
        </Link>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-16 relative z-10">
        <header className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1] shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
            <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-600">Autonomous Agent History</p>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-white mb-4">Sentinel Log</h1>
          <p className="font-sans text-base text-zinc-500 max-w-2xl">
            Complete audit trail of every autonomous scan. The agent probes AI models, cross-references Amazon data,
            and records findings here — alerting you only when action is needed.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse" />
            <span className="font-sans text-[10px] text-zinc-600 uppercase tracking-widest ml-3">Loading history...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Trend Chart + Scan List */}
            <div className="lg:col-span-2 space-y-8">
              <TrendChart scans={scans} />

              {/* Scan List */}
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-4">Recent Scans</p>
                <div className="space-y-3">
                  {scans.length === 0 ? (
                    <div className="obsidian-card p-8 text-center">
                      <p className="font-serif text-lg text-zinc-500">No scans yet. Run the agent to see results here.</p>
                      <p className="font-sans text-[10px] text-zinc-700 mt-2">python agent/main.py --query &quot;best korean sunscreen&quot;</p>
                    </div>
                  ) : (
                    scans.map(scan => {
                      const isExpanded = expandedId === scan.id;
                      return (
                        <div key={scan.id} className="obsidian-card p-5 hover:border-white/20 transition-all cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : scan.id)}>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-serif text-base text-white">&ldquo;{scan.query}&rdquo;</h3>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="font-sans text-[9px] text-zinc-600 uppercase tracking-widest">
                                  {new Date(scan.timestamp).toLocaleString()}
                                </span>
                                <span className="font-sans text-[9px] text-zinc-600">
                                  {scan.total_brands || 0} brands
                                </span>
                                {(scan.blind_spots || 0) > 0 && (
                                  <span className="font-sans text-[9px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                    {scan.blind_spots} blind spots
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="font-sans text-[10px] text-zinc-600 uppercase tracking-widest mt-1">
                              {isExpanded ? "Collapse ▲" : "View Report ▼"}
                            </span>
                          </div>
                          {isExpanded && scan.agent_response && (
                            <div className="mt-5 pt-5 border-t border-white/5 font-sans text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto">
                              {scan.agent_response}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right: Alert Feed */}
            <div>
              <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-4">Alert Feed</p>
              <AlertFeed alerts={alerts} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
