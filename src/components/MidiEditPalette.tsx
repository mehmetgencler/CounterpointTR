import React from 'react';
import { VoiceTrack, NoteEvent } from '../types/music.ts';
import {
  Undo2,
  Redo2,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Music,
  Check,
} from 'lucide-react';
import { midiToNoteName, noteNameToMidi } from '../algorithms/counterpoint.ts';

interface MidiEditPaletteProps {
  tracks: VoiceTrack[];
  activeTrackId: string;
  onSelectActiveTrack: (trackId: string) => void;
  selectedDuration: number;
  onSelectDuration: (duration: number) => void;
  isRestMode: boolean;
  onToggleRestMode: (isRest: boolean) => void;
  selectedNote: { trackId: string; note: NoteEvent } | null;
  onInsertAtPlayhead: (midi: number) => void;
  onModifySelectedNote: (updates: Partial<NoteEvent>) => void;
  onDeleteSelectedNote: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  currentBeat: number;
  onPreviewPitch: (midi: number) => void;
}

export const MidiEditPalette: React.FC<MidiEditPaletteProps> = ({
  tracks,
  activeTrackId,
  onSelectActiveTrack,
  selectedDuration,
  onSelectDuration,
  isRestMode,
  onToggleRestMode,
  selectedNote,
  onInsertAtPlayhead,
  onModifySelectedNote,
  onDeleteSelectedNote,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  undoCount,
  currentBeat,
  onPreviewPitch,
}) => {
  const activeTrack = tracks.find((t) => t.id === activeTrackId) || tracks[0];

  // Duration buttons with musical glyphs and labels
  const durationOptions = [
    { value: 4, label: 'Whole', symbol: '𝅝', beats: '4b' },
    { value: 2, label: 'Half', symbol: '𝅗𝅥', beats: '2b' },
    { value: 1, label: 'Quarter', symbol: '♩', beats: '1b' },
    { value: 0.5, label: 'Eighth', symbol: '♪', beats: '½b' },
  ];

  // Pitch selection for step input (diatonic scale notes + accidental sharps)
  const [selectedOctave, setSelectedOctave] = React.useState<number>(4);
  const [selectedPitchName, setSelectedPitchName] = React.useState<string>('D');

  const pitchNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const currentStepMidi = noteNameToMidi(selectedPitchName, selectedOctave);

  const handlePitchClick = (noteName: string) => {
    setSelectedPitchName(noteName);
    const midi = noteNameToMidi(noteName, selectedOctave);
    onPreviewPitch(midi);

    // If a note is currently selected on the track, immediately update its pitch!
    if (selectedNote) {
      const { name, octave } = midiToNoteName(midi);
      onModifySelectedNote({ midi, pitchName: name, octave, isRest: false });
    }
  };

  const handleOctaveChange = (delta: number) => {
    const newOct = Math.max(2, Math.min(6, selectedOctave + delta));
    setSelectedOctave(newOct);
    const midi = noteNameToMidi(selectedPitchName, newOct);
    onPreviewPitch(midi);

    if (selectedNote) {
      const { name, octave } = midiToNoteName(midi);
      onModifySelectedNote({ midi, pitchName: name, octave });
    }
  };

  return (
    <div className="bg-[#11141c] border-b border-[#212739] px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-slate-200 select-none shadow-lg">
      {/* 1. Track Selector & Edit Target */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-[#0a0d14] px-2.5 py-1.5 rounded-xl border border-[#1e2638]">
          <span className="text-[10px] font-mono uppercase text-slate-400">Edit Row:</span>
          <select
            value={activeTrackId}
            onChange={(e) => onSelectActiveTrack(e.target.value)}
            aria-label="Select track row to edit"
            className="bg-transparent text-xs font-bold border-none cursor-pointer focus:outline-none"
            style={{ color: activeTrack?.color || '#38bdf8' }}
          >
            {tracks.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#11141c] text-slate-200">
                Track {t.trackNumber || '•'} - {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Undo and Redo Action Group */}
        <div className="flex items-center gap-1 bg-[#0a0d14] p-1 rounded-xl border border-[#1e2638]">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo note edit"
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              canUndo
                ? 'text-slate-200 hover:text-white hover:bg-[#1a202e] active:scale-95'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo note edit"
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              canRedo
                ? 'text-slate-200 hover:text-white hover:bg-[#1a202e] active:scale-95'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y / Cmd+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Common DAW Note Palette (Duration, Note vs Rest, Step Pitches) */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Mode: Note vs Silence / Rest */}
        <div className="flex items-center bg-[#0a0d14] p-0.5 rounded-xl border border-[#1e2638]">
          <button
            onClick={() => onToggleRestMode(false)}
            aria-label="Note mode"
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all ${
              !isRestMode
                ? 'bg-sky-500 text-slate-950 font-bold shadow-sm shadow-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Insert or edit sounding notes"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Note</span>
          </button>
          <button
            onClick={() => onToggleRestMode(true)}
            aria-label="Silence / Rest mode"
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1 transition-all ${
              isRestMode
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Insert silence / rest"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span>Rest (Silence)</span>
          </button>
        </div>

        {/* Duration Value Selector (𝅝, 𝅗𝅥, ♩, ♪) */}
        <div className="flex items-center bg-[#0a0d14] p-0.5 rounded-xl border border-[#1e2638]">
          {durationOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onSelectDuration(opt.value);
                if (selectedNote) {
                  onModifySelectedNote({ duration: opt.value });
                }
              }}
              aria-label={`Select ${opt.label} note (${opt.beats})`}
              className={`px-2 py-1 text-xs font-mono font-medium rounded-lg flex items-center gap-1 transition-all ${
                selectedDuration === opt.value
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={`${opt.label} note (${opt.value} beats)`}
            >
              <span className="text-sm leading-none">{opt.symbol}</span>
              <span className="text-[10px]">{opt.beats}</span>
            </button>
          ))}
        </div>

        {/* Step Pitches Strip & Octave Control */}
        {!isRestMode && (
          <div className="hidden md:flex items-center gap-1 bg-[#0a0d14] px-2 py-1 rounded-xl border border-[#1e2638]">
            {/* Octave - / + */}
            <div className="flex items-center gap-1 pr-1 border-r border-[#1e2638]">
              <button
                onClick={() => handleOctaveChange(-1)}
                className="w-5 h-5 rounded bg-[#181d2a] hover:bg-[#232b3d] text-slate-300 text-xs flex items-center justify-center font-bold"
                title="Octave down"
              >
                -
              </button>
              <span className="text-[10px] font-mono text-amber-300 font-bold px-0.5">
                O{selectedOctave}
              </span>
              <button
                onClick={() => handleOctaveChange(1)}
                className="w-5 h-5 rounded bg-[#181d2a] hover:bg-[#232b3d] text-slate-300 text-xs flex items-center justify-center font-bold"
                title="Octave up"
              >
                +
              </button>
            </div>

            {/* Pitch names C through B */}
            <div className="flex items-center gap-0.5">
              {pitchNotes.map((p) => {
                const isSelected = selectedPitchName === p;
                const isAccidental = p.includes('#');
                return (
                  <button
                    key={p}
                    onClick={() => handlePitchClick(p)}
                    className={`h-6 px-1.5 rounded text-[11px] font-mono font-semibold transition-all ${
                      isSelected
                        ? 'bg-sky-400 text-slate-950 font-bold shadow-sm'
                        : isAccidental
                        ? 'bg-[#141824] text-slate-400 hover:text-slate-200'
                        : 'bg-[#1b2130] text-slate-200 hover:bg-[#273046]'
                    }`}
                    title={`Pitch ${p}${selectedOctave}`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Insert at Playhead Button */}
        <button
          onClick={() => onInsertAtPlayhead(currentStepMidi)}
          aria-label={`Insert at beat ${currentBeat.toFixed(1)}`}
          className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer"
          title={`Insert ${isRestMode ? 'rest' : selectedPitchName + selectedOctave} at playhead (Beat ${currentBeat.toFixed(1)})`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Insert @ {currentBeat.toFixed(1)}b</span>
        </button>
      </div>

      {/* 3. Selected Note Inspector / Modifier controls */}
      {selectedNote ? (
        <div className="flex items-center gap-1.5 bg-[#171d2b] px-2.5 py-1 rounded-xl border border-sky-500/40 animate-in fade-in">
          <span className="text-[10px] font-mono text-sky-300 font-semibold">
            Selected: {selectedNote.note.isRest ? 'REST' : `${selectedNote.note.pitchName}${selectedNote.note.octave}`} ({selectedNote.note.duration}b)
          </span>

          {/* Pitch Up / Down Semitone */}
          {!selectedNote.note.isRest && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => {
                  const newMidi = selectedNote.note.midi - 1;
                  const { name, octave } = midiToNoteName(newMidi);
                  onModifySelectedNote({ midi: newMidi, pitchName: name, octave });
                  onPreviewPitch(newMidi);
                }}
                className="w-5 h-5 rounded bg-[#202738] hover:bg-[#2a344c] text-slate-300 flex items-center justify-center"
                title="Shift pitch down 1 semitone"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  const newMidi = selectedNote.note.midi + 1;
                  const { name, octave } = midiToNoteName(newMidi);
                  onModifySelectedNote({ midi: newMidi, pitchName: name, octave });
                  onPreviewPitch(newMidi);
                }}
                className="w-5 h-5 rounded bg-[#202738] hover:bg-[#2a344c] text-slate-300 flex items-center justify-center"
                title="Shift pitch up 1 semitone"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Toggle Note / Silence */}
          <button
            onClick={() => {
              onModifySelectedNote({ isRest: !selectedNote.note.isRest });
            }}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#202738] hover:bg-[#2a344c] text-amber-300 transition-colors"
            title="Convert between sounding note and silent rest"
          >
            {selectedNote.note.isRest ? 'Make Note' : 'Make Silence'}
          </button>

          {/* Delete Button */}
          <button
            onClick={onDeleteSelectedNote}
            aria-label="Delete selected note"
            className="w-6 h-6 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 flex items-center justify-center transition-colors"
            title="Delete Note (Delete / Backspace)"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="text-[10px] font-mono text-slate-400 hidden xl:block">
          Click row grid to insert · Click note to select · Double-click to delete
        </div>
      )}
    </div>
  );
};
