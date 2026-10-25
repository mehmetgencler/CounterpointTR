import React from 'react';
import { MelodyAnalysis } from '../types/music.ts';
import { Activity, Sparkles, TrendingUp, CheckCircle, Lightbulb, Compass } from 'lucide-react';

interface MelodyAnalysisCardProps {
  analysis: MelodyAnalysis;
  onApplyAndGenerate: () => void;
  isGenerating: boolean;
  hasNotes: boolean;
}

export const MelodyAnalysisCard: React.FC<MelodyAnalysisCardProps> = ({
  analysis,
  onApplyAndGenerate,
  isGenerating,
  hasNotes,
}) => {
  if (!hasNotes) {
    return (
      <div className="bg-[#111622] rounded-2xl border border-[#212a3b] p-4 text-center text-slate-400">
        <Activity className="w-6 h-6 mx-auto mb-2 text-sky-400/50" />
        <h3 className="text-sm font-semibold text-slate-300">Melody Analyzer</h3>
        <p className="text-xs text-slate-500 mt-1">
          Start placing Cantus Firmus notes on the staff to analyze modal key, contour, and vocal balance.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#111622] rounded-2xl border border-sky-500/30 p-4 shadow-xl space-y-3.5 relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1c2434]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-bold text-white tracking-tight">
            Melodic Analysis & Intelligence
          </h2>
        </div>
        <span className="text-[10px] font-mono uppercase bg-sky-950/70 border border-sky-800/60 text-sky-300 px-2 py-0.5 rounded-full">
          {analysis.confidence}% Tonal Match
        </span>
      </div>

      {/* Detected Key & Mode Highlight */}
      <div className="bg-[#090d14] p-3 rounded-xl border border-[#1a2333] flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono uppercase text-slate-400 block">
            Detected Tonal Center & Mode
          </span>
          <div className="text-base sm:text-lg font-bold text-sky-300 flex items-center gap-2">
            <span>{analysis.detectedKey} {analysis.detectedMode.charAt(0).toUpperCase() + analysis.detectedMode.slice(1)}</span>
            <span className="text-xs font-mono font-normal text-slate-400">
              (Cadence: {analysis.cadenceQuality})
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-slate-400 block">Voice Register</span>
          <span className="text-xs font-bold font-mono text-emerald-400 uppercase bg-emerald-950/60 px-2 py-0.5 rounded">
            {analysis.recommendedCfRole}
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-[#090d14] p-2 rounded-xl border border-[#1a2333]">
          <span className="text-[10px] text-slate-400 font-mono block">Pitch Range</span>
          <span className="font-bold text-slate-200 font-mono">
            {analysis.pitchRange.minNote}–{analysis.pitchRange.maxNote}
          </span>
          <span className="text-[9px] text-slate-500 block">({analysis.pitchRange.spanSemitones}st)</span>
        </div>

        <div className="bg-[#090d14] p-2 rounded-xl border border-[#1a2333]">
          <span className="text-[10px] text-slate-400 font-mono block">Climax Note</span>
          <span className="font-bold text-amber-300 font-mono">
            {analysis.climaxNote.name}
          </span>
          <span className="text-[9px] text-slate-500 block">Bar {Math.floor(analysis.climaxNote.beat / 4) + 1}</span>
        </div>

        <div className="bg-[#090d14] p-2 rounded-xl border border-[#1a2333]">
          <span className="text-[10px] text-slate-400 font-mono block">Steps / Leaps</span>
          <span className="font-bold text-teal-300 font-mono">
            {analysis.stepPercentage}% / {analysis.leapPercentage}%
          </span>
          <span className="text-[9px] text-slate-500 block">
            {analysis.contourType}
          </span>
        </div>
      </div>

      {/* Constructive Insights / Suggestions */}
      <div className="space-y-1.5 text-xs text-slate-300 bg-[#090d14] p-2.5 rounded-xl border border-[#1a2333]">
        <div className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
          <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          <span>Contrapuntal Observations</span>
        </div>
        <ul className="text-[11px] text-slate-400 space-y-1 pl-1">
          {analysis.suggestions.map((s, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="text-sky-400 shrink-0">•</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Primary Action Button: Analyze & Generate */}
      <button
        onClick={onApplyAndGenerate}
        disabled={isGenerating}
        aria-label="Generate counterpoint tailored to this melody"
        className={`w-full min-h-[46px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
          isGenerating
            ? 'bg-sky-600 text-white animate-pulse'
            : 'bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-500 text-white hover:brightness-110 shadow-sky-500/25 ring-1 ring-sky-300/40'
        }`}
      >
        <Sparkles className="w-4 h-4" />
        <span>
          {isGenerating
            ? 'Synthesizing Optimal Counterpoint Lines...'
            : `Generate Counterpoint for ${analysis.detectedKey} ${analysis.detectedMode.charAt(0).toUpperCase() + analysis.detectedMode.slice(1)}`}
        </span>
      </button>
    </div>
  );
};
