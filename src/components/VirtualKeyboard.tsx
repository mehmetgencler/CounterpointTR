import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceTrack, NoteEvent } from '../types/music.ts';
import {
  Piano,
  Music,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Play,
  Square,
  Undo2,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Keyboard,
} from 'lucide-react';
import { midiToNoteName, noteNameToMidi } from '../algorithms/counterpoint.ts';

interface VirtualKeyboardProps {
  cfTrack: VoiceTrack;
  onInsertNoteIntoCf: (midi: number, duration: number, isRest?: boolean) => void;
  onRemoveLastNoteFromCf: () => void;
  onPlayCfTrack: () => void;
  isPlayingCf: boolean;
  selectedDuration: number;
  onSelectDuration: (dur: number) => void;
  onPreviewPitch: (midi: number) => void;
  onClose: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
}

// QWERTY Computer Keyboard mapping to notes relative to base octave
// Row 1: A W S E D F T G Y H U J K (C, C#, D, D#, E, F, F#, G, G#, A, A#, B, C+1)
const KEYBOARD_MAP: Record<string, number> = {
  a: 0, // C
  w: 1, // C#
  s: 2, // D
  e: 3, // D#
  d: 4, // E
  f: 5, // F
  t: 6, // F#
  g: 7, // G
  y: 8, // G#
  h: 9, // A
  u: 10, // A#
  j: 11, // B
  k: 12, // C+1
  o: 13, // C#+1
  l: 14, // D+1
  p: 15, // D#+1
  ';': 16, // E+1
};

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  cfTrack,
  onInsertNoteIntoCf,
  onRemoveLastNoteFromCf,
  onPlayCfTrack,
  isPlayingCf,
  selectedDuration,
  onSelectDuration,
  onPreviewPitch,
  onClose,
  onUndo,
  canUndo,
}) => {
  // Base octave for keyboard (Default Octave 4: C4 to B5)
  const [baseOctave, setBaseOctave] = useState<number>(4);
  // Mode: 'insert' (Record notes into Cantus Firmus on key press) vs 'audition' (Preview only)
  const [insertMode, setInsertMode] = useState<boolean>(true);
  // Active down-pressed MIDI notes for visual key lighting
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  // Show QWERTY shortcut hints on piano keys
  const [showKeyLabels, setShowKeyLabels] = useState<boolean>(true);

  const durationOptions = [
    { value: 4, label: 'Whole', symbol: '𝅝', desc: '4 Beats' },
    { value: 2, label: 'Half', symbol: '𝅗𝅥', desc: '2 Beats' },
    { value: 1, label: 'Quarter', symbol: '♩', desc: '1 Beat' },
    { value: 0.5, label: 'Eighth', symbol: '♪', desc: '½ Beat' },
  ];

  // Trigger playing and optional inserting of a MIDI note
  const triggerNote = useCallback(
    (midi: number) => {
      // Light up key
      setActiveNotes((prev) => new Set([...prev, midi]));
      setTimeout(() => {
        setActiveNotes((prev) => {
          const next = new Set(prev);
          next.delete(midi);
          return next;
        });
      }, 160);

      // Play audio preview
      onPreviewPitch(midi);

      // If in insert mode, add note into Cantus Firmus track!
      if (insertMode) {
        onInsertNoteIntoCf(midi, selectedDuration, false);
      }
    },
    [insertMode, selectedDuration, onInsertNoteIntoCf, onPreviewPitch]
  );

  // Insert a musical rest / silence into Cantus Firmus
  const handleInsertRest = useCallback(() => {
    onInsertNoteIntoCf(60, selectedDuration, true);
  }, [selectedDuration, onInsertNoteIntoCf]);

  // Handle physical QWERTY keyboard typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.repeat) return;

      const key = e.key.toLowerCase();
      if (KEYBOARD_MAP[key] !== undefined) {
        e.preventDefault();
        const semitoneOffset = KEYBOARD_MAP[key];
        const baseMidi = (baseOctave + 1) * 12; // C of baseOctave
        const targetMidi = baseMidi + semitoneOffset;
        triggerNote(targetMidi);
      } else if (key === 'z' && !e.ctrlKey && !e.metaKey) {
        // Octave down
        setBaseOctave((o) => Math.max(2, o - 1));
      } else if (key === 'x' && !e.ctrlKey && !e.metaKey) {
        // Octave up
        setBaseOctave((o) => Math.min(5, o + 1));
      } else if (key === 'backspace' && !e.ctrlKey && !e.metaKey) {
        onRemoveLastNoteFromCf();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [baseOctave, triggerNote, onRemoveLastNoteFromCf]);

  // Generate 2 full octaves of piano keys (24 semitones: C to B in baseOctave, and C to B in baseOctave+1)
  const numOctaves = 2;
  const whiteKeyPitches = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B
  const blackKeyOffsets: Record<number, number> = {
    0: 1, // C#
    2: 3, // D#
    5: 6, // F#
    7: 8, // G#
    9: 10, // A#
  };

  // Keyboard shortcut hints for keys
  const getShortcutKey = (midi: number): string | null => {
    const startMidi = (baseOctave + 1) * 12;
    const diff = midi - startMidi;
    for (const [k, v] of Object.entries(KEYBOARD_MAP)) {
      if (v === diff) return k.toUpperCase();
    }
    return null;
  };

  return (
    <div className="bg-[#12151f] border-t-2 border-b-2 border-amber-500/40 p-3 sm:p-4 shadow-2xl relative select-none animate-in fade-in slide-in-from-bottom-2">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#212739]">
        {/* Left: Title & Track Badge */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Piano className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                Virtual Piano Keyboard
                <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 border border-amber-600/60 px-1.5 py-0.2 rounded font-semibold">
                  MELODY INPUT
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              Target:{' '}
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {cfTrack.name} ({cfTrack.notes.length} notes)
              </span>
            </p>
          </div>
        </div>

        {/* Center: Note Duration, Rest Button, Backspace */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Insert vs Audition Mode */}
          <div className="flex items-center bg-[#090b10] p-0.5 rounded-xl border border-[#1e2638]">
            <button
              onClick={() => setInsertMode(true)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all ${
                insertMode
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Clicking piano keys inserts notes into Cantus Firmus"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Step Insert</span>
            </button>
            <button
              onClick={() => setInsertMode(false)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition-all ${
                !insertMode
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Clicking piano keys plays sound without inserting"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Audition</span>
            </button>
          </div>

          {/* Duration Selector */}
          <div className="flex items-center bg-[#090b10] p-0.5 rounded-xl border border-[#1e2638]">
            {durationOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onSelectDuration(opt.value)}
                className={`px-2 py-1 text-xs font-mono font-medium rounded-lg flex items-center gap-1 transition-all ${
                  selectedDuration === opt.value
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`${opt.label} Note (${opt.desc})`}
              >
                <span className="text-sm leading-none">{opt.symbol}</span>
                <span className="text-[10px] hidden sm:inline">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Insert Rest / Silence */}
          <button
            onClick={handleInsertRest}
            className="px-2.5 py-1 rounded-xl text-xs font-mono font-semibold bg-[#1a1f2c] hover:bg-[#252c3e] text-amber-300 border border-[#2b354d] flex items-center gap-1 transition-colors active:scale-95"
            title="Insert a silent rest of selected duration"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span>+ Rest (𝄽)</span>
          </button>

          {/* Delete Last Note */}
          <button
            onClick={onRemoveLastNoteFromCf}
            disabled={cfTrack.notes.length === 0}
            className="px-2.5 py-1 rounded-xl text-xs font-mono font-semibold bg-[#21161a] hover:bg-rose-950 text-rose-300 border border-rose-900/50 flex items-center gap-1 transition-colors active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Remove last note from Cantus Firmus (Backspace)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Last</span>
          </button>

          {/* Play Cantus Firmus Solo */}
          <button
            onClick={onPlayCfTrack}
            disabled={cfTrack.notes.length === 0}
            className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95 disabled:opacity-40 ${
              isPlayingCf
                ? 'bg-emerald-500 text-slate-950 animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title="Play / Audition the current Cantus Firmus melody"
          >
            {isPlayingCf ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlayingCf ? 'Stop' : 'Play Theme'}</span>
          </button>
        </div>

        {/* Right: Octave Controls, QWERTY Toggle & Close */}
        <div className="flex items-center gap-2">
          {/* Octave Shifter */}
          <div className="flex items-center gap-1 bg-[#090d14] px-2 py-1 rounded-xl border border-[#1e2638]">
            <span className="text-[10px] font-mono text-slate-400">Octave:</span>
            <button
              onClick={() => setBaseOctave((o) => Math.max(2, o - 1))}
              disabled={baseOctave <= 2}
              className="w-5 h-5 rounded bg-[#181d2a] hover:bg-[#252d40] text-slate-300 flex items-center justify-center font-bold text-xs disabled:opacity-30"
              title="Lower octave (Z key)"
            >
              -
            </button>
            <span className="text-xs font-bold font-mono text-amber-400 px-1">
              C{baseOctave}–B{baseOctave + 1}
            </span>
            <button
              onClick={() => setBaseOctave((o) => Math.min(5, o + 1))}
              disabled={baseOctave >= 5}
              className="w-5 h-5 rounded bg-[#181d2a] hover:bg-[#252d40] text-slate-300 flex items-center justify-center font-bold text-xs disabled:opacity-30"
              title="Raise octave (X key)"
            >
              +
            </button>
          </div>

          {/* QWERTY labels toggle */}
          <button
            onClick={() => setShowKeyLabels(!showKeyLabels)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showKeyLabels
                ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                : 'bg-[#151822] text-slate-400 border-[#242b3b]'
            }`}
            title="Toggle computer keyboard shortcuts on keys"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          {/* Close Virtual Keyboard */}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#1a1f2c] hover:bg-[#293247] text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            title="Close Virtual Keyboard"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Interactive Piano Keyboard (2 Octaves) */}
      <div className="mt-3 flex justify-center overflow-x-auto pb-1 custom-scrollbar">
        <div className="relative inline-flex bg-[#080a0f] p-2 rounded-2xl border-2 border-[#2b3346] shadow-[0_12px_30px_rgba(0,0,0,0.8)]">
          {Array.from({ length: numOctaves }).map((_, octIdx) => {
            const currentOct = baseOctave + octIdx;
            const startMidi = (currentOct + 1) * 12;

            return (
              <div key={currentOct} className="flex relative">
                {/* White Keys */}
                {whiteKeyPitches.map((pitchClass, whiteIdx) => {
                  const midi = startMidi + pitchClass;
                  const { name } = midiToNoteName(midi);
                  const isPressed = activeNotes.has(midi);
                  const shortcut = showKeyLabels ? getShortcutKey(midi) : null;

                  return (
                    <button
                      key={midi}
                      onClick={() => triggerNote(midi)}
                      className={`relative w-10 sm:w-12 h-36 sm:h-40 rounded-b-lg border-x border-b border-slate-300 flex flex-col justify-end items-center pb-2 transition-all active:scale-[0.98] ${
                        isPressed
                          ? 'bg-amber-400 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.9)] translate-y-1'
                          : 'bg-gradient-to-b from-slate-100 via-white to-slate-200 hover:bg-slate-50 text-slate-900 shadow-[inset_0_-2px_4px_rgba(0,0,0,0.2)]'
                      }`}
                      title={`${name}${currentOct} (MIDI ${midi})`}
                    >
                      {/* Shortcut letter badge */}
                      {shortcut && (
                        <span className="text-[9px] font-mono font-bold px-1 rounded bg-slate-300/80 text-slate-800 mb-1">
                          {shortcut}
                        </span>
                      )}
                      <span className="text-xs font-bold font-mono">{name}</span>
                      <span className="text-[9px] font-mono text-slate-500">{currentOct}</span>
                    </button>
                  );
                })}

                {/* Black Keys (Overlayed between specific white keys) */}
                {/* Black key positions relative to white keys: C#(1), D#(2), F#(4), G#(5), A#(6) */}
                {[
                  { pc: 1, leftOffset: 'left-[26px] sm:left-[32px]' }, // C#
                  { pc: 3, leftOffset: 'left-[66px] sm:left-[80px]' }, // D#
                  { pc: 6, leftOffset: 'left-[146px] sm:left-[176px]' }, // F#
                  { pc: 8, leftOffset: 'left-[186px] sm:left-[224px]' }, // G#
                  { pc: 10, leftOffset: 'left-[226px] sm:left-[272px]' }, // A#
                ].map(({ pc, leftOffset }) => {
                  const midi = startMidi + pc;
                  const { name } = midiToNoteName(midi);
                  const isPressed = activeNotes.has(midi);
                  const shortcut = showKeyLabels ? getShortcutKey(midi) : null;

                  return (
                    <button
                      key={midi}
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerNote(midi);
                      }}
                      className={`absolute top-2 ${leftOffset} w-6 sm:w-7 h-22 sm:h-24 rounded-b-md z-20 flex flex-col justify-end items-center pb-1 transition-all active:scale-[0.98] ${
                        isPressed
                          ? 'bg-amber-400 text-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.9)] translate-y-1'
                          : 'bg-gradient-to-b from-[#2a303f] via-[#121620] to-[#0a0d14] hover:from-[#353d4f] text-slate-100 shadow-[0_4px_8px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                      }`}
                      title={`${name}${currentOct} (MIDI ${midi})`}
                    >
                      {shortcut && (
                        <span className="text-[8px] font-mono font-bold px-0.5 rounded bg-amber-400 text-slate-950 mb-0.5">
                          {shortcut}
                        </span>
                      )}
                      <span className="text-[9px] font-bold font-mono">{name}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Computer Keyboard Hint Banner */}
      <div className="mt-2 text-center text-[10px] font-mono text-slate-400">
        💡 <span className="text-slate-300 font-semibold">Musical Typing Active:</span> Play with your computer keys{' '}
        <span className="text-amber-300 font-bold">A W S E D F T G Y H U J K</span> · Octaves with{' '}
        <span className="text-sky-300 font-bold">Z / X</span> · Delete with{' '}
        <span className="text-rose-300 font-bold">Backspace</span>
      </div>
    </div>
  );
};
