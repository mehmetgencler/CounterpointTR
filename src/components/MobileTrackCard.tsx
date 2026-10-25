import React from 'react';
import { VoiceTrack } from '../types/music.ts';
import { Trash2, Play, Square } from 'lucide-react';

interface MobileTrackCardProps {
  track: VoiceTrack;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onPanChange: (trackId: string, pan: number) => void;
  onDeleteTrack?: (trackId: string) => void;
  onPlayTrack?: (track: VoiceTrack) => void;
  isAuditioning?: boolean;
}

export const MobileTrackCard: React.FC<MobileTrackCardProps> = ({
  track,
  onToggleMute,
  onToggleSolo,
  onVolumeChange,
  onPanChange,
  onDeleteTrack,
  onPlayTrack,
  isAuditioning = false,
}) => {
  return (
    <div className="bg-[#111622] rounded-2xl border border-[#212a3b] p-3 shadow-md mb-2.5 flex items-stretch gap-2.5">
      {/* 1. Dedicated Left Mute & Solo Column ([M] [S] [▶] on left of track) */}
      <div className="flex flex-col gap-1.5 justify-center shrink-0">
        {onPlayTrack && (
          <button
            onClick={() => onPlayTrack(track)}
            aria-label={isAuditioning ? `Stop auditioning ${track.name}` : `Audition track ${track.name}`}
            className={`w-11 h-9 rounded-xl text-xs font-black flex items-center justify-center transition-all active:scale-95 ${
              isAuditioning
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-300 animate-pulse'
                : 'bg-[#182133] hover:bg-[#202c44] text-emerald-400 border border-[#28354f]'
            }`}
            title={isAuditioning ? 'Stop Auditioning' : 'Audition / Play This Line Solo'}
          >
            {isAuditioning ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
        )}

        <button
          onClick={() => onToggleMute(track.id)}
          aria-label={`Mute track ${track.name}`}
          className={`w-11 h-9 rounded-xl font-mono font-black text-sm flex items-center justify-center transition-all active:scale-95 ${
            track.muted
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 ring-2 ring-rose-400'
              : 'bg-[#182133] hover:bg-[#202c44] text-slate-300 border border-[#28354f]'
          }`}
          title="Mute (M)"
        >
          M
        </button>

        <button
          onClick={() => onToggleSolo(track.id)}
          aria-label={`Solo track ${track.name}`}
          className={`w-11 h-9 rounded-xl font-mono font-black text-sm flex items-center justify-center transition-all active:scale-95 ${
            track.solo
              ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/30 ring-2 ring-amber-300'
              : 'bg-[#182133] hover:bg-[#202c44] text-slate-300 border border-[#28354f]'
          }`}
          title="Solo (S)"
        >
          S
        </button>
      </div>

      {/* 2. Track Content & Sliders */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1.5 truncate">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: track.color }}
            />
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
              {track.name}
            </h3>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] font-mono uppercase bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
              {track.voiceRole}
            </span>
            {!track.isCantusFirmus && onDeleteTrack && (
              <button
                onClick={() => onDeleteTrack(track.id)}
                aria-label={`Delete ${track.name}`}
                className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Volume & Pan */}
        <div className="space-y-1.5 bg-[#090d14] p-2 rounded-xl border border-[#1a2333] text-[10px] font-mono">
          <div>
            <div className="flex justify-between items-center text-slate-400 mb-0.5">
              <span>VOL</span>
              <span className="text-white font-bold">{Math.round(track.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={track.volume}
              onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
              aria-label={`Volume for ${track.name}`}
              className="w-full h-1.5 accent-sky-400 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center text-slate-400 mb-0.5">
              <span>PAN</span>
              <span className="text-white font-bold">
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
              className="w-full h-1.5 accent-indigo-400 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
