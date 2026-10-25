import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Music2 } from 'lucide-react';
import { midiToNoteName } from '../algorithms/counterpoint.ts';

interface TouchNoteBarProps {
  onAppendNote: (midi: number, duration: number) => void;
  onRemoveLastNote: () => void;
  onPreviewPitch: (midi: number) => void;
  selectedDuration: number;
  onSelectDuration: (dur: number) => void;
  lastPitchMidi: number;
}

export const TouchNoteBar: React.FC<TouchNoteBarProps> = ({
  onAppendNote,
  onRemoveLastNote,
  onPreviewPitch,
  selectedDuration,
  onSelectDuration,
  lastPitchMidi,
}) => {
  const [octave, setOctave] = useState<number>(4);

  // Common diatonic scale buttons in current octave
  const scalePitches = [
    { name: 'C', pc: 0 },
    { name: 'D', pc: 2 },
    { name: 'E', pc: 4 },
    { name: 'F', pc: 5 },
    { name: 'G', pc: 7 },
    { name: 'A', pc: 9 },
    { name: 'B', pc: 11 },
  ];

  const handleTapPitch = (pc: number) => {
    const midi = (octave + 1) * 12 + pc;
    onPreviewPitch(midi);
    onAppendNote(midi, selectedDuration);
  };

  const handlePitchStep = (delta: number) => {
    const newMidi = Math.max(36, Math.min(84, lastPitchMidi + delta));
    onPreviewPitch(newMidi);
    onAppendNote(newMidi, selectedDuration);
  };

  return (
    <div className="bg-[#111622] rounded-2xl border border-[#212a3b] p-3 shadow-lg">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <Music2 className="w-3.5 h-3.5 text-sky-400" />
          <span>Touch Melody Keyboard</span>
          <span className="text-[10px] text-slate-400 font-normal">
            (Tap to append note)
          </span>
        </div>

        {/* Octave Shift */}
        <div className="flex items-center gap-1 bg-[#090d14] px-2 py-0.5 rounded-lg border border-[#1e2638]">
          <span className="text-[10px] font-mono text-slate-400">Octave:</span>
          <button
            onClick={() => setOctave(Math.max(2, octave - 1))}
            disabled={octave <= 2}
            className="w-6 h-6 rounded flex items-center justify-center text-xs text-slate-300 hover:text-white disabled:opacity-30"
          >
            -
          </button>
          <span className="text-xs font-bold font-mono text-sky-400 min-w-[12px] text-center">
            {octave}
          </span>
          <button
            onClick={() => setOctave(Math.min(5, octave + 1))}
            disabled={octave >= 5}
            className="w-6 h-6 rounded flex items-center justify-center text-xs text-slate-300 hover:text-white disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      {/* Note Pitch Keys (Diatonic quick tap) */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2.5">
        {scalePitches.map((p) => {
          const midi = (octave + 1) * 12 + p.pc;
          return (
            <button
              key={p.name}
              onClick={() => handleTapPitch(p.pc)}
              aria-label={`Add note ${p.name}${octave}`}
              className="min-h-[46px] rounded-xl bg-[#1b2233] hover:bg-sky-600/30 active:bg-sky-500 text-slate-100 active:text-slate-950 font-bold text-xs sm:text-sm border border-[#27334d] flex flex-col items-center justify-center transition-all active:scale-95 shadow-sm"
            >
              <span>{p.name}</span>
              <span className="text-[9px] font-mono font-normal text-slate-400">{octave}</span>
            </button>
          );
        })}
      </div>

      {/* Helper Tools: Step up/down, duration, and delete */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1a2233]">
        {/* Step Adjustment */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handlePitchStep(1)}
            aria-label="Step pitch up 1 semitone"
            className="min-h-[38px] px-2.5 rounded-lg bg-[#182030] hover:bg-[#222c42] text-slate-300 text-xs flex items-center gap-1 active:scale-95"
            title="Step Up (+1 semitone)"
          >
            <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-medium">+1 Semi</span>
          </button>
          <button
            onClick={() => handlePitchStep(-1)}
            aria-label="Step pitch down 1 semitone"
            className="min-h-[38px] px-2.5 rounded-lg bg-[#182030] hover:bg-[#222c42] text-slate-300 text-xs flex items-center gap-1 active:scale-95"
            title="Step Down (-1 semitone)"
          >
            <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] font-medium">-1 Semi</span>
          </button>
        </div>

        {/* Duration Select */}
        <div className="flex items-center gap-1 bg-[#0a0e16] p-0.5 rounded-lg border border-[#1e2638]">
          {[
            { dur: 4, label: 'Whole (4b)' },
            { dur: 2, label: 'Half (2b)' },
            { dur: 1, label: 'Quarter (1b)' },
          ].map((d) => (
            <button
              key={d.dur}
              onClick={() => onSelectDuration(d.dur)}
              aria-label={`Select ${d.label}`}
              className={`px-2 py-1 text-[11px] font-medium rounded-md transition-all ${
                selectedDuration === d.dur
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Delete Last Note */}
        <button
          onClick={onRemoveLastNote}
          aria-label="Remove last note"
          className="min-h-[38px] px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs flex items-center gap-1.5 transition-all active:scale-95"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold">Delete Note</span>
        </button>
      </div>
    </div>
  );
};
