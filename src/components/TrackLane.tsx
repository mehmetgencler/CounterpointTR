import React from 'react';
import { VoiceTrack } from '../types/music.ts';
import { Trash2, Play, Square } from 'lucide-react';

interface TrackLaneProps {
  track: VoiceTrack;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onPanChange: (trackId: string, pan: number) => void;
  onDeleteTrack?: (trackId: string) => void;
  onPlayTrack?: (track: VoiceTrack) => void;
  onPreviewPitch?: (midi: number) => void;
  isAuditioning?: boolean;
  totalBeats: number;
  currentBeat: number;
}

export const TrackLane: React.FC<TrackLaneProps> = ({
  track,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
  onPanChange,
  onDeleteTrack,
  onPlayTrack,
  onPreviewPitch,
  isAuditioning = false,
  totalBeats,
  currentBeat,
}) => {
  const beatWidth = 36; // Horizontal pixels per beat in mini piano roll
  const laneWidth = Math.max(600, totalBeats * beatWidth + 40);
  const laneHeight = 52;

  // Find min and max midi to scale note rectangles vertically
  const midis = track.notes.map((n) => n.midi);
  const minMidi = midis.length > 0 ? Math.min(...midis) - 2 : 48;
  const maxMidi = midis.length > 0 ? Math.max(...midis) + 2 : 72;
  const midiRange = Math.max(12, maxMidi - minMidi);

  const playheadX = currentBeat * beatWidth;

  return (
    <div className="flex items-stretch bg-[#111622] rounded-xl border border-[#212a3b] overflow-hidden shadow-sm transition-all hover:border-[#2f3c55]">
      {/* 1. Far Left Mute, Solo and Audition Play Option Buttons ([M] [S] [▶] on left of every track) */}
      <div className="flex items-center gap-1 px-2 bg-[#090d14] border-r border-[#1c2434] shrink-0">
        {/* Audition / Solo Play Button */}
        {onPlayTrack && (
          <button
            onClick={() => onPlayTrack(track)}
            aria-label={isAuditioning ? `Stop auditioning ${track.name}` : `Audition track ${track.name}`}
            className={`w-8 h-8 rounded-lg text-xs font-black transition-all active:scale-95 flex items-center justify-center ${
              isAuditioning
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/40 ring-1 ring-emerald-300 animate-pulse'
                : 'bg-[#161e2e] hover:bg-[#223048] text-emerald-400 border border-[#25324a]'
            }`}
            title={isAuditioning ? 'Stop Auditioning' : 'Audition / Play This Line Solo'}
          >
            {isAuditioning ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>
        )}

        {/* Mute [M] Button */}
        <button
          onClick={() => onToggleMute(track.id)}
          aria-label={`Mute track ${track.name}`}
          className={`w-8 h-8 rounded-lg text-xs font-black font-mono transition-all active:scale-95 flex items-center justify-center ${
            track.muted
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/40 ring-1 ring-rose-300'
              : 'bg-[#161e2e] hover:bg-[#202b40] text-slate-300 border border-[#25324a]'
          }`}
          title="Mute Track (M)"
        >
          M
        </button>

        {/* Solo [S] Button */}
        <button
          onClick={() => onToggleSolo(track.id)}
          aria-label={`Solo track ${track.name}`}
          className={`w-8 h-8 rounded-lg text-xs font-black font-mono transition-all active:scale-95 flex items-center justify-center ${
            track.solo
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/40 ring-1 ring-amber-200'
              : 'bg-[#161e2e] hover:bg-[#202b40] text-slate-300 border border-[#25324a]'
          }`}
          title="Solo Track (S)"
        >
          S
        </button>
      </div>

      {/* 2. Track Header & Faders */}
      <div className="w-48 sm:w-56 p-2 bg-[#0d121c] border-r border-[#1c2434] flex flex-col justify-between shrink-0">
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <div className="flex items-center gap-1.5 truncate">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: track.color }}
            />
            <span className="text-xs font-bold text-slate-100 truncate" title={track.name}>
              {track.name}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] uppercase font-mono text-slate-400 bg-slate-800/80 px-1 py-0.2 rounded">
              {track.clef}
            </span>
            {/* Delete row button (only for generated lines) */}
            {!track.isCantusFirmus && onDeleteTrack && (
              <button
                onClick={() => onDeleteTrack(track.id)}
                aria-label={`Remove track ${track.name}`}
                className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Remove this track row"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Volume & Pan sliders */}
        <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-400 font-mono">
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <span>VOL</span>
              <span className="text-slate-300 font-bold">{Math.round(track.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={track.volume}
              onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
              aria-label={`Volume for ${track.name}`}
              className="w-full h-1 accent-sky-400 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-0.5">
              <span>PAN</span>
              <span className="text-slate-300 font-bold">
                {track.pan === 0 ? 'C' : track.pan > 0 ? `R${Math.round(track.pan * 50)}` : `L${Math.round(-track.pan * 50)}`}
              </span>
            </div>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.1}
              value={track.pan}
              onChange={(e) => onPanChange(track.id, parseFloat(e.target.value))}
              aria-label={`Pan for ${track.name}`}
              className="w-full h-1 accent-indigo-400 bg-slate-800 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 3. Mini Piano Roll / Timeline Lane */}
      <div className="flex-1 overflow-x-auto relative bg-[#0a0d14] flex items-center select-none">
        <svg width={laneWidth} height={laneHeight} className="block">
          {/* Measure grid vertical lines */}
          {Array.from({ length: Math.ceil(totalBeats / 4) + 1 }).map((_, m) => (
            <line
              key={`grid-${m}`}
              x1={m * 4 * beatWidth}
              y1={0}
              x2={m * 4 * beatWidth}
              y2={laneHeight}
              stroke="#1b2333"
              strokeWidth={1}
            />
          ))}

          {/* Render Notes as Mini Blocks */}
          {track.notes.map((note) => {
            const x = note.beat * beatWidth + 2;
            const width = Math.max(8, note.duration * beatWidth - 4);
            const normY = (maxMidi - note.midi) / midiRange;
            const y = Math.max(6, Math.min(laneHeight - 16, normY * (laneHeight - 16) + 4));

            return (
              <g
                key={`mini-note-${track.id}-${note.id}`}
                className="cursor-pointer transition-opacity hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onPreviewPitch) onPreviewPitch(note.midi);
                }}
              >
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={12}
                  rx={3}
                  fill={track.color}
                  opacity={track.muted ? 0.35 : 0.9}
                  stroke="#0f172a"
                  strokeWidth={0.8}
                />
                <text
                  x={x + 4}
                  y={y + 9}
                  fontSize={8}
                  fill="#0b0e14"
                  fontWeight={700}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {note.pitchName}
                </text>
              </g>
            );
          })}

          {/* Scrubber Playhead */}
          <line
            x1={playheadX}
            y1={0}
            x2={playheadX}
            y2={laneHeight}
            stroke="#38bdf8"
            strokeWidth={1.5}
            style={{ filter: 'drop-shadow(0px 0px 3px rgba(56, 189, 248, 0.7))' }}
          />
        </svg>
      </div>
    </div>
  );
};
