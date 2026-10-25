import React from 'react';
import { Play, Pause, Square, Repeat, Volume2, Music, Sparkles, RotateCcw } from 'lucide-react';
import { SoundEngineType } from '../types/music.ts';

interface TransportBarProps {
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  tempo: number;
  onTempoChange: (bpm: number) => void;
  currentBeat: number;
  totalBeats: number;
  soundEngine: SoundEngineType;
  onSoundEngineChange: (engine: SoundEngineType) => void;
  onLoadPreset: (index: number) => void;
  onClear: () => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  isPlaying,
  onPlay,
  onPause,
  onStop,
  isLooping,
  onToggleLoop,
  tempo,
  onTempoChange,
  currentBeat,
  totalBeats,
  soundEngine,
  onSoundEngineChange,
  onLoadPreset,
  onClear,
}) => {
  // Format beat timecode e.g. Measure:Beat (1.1, 1.2, 2.1 ...)
  const measure = Math.floor(currentBeat / 4) + 1;
  const beatInMeasure = (Math.floor(currentBeat) % 4) + 1;
  const formattedTimecode = `${measure.toString().padStart(2, '0')}:${beatInMeasure.toString().padStart(2, '0')}`;

  return (
    <header className="bg-[#121721] border-b border-[#212a3b] px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-slate-200 select-none">
      {/* Brand & Wordmark */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20 text-white font-bold text-base">
          ♫
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            Contrapuntal
            <span className="text-[10px] font-mono font-normal uppercase text-sky-400 bg-sky-950/60 border border-sky-800/60 px-1.5 py-0.2 rounded">
              DAW
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Bach & Modern Counterpoint Assistant
          </p>
        </div>
      </div>

      {/* Main Transport Controls */}
      <div className="flex items-center gap-1 sm:gap-2 bg-[#0a0d14] p-1 rounded-xl border border-[#1e2638]">
        {/* Play/Pause */}
        {isPlaying ? (
          <button
            onClick={onPause}
            aria-label="Pause playback"
            className="w-10 h-10 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 flex items-center justify-center transition-all active:scale-95"
            title="Pause (Space)"
          >
            <Pause className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            onClick={onPlay}
            aria-label="Start playback"
            className="w-10 h-10 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 flex items-center justify-center transition-all active:scale-95"
            title="Play (Space)"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </button>
        )}

        {/* Stop */}
        <button
          onClick={onStop}
          aria-label="Stop playback"
          className="w-10 h-10 rounded-lg bg-slate-800/60 hover:bg-slate-750 text-slate-300 flex items-center justify-center transition-all active:scale-95"
          title="Stop"
        >
          <Square className="w-4 h-4 fill-current" />
        </button>

        {/* Loop */}
        <button
          onClick={onToggleLoop}
          aria-label="Toggle loop"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all active:scale-95 ${
            isLooping
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
              : 'bg-transparent text-slate-400 hover:text-slate-200'
          }`}
          title="Loop"
        >
          <Repeat className="w-4 h-4" />
        </button>

        {/* Timecode / Beat Display */}
        <div className="px-3 py-1 font-mono text-center min-w-[70px] border-l border-[#1e2638]">
          <span className="text-xs font-semibold text-sky-400 tabular-nums">
            {formattedTimecode}
          </span>
          <span className="block text-[9px] uppercase tracking-wider text-slate-500">
            Bar:Beat
          </span>
        </div>
      </div>

      {/* Tempo & Sound Engine Selector */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Tempo BPM */}
        <div className="flex items-center gap-2 bg-[#0a0d14] px-2.5 py-1.5 rounded-xl border border-[#1e2638]">
          <span className="text-[10px] font-mono uppercase text-slate-400">BPM</span>
          <input
            type="number"
            min={40}
            max={220}
            value={tempo}
            onChange={(e) => onTempoChange(Math.max(40, Math.min(220, Number(e.target.value) || 100)))}
            aria-label="Tempo in beats per minute"
            className="w-12 bg-transparent text-right font-mono text-xs font-bold text-white focus:outline-none"
          />
          <input
            type="range"
            min={40}
            max={200}
            value={tempo}
            onChange={(e) => onTempoChange(Number(e.target.value))}
            aria-label="Adjust tempo"
            className="w-16 h-1 accent-sky-400 bg-slate-700 rounded-lg cursor-pointer hidden md:block"
          />
        </div>

        {/* Sound Sample Group Toggle: Piano vs Strings */}
        <div className="flex items-center bg-[#0a0d14] p-1 rounded-xl border border-[#1e2638]">
          <button
            onClick={() => onSoundEngineChange('piano')}
            title="Acoustic Concert Grand Piano (Salamander CC-BY Samples)"
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
              soundEngine === 'piano'
                ? 'bg-sky-500 text-slate-950 font-semibold shadow-sm shadow-sky-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Grand Piano</span>
          </button>
          <button
            onClick={() => onSoundEngineChange('strings')}
            title="Symphonic String Ensemble (Bowed Multi-Voice)"
            className={`px-2.5 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-all whitespace-nowrap ${
              soundEngine === 'strings'
                ? 'bg-indigo-500 text-white font-semibold shadow-sm shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Strings</span>
          </button>
        </div>

        {/* Canonical Preset Quick Loader */}
        <div className="hidden lg:flex items-center gap-1.5">
          <select
            onChange={(e) => {
              if (e.target.value !== '') {
                onLoadPreset(Number(e.target.value));
                e.target.value = '';
              }
            }}
            defaultValue=""
            aria-label="Load canonical cantus firmus theme"
            className="bg-[#0a0d14] text-xs text-slate-300 border border-[#1e2638] rounded-xl px-2.5 py-2 cursor-pointer focus:outline-none focus:border-sky-500"
          >
            <option value="" disabled>Load Classic Theme...</option>
            <option value="0">Fux Dorian Cantus Firmus</option>
            <option value="1">Bach Chorale "O Sacred Head"</option>
            <option value="2">Neoclassical Pandiatonic</option>
          </select>
        </div>

        {/* Clean Start Button */}
        <button
          onClick={onClear}
          aria-label="Clean Start: Clear all notes and begin fresh"
          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/40 hover:border-rose-400 flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
          title="Clean Start: Clear all tracks and begin fresh (Undoable with Ctrl+Z)"
        >
          <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
          <span>Clean Start</span>
        </button>
      </div>
    </header>
  );
};
