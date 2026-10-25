import React from 'react';
import { VoiceTrack } from '../types/music.ts';
import { ChannelStrip } from './ChannelStrip.tsx';
import { Sliders, Volume2, RotateCcw } from 'lucide-react';

interface MixerConsoleProps {
  tracks: VoiceTrack[];
  masterVolume: number;
  isMasterMuted: boolean;
  onVolumeChange: (trackId: string, volume: number) => void;
  onPanChange: (trackId: string, pan: number) => void;
  onToggleMute: (trackId: string) => void;
  onToggleSolo: (trackId: string) => void;
  onMasterVolumeChange: (volume: number) => void;
  onToggleMasterMute: () => void;
  onResetAllMuteSolo?: () => void;
  isPlaying?: boolean;
}

export const MixerConsole: React.FC<MixerConsoleProps> = ({
  tracks,
  masterVolume,
  isMasterMuted,
  onVolumeChange,
  onPanChange,
  onToggleMute,
  onToggleSolo,
  onMasterVolumeChange,
  onToggleMasterMute,
  onResetAllMuteSolo,
  isPlaying = false,
}) => {
  const hasAnySolo = tracks.some((t) => t.solo);
  const hasAnyMute = tracks.some((t) => t.muted);

  return (
    <section className="bg-[#101218] border-t-2 border-[#202432] flex flex-col shadow-2xl">
      {/* Mixer Console Toolbar */}
      <div className="h-9 px-4 bg-[#14161f] border-b border-[#222634] flex items-center justify-between gap-3 text-slate-300">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Console Mixer
          </span>
          <span className="text-[10px] font-mono bg-[#1c202d] text-slate-400 px-2 py-0.5 rounded border border-[#2d3348]">
            {tracks.length} Channels • Stereo Bus
          </span>
        </div>

        <div className="flex items-center gap-2">
          {(hasAnySolo || hasAnyMute) && onResetAllMuteSolo && (
            <button
              onClick={onResetAllMuteSolo}
              aria-label="Clear all mute and solo"
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#202433] hover:bg-[#2b3145] text-amber-300 flex items-center gap-1 transition-colors border border-[#343b52]"
              title="Clear all Mutes & Solos"
            >
              <RotateCcw className="w-3 h-3" />
              Reset M/S
            </button>
          )}

          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
            <Volume2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Output:</span>
            <span className="text-emerald-400 font-semibold">44.1 kHz 24-bit</span>
          </div>
        </div>
      </div>

      {/* Rack of Channel Strips */}
      <div className="flex items-stretch overflow-x-auto bg-[#0d0f14] custom-scrollbar scroll-smooth">
        {/* Track Channel Strips */}
        {tracks.map((track) => (
          <ChannelStrip
            key={track.id}
            track={track}
            isMaster={false}
            onVolumeChange={onVolumeChange}
            onPanChange={onPanChange}
            onToggleMute={onToggleMute}
            onToggleSolo={onToggleSolo}
            isPlaying={isPlaying}
          />
        ))}

        {/* Master Output Channel Strip (Pinned on Right) */}
        <ChannelStrip
          isMaster={true}
          masterVolume={masterVolume}
          isMasterMuted={isMasterMuted}
          onMasterVolumeChange={onMasterVolumeChange}
          onToggleMasterMute={onToggleMasterMute}
          isPlaying={isPlaying}
        />
      </div>
    </section>
  );
};
