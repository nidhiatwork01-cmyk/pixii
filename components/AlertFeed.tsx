"use client";

interface Alert {
  timestamp: string;
  type: string;
  brand: string;
  message: string;
  severity: string;
  delivered: boolean;
  channel?: string;
}

interface AlertFeedProps {
  alerts: Alert[];
}

const SEVERITY_STYLES: Record<string, { border: string; badge: string; text: string }> = {
  CRITICAL: { border: "border-red-500/30", badge: "bg-red-500/20 text-red-400", text: "text-red-300" },
  HIGH: { border: "border-amber-500/30", badge: "bg-amber-500/20 text-amber-400", text: "text-amber-300" },
  MEDIUM: { border: "border-indigo-500/30", badge: "bg-indigo-500/20 text-indigo-400", text: "text-indigo-300" },
  LOW: { border: "border-emerald-500/30", badge: "bg-emerald-500/20 text-emerald-400", text: "text-emerald-300" },
};

export default function AlertFeed({ alerts }: AlertFeedProps) {
  if (alerts.length === 0) {
    return (
      <div className="obsidian-card p-8 text-center">
        <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-zinc-600">No Alerts</p>
        <p className="font-serif text-lg text-zinc-500 mt-2">All systems nominal. No anomalies detected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, i) => {
        const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.MEDIUM;
        return (
          <div key={i} className={`obsidian-card p-5 border-l-2 ${style.border} transition-all hover:border-opacity-100`}>
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <span className={`font-sans text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${style.badge}`}>
                  {alert.severity}
                </span>
                <span className="font-sans text-[9px] uppercase tracking-widest text-zinc-600">
                  {alert.type.replace(/_/g, " ")}
                </span>
              </div>
              <span className="font-sans text-[9px] text-zinc-700 shrink-0">
                {new Date(alert.timestamp).toLocaleDateString()}
              </span>
            </div>
            <h3 className={`font-serif text-lg ${style.text} mb-1`}>{alert.brand}</h3>
            <p className="font-sans text-sm text-zinc-400 leading-relaxed">{alert.message}</p>
          </div>
        );
      })}
    </div>
  );
}
