import React, { useRef, useCallback } from 'react';
import { HarmonicAnalysisStep, NoteEvent, VoiceTrack } from '../types/music.ts';
import { Play, Square, Volume2, Plus, Trash2, X, Sparkles, CheckCircle, AlertTriangle } from 'lucide-react';
import { midiToNoteName, VOICE_RANGES } from '../algorithms/counterpoint.ts';

interface ArrangerTimelineProps {
  tracks: VoiceTrack[];
  currentBeat: number;
  totalBeats: number;
  isPlaying: boolean;
  auditioningTrackId: string | null;
  harmonicAnalysis: HarmonicAnalysisStep[];
  selectedTrackId: string;
  selectedNoteId: string | null;
  onSelectTrack: (trackId: string) => void;
  onSelectNote: (trackId: string, noteId: string | null) => void;
  onInsertNoteAtBeat: (trackId: string, beat: number, midi?: number) => void;
  onDeleteNote: (trackId: string, noteId: string) => void;
  onSeekBeat: (beat: number) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onPanChange: (trackId: string, pan: number) => void;
  onPlaySingleTrack: (track: VoiceTrack) => void;
  onPreviewPitch: (midi: number) => void;
}

export const ArrangerTimeline: React.FC<ArrangerTimelineProps> = ({
  tracks,
  currentBeat,
  totalBeats,
  isPlaying,
  auditioningTrackId,
  harmonicAnalysis,
  selectedTrackId,
  selectedNoteId,
  onSelectTrack,
  onSelectNote,
  onInsertNoteAtBeat,
  onDeleteNote,
  onSeekBeat,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
  onPanChange,
  onPlaySingleTrack,
  onPreviewPitch,
}) => {
  // Beat width in pixels (for timeline scaling)
  const beatWidth = 44;
  const numMeasures = Math.max(4, Math.ceil(totalBeats / 4));
  const timelineWidth = Math.max(750, numMeasures * 4 * beatWidth + 40);

  const rulerRef = useRef<HTMLDivElement>(null);

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickedBeat = Math.max(0, Math.min(totalBeats, clickX / beatWidth));
    onSeekBeat(Math.round(clickedBeat * 2) / 2);
  };

  // Playhead position
  const playheadX = currentBeat * beatWidth;

  // Handle clicking inside a track's lane to insert note or select row
  const handleLaneClick = (track: VoiceTrack, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Calculate beat position snapped to nearest half beat
    const clickedBeat = Math.max(0, Math.floor((clickX / beatWidth) * 2) / 2);

    // Calculate pitch from Y position within voice range (top = max pitch, bottom = min pitch)
    const voiceRange = VOICE_RANGES[track.voiceRole] || { min: 48, max: 72, defaultPitch: 60 };
    const yRatio = 1 - Math.max(0, Math.min(1, clickY / rect.height));
    const calculatedPitch = Math.round(voiceRange.min + yRatio * (voiceRange.max - voiceRange.min));

    onSelectTrack(track.id);
    onInsertNoteAtBeat(track.id, clickedBeat, calculatedPitch);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0d0f15] border-b border-[#1c202d] select-none overflow-hidden">
      {/* 1. Arranger Top Header with Marker Bar */}
      <div className="flex items-stretch bg-[#141620] border-b border-[#212635]">
        {/* Track Headers Corner Label */}
        <div className="w-56 sm:w-64 px-3 py-1.5 bg-[#181b26] border-r border-[#262b3c] flex items-center justify-between shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            Track Rows ({tracks.length})
          </span>
          <span className="text-[10px] font-mono text-sky-400">
            Click row to Edit
          </span>
        </div>

        {/* Measure Ruler with Markers */}
        <div
          ref={rulerRef}
          onClick={handleRulerClick}
          className="flex-1 overflow-x-auto relative h-10 bg-[#12141c] cursor-pointer hover:bg-[#151822] transition-colors"
          style={{ width: `${timelineWidth}px` }}
          title="Click ruler to jump playhead"
        >
          {/* Section Markers */}
          <div className="absolute top-0 left-0 right-0 h-4 bg-[#181c26] border-b border-[#252a3a] flex text-[9px] font-mono font-medium text-slate-400">
            <div className="px-2 border-r border-[#2d3346] text-amber-300 bg-amber-950/30 flex items-center gap-1" style={{ width: `${4 * beatWidth}px` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Theme (Bars 1-2)
            </div>
            <div className="px-2 border-r border-[#2d3346] text-sky-300 bg-sky-950/30 flex items-center gap-1" style={{ width: `${4 * beatWidth}px` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              Counterpoint (Bars 3-4)
            </div>
            {numMeasures > 2 && (
              <div className="px-2 border-r border-[#2d3346] text-emerald-300 bg-emerald-950/30 flex items-center gap-1" style={{ width: `${(numMeasures - 2) * 4 * beatWidth}px` }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Cadence Resolution
              </div>
            )}
          </div>

          {/* Bar numbers and subdivisions */}
          <div className="absolute bottom-0 left-0 right-0 h-6 flex items-center">
            {Array.from({ length: numMeasures }).map((_, mIdx) => (
              <div
                key={mIdx}
                className="relative border-l border-[#3a4256] h-full flex items-center pl-1 text-[10px] font-mono font-bold text-slate-300"
                style={{ width: `${4 * beatWidth}px` }}
              >
                <span>{mIdx + 1}</span>
                {/* 4 beat subdivision ticks */}
                <div className="absolute left-1/4 top-3 bottom-0 w-[1px] bg-[#232938]" />
                <div className="absolute left-2/4 top-2 bottom-0 w-[1px] bg-[#2d3548]" />
                <div className="absolute left-3/4 top-3 bottom-0 w-[1px] bg-[#232938]" />
              </div>
            ))}
          </div>

          {/* Playhead marker indicator on ruler */}
          <div
            className="absolute top-0 bottom-0 w-3 -ml-1.5 pointer-events-none z-30 flex flex-col items-center"
            style={{ left: `${playheadX}px` }}
          >
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-sky-400" />
            <div className="w-[1.5px] flex-1 bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          </div>
        </div>
      </div>

      {/* 2. Track Lanes List (Scrollable Area) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative custom-scrollbar">
        {tracks.map((track, trackIdx) => {
          const isSelectedRow = selectedTrackId === track.id;
          const isAuditioning = auditioningTrackId === track.id;

          // Find track's pitch min/max to position notes vertically inside lane
          const midis = track.notes.filter((n) => !n.isRest).map((n) => n.midi);
          const range = VOICE_RANGES[track.voiceRole] || { min: 48, max: 72 };
          const minMidi = midis.length > 0 ? Math.min(range.min, ...midis) : range.min;
          const maxMidi = midis.length > 0 ? Math.max(range.max, ...midis) : range.max;
          const midiRange = Math.max(12, maxMidi - minMidi);

          return (
            <div
              key={track.id}
              onClick={() => onSelectTrack(track.id)}
              className={`flex items-stretch border-b transition-colors group cursor-pointer ${
                isSelectedRow
                  ? 'bg-[#161a26] border-[#38bdf8]/60 shadow-[inset_0_0_12px_rgba(56,189,248,0.15)]'
                  : 'bg-[#0f1118] border-[#1c202e] hover:bg-[#131620]'
              }`}
            >
              {/* Left Track Header */}
              <div
                className={`w-56 sm:w-64 px-2.5 py-1.5 border-r flex items-center justify-between gap-1.5 shrink-0 relative ${
                  isSelectedRow
                    ? 'bg-[#191e2c] border-[#38bdf8]/50'
                    : 'bg-[#151822] border-[#242a3a]'
                }`}
              >
                {/* Colored track edge indicator */}
                <div
                  className={`absolute left-0 top-0 bottom-0 shadow-sm transition-all ${
                    isSelectedRow ? 'w-1.5 shadow-[0_0_8px_currentColor]' : 'w-1'
                  }`}
                  style={{ backgroundColor: track.color }}
                />

                {/* Left group: Index, Audition, Name */}
                <div className="flex items-center gap-1.5 min-w-0 pl-1">
                  <span
                    className="w-4 h-4 rounded text-[10px] font-mono font-bold flex items-center justify-center text-slate-950 shrink-0"
                    style={{ backgroundColor: track.color }}
                  >
                    {track.trackNumber || trackIdx + 1}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlaySingleTrack(track);
                    }}
                    aria-label={`Audition track ${track.name}`}
                    className={`w-6 h-6 rounded flex items-center justify-center transition-all ${
                      isAuditioning
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/50 animate-pulse'
                        : 'bg-[#1c202d] text-slate-400 hover:text-emerald-400 hover:bg-[#252b3d]'
                    }`}
                    title={isAuditioning ? 'Stop Auditioning' : 'Audition solo line'}
                  >
                    {isAuditioning ? (
                      <Square className="w-3 h-3 fill-current" />
                    ) : (
                      <Play className="w-3 h-3 fill-current ml-0.5" />
                    )}
                  </button>

                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-200 truncate flex items-center gap-1">
                      <span className="truncate">{track.name}</span>
                      {isSelectedRow && (
                        <span className="text-[8px] font-mono font-bold text-sky-400 bg-sky-950 px-1 py-0.2 rounded border border-sky-800/80 shrink-0">
                          EDIT
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] font-mono text-slate-400 uppercase">
                      {track.voiceRole} • {track.clef}
                    </div>
                  </div>
                </div>

                {/* Right group: M, S, mini volume slider */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onToggleMute(track.id)}
                    aria-label={`Mute track ${track.name}`}
                    className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition-all ${
                      track.muted
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'bg-[#1d222f] text-slate-400 hover:text-slate-200 hover:bg-[#272e40]'
                    }`}
                    title="Mute"
                  >
                    M
                  </button>

                  <button
                    onClick={() => onToggleSolo(track.id)}
                    aria-label={`Solo track ${track.name}`}
                    className={`w-5 h-5 rounded text-[10px] font-mono font-bold transition-all ${
                      track.solo
                        ? 'bg-yellow-400 text-slate-950 shadow-sm'
                        : 'bg-[#1d222f] text-slate-400 hover:text-slate-200 hover:bg-[#272e40]'
                    }`}
                    title="Solo"
                  >
                    S
                  </button>

                  {/* Mini volume slider */}
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={track.volume}
                    onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
                    aria-label={`Volume for ${track.name}`}
                    className="w-12 h-1 accent-sky-400 bg-slate-700 rounded cursor-pointer"
                    title={`Volume: ${(track.volume * 100).toFixed(0)}%`}
                  />
                </div>
              </div>

              {/* Right Arranger Lane with Interactive Note Blocks & Grid */}
              <div
                onClick={(e) => handleLaneClick(track, e)}
                className="flex-1 overflow-x-auto relative h-16 bg-[#0c0e14] flex items-center px-1 cursor-crosshair"
                style={{ width: `${timelineWidth}px` }}
                title={`Click anywhere in this row to insert note at beat. Track: ${track.name}`}
              >
                {/* Measure grid background lines */}
                {Array.from({ length: numMeasures * 4 }).map((_, bIdx) => (
                  <div
                    key={bIdx}
                    className={`absolute top-0 bottom-0 w-[1px] pointer-events-none ${
                      bIdx % 4 === 0 ? 'bg-[#23293a]' : 'bg-[#141822]'
                    }`}
                    style={{ left: `${bIdx * beatWidth}px` }}
                  />
                ))}

                {/* Render Notes / Rests inside this track row */}
                {track.notes.map((note) => {
                  const isNoteSelected = selectedNoteId === note.id && isSelectedRow;
                  const noteLeft = note.beat * beatWidth;
                  const noteWidth = Math.max(14, note.duration * beatWidth - 3);

                  // Pitch height (silence / rests sit in middle)
                  const pitchRatio = note.isRest ? 0.45 : (note.midi - minMidi) / midiRange;
                  const noteBottom = Math.max(4, Math.min(32, pitchRatio * 32));

                  return (
                    <div
                      key={note.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTrack(track.id);
                        onSelectNote(track.id, note.id);
                        if (!note.isRest) {
                          onPreviewPitch(note.midi);
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onDeleteNote(track.id, note.id);
                      }}
                      className={`absolute h-6 rounded-[4px] border shadow-sm flex items-center justify-between px-1 cursor-pointer transition-all ${
                        note.isRest
                          ? 'border-dashed border-amber-400/80 bg-amber-950/40 text-amber-300'
                          : isNoteSelected
                          ? 'ring-2 ring-white shadow-[0_0_12px_rgba(255,255,255,0.9)] z-20 scale-105'
                          : 'hover:brightness-125 z-10'
                      }`}
                      style={{
                        left: `${noteLeft}px`,
                        width: `${noteWidth}px`,
                        bottom: `${noteBottom}px`,
                        backgroundColor: note.isRest ? undefined : track.color,
                        borderColor: isNoteSelected ? '#ffffff' : '#ffffff55',
                      }}
                      title={
                        note.isRest
                          ? `Rest (${note.duration} beats) at Beat ${note.beat}. Click to select, double-click to delete.`
                          : `${note.pitchName}${note.octave} (${note.duration} beats) at Beat ${note.beat}. Click to select, double-click to delete.`
                      }
                    >
                      <span className="text-[9px] font-mono font-black text-slate-950 truncate drop-shadow-sm">
                        {note.isRest ? '𝄽 Rest' : `${note.pitchName}${note.octave}`}
                      </span>

                      {/* Quick Delete '×' icon when selected */}
                      {isNoteSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNote(track.id, note.id);
                          }}
                          className="w-3.5 h-3.5 rounded-full bg-slate-950/80 text-white hover:bg-rose-600 flex items-center justify-center text-[10px] ml-0.5 shrink-0"
                          title="Delete note"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* If row is empty, show helpful instruction */}
                {track.notes.length === 0 && (
                  <div className="absolute left-6 text-xs text-slate-500 font-mono pointer-events-none">
                    + Click grid to insert first note or rest
                  </div>
                )}

                {/* Vertical Playhead Cursor Line passing through this lane */}
                <div
                  className="absolute top-0 bottom-0 w-[1.5px] bg-sky-400 pointer-events-none z-30 shadow-[0_0_8px_rgba(56,189,248,0.8)]"
                  style={{ left: `${playheadX}px` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
