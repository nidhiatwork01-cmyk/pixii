"use client";

import { useEffect, useState } from "react";

const STEPS = [
  { label: "Connecting to Groq", detail: "Groq API — llama-3.3-70b-versatile", engine: "groq" },
  { label: "Querying Llama 3...", detail: "Awaiting response from Groq", engine: "groq" },
  { label: "Connecting to Gemini", detail: "Google AI — gemini-1.5-flash", engine: "gemini" },
  { label: "Querying Gemini...", detail: "Awaiting response from Google", engine: "gemini" },
  { label: "Parsing results...", detail: "Extracting brand mentions & sentiment", engine: "parse" },
  { label: "Building report card", detail: "Scoring brands across engines", engine: "parse" },
];

const ENGINE_COLORS = {
  groq: "text-amber-400",
  gemini: "text-sky-400",
  parse: "text-violet-400",
};

interface LoadingSequenceProps {
  isVisible: boolean;
}

export default function LoadingSequence({ isVisible }: LoadingSequenceProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= STEPS.length - 1) return prev;
        return prev + 1;
      });
    }, 900);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A0A0A]/95 backdrop-blur-sm">
      {/* Animated scanline overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="scanline-anim" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Terminal window chrome */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
          {/* Title bar */}
          <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/60" />
              <span className="w-3 h-3 rounded-full bg-amber-500/60" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
            </div>
            <span className="font-mono text-[10px] text-zinc-500 ml-2 uppercase tracking-widest">
              pixii-aeo-scout / diagnostic
            </span>
          </div>

          {/* Steps list */}
          <div className="bg-[#0D0D0D] p-5 space-y-3">
            {STEPS.map((step, i) => {
              const isDone = i < currentStep;
              const isActive = i === currentStep;
              const isPending = i > currentStep;
              const color = ENGINE_COLORS[step.engine as keyof typeof ENGINE_COLORS];

              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 transition-all duration-300 ${
                    isPending ? "opacity-20" : "opacity-100"
                  }`}
                >
                  {/* Status icon */}
                  <div className="shrink-0 mt-0.5">
                    {isDone ? (
                      <span className="font-mono text-xs text-emerald-400">✓</span>
                    ) : isActive ? (
                      <span className={`font-mono text-xs ${color} animate-pulse`}>▶</span>
                    ) : (
                      <span className="font-mono text-xs text-zinc-700">○</span>
                    )}
                  </div>

                  {/* Step text */}
                  <div>
                    <p
                      className={`font-mono text-sm font-bold transition-colors ${
                        isDone
                          ? "text-zinc-500"
                          : isActive
                          ? color
                          : "text-zinc-700"
                      }`}
                    >
                      {step.label}
                      {isActive && (
                        <span className="ml-1 animate-pulse">_</span>
                      )}
                    </p>
                    <p className="font-mono text-[10px] text-zinc-600 mt-0.5">{step.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Amber progress bar */}
          <div className="bg-zinc-900 border-t border-zinc-800 px-5 py-3">
            <div className="h-0.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(245,166,35,0.8)]"
                style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              />
            </div>
            <p className="font-mono text-[9px] text-zinc-700 mt-1.5 text-right">
              {Math.round(((currentStep + 1) / STEPS.length) * 100)}%
            </p>
          </div>
        </div>

        {/* Pixii branding */}
        <p className="text-center font-mono text-[10px] text-zinc-700 mt-4 uppercase tracking-widest">
          Pixii AEO Scout — AI visibility diagnostic
        </p>
      </div>
    </div>
  );
}
