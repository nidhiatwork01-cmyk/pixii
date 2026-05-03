"use client";

import { BrandMention } from "@/lib/parseResponse";

interface BrandBadgeProps {
  mention: BrandMention;
}

const RANK_CONFIG = {
  1: {
    label: "01",
    color: "text-amber-400",
    border: "border-amber-400/60",
    bg: "bg-amber-400/10",
    glow: "shadow-[0_0_20px_rgba(245,166,35,0.3)]",
    pill: "bg-amber-400 text-black",
  },
  2: {
    label: "02",
    color: "text-slate-300",
    border: "border-slate-300/50",
    bg: "bg-slate-300/10",
    glow: "shadow-[0_0_15px_rgba(203,213,225,0.2)]",
    pill: "bg-slate-300 text-black",
  },
  3: {
    label: "03",
    color: "text-orange-600",
    border: "border-orange-600/50",
    bg: "bg-orange-600/10",
    glow: "shadow-[0_0_15px_rgba(234,88,12,0.2)]",
    pill: "bg-orange-600 text-white",
  },
};

const DEFAULT_RANK = {
  label: "—",
  color: "text-zinc-500",
  border: "border-zinc-700",
  bg: "bg-zinc-900",
  glow: "",
  pill: "bg-zinc-700 text-zinc-300",
};

const SENTIMENT_STYLES: Record<string, string> = {
  POSITIVE: "bg-emerald-400/15 text-emerald-400 border border-emerald-400/30",
  NEUTRAL: "bg-zinc-700/50 text-zinc-400 border border-zinc-600/30",
  NEGATIVE: "bg-red-500/15 text-red-400 border border-red-500/30",
};


export default function BrandBadge({ mention }: BrandBadgeProps) {
  const rank = mention.rank as 1 | 2 | 3;
  const cfg = RANK_CONFIG[rank] ?? DEFAULT_RANK;

  return (
    <div
      className={`relative rounded-lg border ${cfg.border} ${cfg.bg} ${cfg.glow} p-4 transition-all duration-300 hover:scale-[1.01] hover:brightness-110`}
    >
      {/* Rank number — oversized, editorial */}
      <div className="flex items-start gap-4">
        <span
          className={`font-mono text-4xl font-black leading-none ${cfg.color} select-none shrink-0`}
          aria-label={`Rank ${mention.rank}`}
        >
          {cfg.label}
        </span>

        <div className="flex-1 min-w-0">
          {/* Brand name */}
          <h3 className="font-fraunces text-lg font-semibold text-white leading-tight truncate">
            {mention.brand}
          </h3>

          {/* Sentiment pill */}
          <span
            className={`inline-block mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-widest ${
              SENTIMENT_STYLES[mention.sentiment]
            }`}
          >
            {mention.sentiment}
          </span>

          {/* Excerpt */}
          {mention.excerpt && (
            <blockquote className="mt-3 text-xs text-zinc-400 font-mono leading-relaxed border-l-2 border-amber-400/40 pl-3 line-clamp-3">
              &ldquo;{mention.excerpt}&rdquo;
            </blockquote>
          )}
        </div>
      </div>
    </div>
  );
}
