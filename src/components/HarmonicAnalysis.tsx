import React from 'react';
import { HarmonicAnalysisStep, VoiceTrack } from '../types/music.ts';
import { midiToNoteName } from '../algorithms/counterpoint.ts';
import { CheckCircle2, AlertTriangle, ArrowRightLeft, ShieldCheck } from 'lucide-react';

interface HarmonicAnalysisProps {
  analysis: HarmonicAnalysisStep[];
  tracks: VoiceTrack[];
}

export const HarmonicAnalysis: React.FC<HarmonicAnalysisProps> = ({ analysis, tracks }) => {
  const cfTrack = tracks.find((t) => t.isCantusFirmus);
  const totalNotes = analysis.length;

  if (totalNotes === 0) {
    return (
      <div className="bg-[#111622] rounded-2xl border border-[#212a3b] p-6 text-center text-slate-400">
        <p className="text-sm">No melody notes placed yet.</p>
        <p className="text-xs text-slate-500 mt-1">Place Cantus Firmus notes on the staff to inspect harmonic intervals.</p>
      </div>
    );
  }

  // Calculate statistics
  let totalIntervalsCount = 0;
  let consonantCount = 0;
  let contraryCount = 0;
  let warningCount = 0;

  analysis.forEach((step) => {
    step.intervals.forEach((inv) => {
      totalIntervalsCount++;
      if (inv.consonanceType === 'perfect' || inv.consonanceType === 'imperfect') {
        consonantCount++;
      }
      if (inv.motion === 'contrary') {
        contraryCount++;
      }
      if (inv.isParallelWarning) {
        warningCount++;
      }
    });
  });

  const consonancePct = totalIntervalsCount > 0 ? Math.round((consonantCount / totalIntervalsCount) * 100) : 100;
  const contraryPct = totalIntervalsCount > 0 ? Math.round((contraryCount / totalIntervalsCount) * 100) : 0;

  return (
    <div className="bg-[#111622] rounded-2xl border border-[#212a3b] p-3 sm:p-4 shadow-xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1c2434]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white tracking-tight">
            Harmonic & Voice-Leading Analysis
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          {totalNotes} Measures / Beats
        </span>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-[#090d14] p-2 rounded-xl border border-[#1a2333]">
          <div className="text-[10px] text-slate-400 font-mono">Consonance</div>
          <div className="text-sm sm:text-base font-bold text-emerald-400 font-mono tabular-nums">
            {consonancePct}%
          </div>
        </div>
        <div className="bg-[#090d14] p-2 rounded-xl border border-[#1a2333]">
          <div className="text-[10px] text-slate-400 font-mono">Contrary Motion</div>
          <div className="text-sm sm:text-base font-bold text-sky-400 font-mono tabular-nums">
            {contraryPct}%
          </div>
        </div>
        <div className="bg-[#090d14] p-2 rounded-xl border border-[#1a2333]">
          <div className="text-[10px] text-slate-400 font-mono">Parallel Flags</div>
          <div className={`text-sm sm:text-base font-bold font-mono tabular-nums ${warningCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            {warningCount}
          </div>
        </div>
      </div>

      {/* Step by Step Interval Feed */}
      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {analysis.map((step, idx) => {
          const cfPitchInfo = midiToNoteName(step.cfPitch);
          const barNum = Math.floor(step.beat / 4) + 1;
          const beatInBar = (Math.floor(step.beat) % 4) + 1;

          return (
            <div
              key={`analysis-step-${idx}`}
              className="bg-[#090d14] p-2.5 rounded-xl border border-[#1a2333] text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between font-mono text-[11px] text-slate-400 border-b border-[#141a27] pb-1">
                <span>
                  Bar {barNum}:{beatInBar} (Beat {step.beat})
                </span>
                <span className="text-emerald-400 font-bold">
                  CF: {cfPitchInfo.fullName}
                </span>
              </div>

              {step.intervals.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  Generate counterpoint to inspect voice intervals.
                </p>
              ) : (
                <div className="space-y-1">
                  {step.intervals.map((inv, iidx) => {
                    const track = tracks.find((t) => t.id === inv.trackId);
                    const cpMidi = step.cpPitches[inv.trackId];
                    const cpPitchInfo = cpMidi ? midiToNoteName(cpMidi) : null;

                    return (
                      <div
                        key={`interval-${idx}-${iidx}`}
                        className="flex flex-wrap items-center justify-between gap-1 text-[11px]"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: track?.color || '#38bdf8' }}
                          />
                          <span className="font-semibold text-slate-200">
                            {track?.voiceRole.toUpperCase()}: {cpPitchInfo?.fullName}
                          </span>
                          <span className="text-slate-500">→</span>
                          <span className="text-sky-300 font-medium">
                            {inv.intervalName}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {inv.motion && (
                            <span className="text-[10px] font-mono text-slate-400 uppercase bg-[#141c2c] px-1.5 py-0.5 rounded">
                              {inv.motion}
                            </span>
                          )}

                          {inv.isParallelWarning ? (
                            <span className="text-[10px] text-amber-400 flex items-center gap-1 font-bold">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              Parallel 5th/8ve
                            </span>
                          ) : inv.consonanceType === 'perfect' ? (
                            <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded font-mono">
                              Perfect Consonance
                            </span>
                          ) : inv.consonanceType === 'imperfect' ? (
                            <span className="text-[10px] text-teal-300 bg-teal-950/60 px-1.5 py-0.5 rounded font-mono">
                              Imperfect Consonance
                            </span>
                          ) : (
                            <span className="text-[10px] text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded font-mono">
                              Pandiatonic Color
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
