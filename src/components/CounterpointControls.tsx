import React from 'react';
import { Wand2, Music, Sparkles, Sliders, CheckCircle2 } from 'lucide-react';
import { CounterpointConfig, CounterpointStyle, ModeType, SpeciesType } from '../types/music.ts';

interface CounterpointControlsProps {
  config: CounterpointConfig;
  onChangeConfig: (config: CounterpointConfig) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  hasCfNotes: boolean;
}

export const CounterpointControls: React.FC<CounterpointControlsProps> = ({
  config,
  onChangeConfig,
  onGenerate,
  isGenerating,
  hasCfNotes,
}) => {
  const keys = ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'];
  const modes: { id: ModeType; label: string }[] = [
    { id: 'major', label: 'Major (Ionian)' },
    { id: 'minor', label: 'Minor (Aeolian)' },
    { id: 'dorian', label: 'Dorian (Church Modal)' },
    { id: 'phrygian', label: 'Phrygian' },
    { id: 'lydian', label: 'Lydian' },
    { id: 'mixolydian', label: 'Mixolydian' },
  ];

  return (
    <div className="bg-[#111622] rounded-2xl border border-[#212a3b] p-3 sm:p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1c2434]">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-bold text-white tracking-tight">
            Counterpoint Engine
          </h2>
        </div>
        <span className="text-[10px] font-mono uppercase text-slate-400">
          Rule-Based AI
        </span>
      </div>

      {/* Style Selector: Bach Classical vs Modern Pandiatonic */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          Contrapuntal Style
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onChangeConfig({ ...config, style: 'bach' })}
            aria-label="Select Bach Classical Counterpoint Style"
            className={`min-h-[46px] p-2 rounded-xl text-left border transition-all active:scale-95 ${
              config.style === 'bach'
                ? 'bg-sky-500/15 border-sky-500/60 text-white ring-1 ring-sky-400/40'
                : 'bg-[#0d121c] border-[#1e2638] text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-xs font-bold flex items-center justify-between">
              <span>Bach Classical</span>
              {config.style === 'bach' && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
              Strict consonance downbeats, no parallel 5ths/8ves
            </div>
          </button>

          <button
            onClick={() => onChangeConfig({ ...config, style: 'modern' })}
            aria-label="Select Modern Pandiatonic Counterpoint Style"
            className={`min-h-[46px] p-2 rounded-xl text-left border transition-all active:scale-95 ${
              config.style === 'modern'
                ? 'bg-indigo-500/15 border-indigo-500/60 text-white ring-1 ring-indigo-400/40'
                : 'bg-[#0d121c] border-[#1e2638] text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="text-xs font-bold flex items-center justify-between">
              <span>Modern Pandiatonic</span>
              {config.style === 'modern' && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
              Modal verticalities, relaxed 2nds/7ths/9ths
            </div>
          </button>
        </div>
      </div>

      {/* Voice Texture & Parts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Voice Count */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Voice Polyphony
          </label>
          <div className="grid grid-cols-3 gap-1 bg-[#090d14] p-1 rounded-xl border border-[#1e2638]">
            {[
              { count: 2 as const, label: '2 Voices' },
              { count: 3 as const, label: '3 Voices' },
              { count: 4 as const, label: '4 (SATB)' },
            ].map((v) => (
              <button
                key={v.count}
                onClick={() => onChangeConfig({ ...config, voiceCount: v.count, species: v.count === 4 ? 'chorale' : config.species })}
                className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                  config.voiceCount === v.count
                    ? 'bg-sky-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cantus Firmus Position */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Cantus Firmus Voice
          </label>
          <select
            value={config.cfPosition}
            onChange={(e) => onChangeConfig({ ...config, cfPosition: e.target.value as any })}
            aria-label="Cantus Firmus voice position"
            className="w-full bg-[#090d14] text-xs font-semibold text-white border border-[#1e2638] rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500"
          >
            <option value="tenor">Tenor (Middle Vocal Line)</option>
            <option value="soprano">Soprano (Top Vocal Line)</option>
            <option value="bass">Bass (Foundation Line)</option>
          </select>
        </div>
      </div>

      {/* Key & Mode */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Tonal Key
          </label>
          <select
            value={config.key}
            onChange={(e) => onChangeConfig({ ...config, key: e.target.value })}
            aria-label="Tonal key signature"
            className="w-full bg-[#090d14] text-xs font-semibold text-white border border-[#1e2638] rounded-xl px-2.5 py-2 focus:outline-none focus:border-sky-500"
          >
            {keys.map((k) => (
              <option key={k} value={k}>
                {k} Key
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Scale Mode
          </label>
          <select
            value={config.mode}
            onChange={(e) => onChangeConfig({ ...config, mode: e.target.value as ModeType })}
            aria-label="Scale modal system"
            className="w-full bg-[#090d14] text-xs font-semibold text-white border border-[#1e2638] rounded-xl px-2.5 py-2 focus:outline-none focus:border-sky-500"
          >
            {modes.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Action Button: Generate */}
      <button
        onClick={onGenerate}
        disabled={!hasCfNotes || isGenerating}
        aria-label="Generate counterpoint lines"
        className={`w-full min-h-[48px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
          !hasCfNotes
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
            : isGenerating
            ? 'bg-sky-600 text-white animate-pulse'
            : 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:brightness-110 shadow-sky-500/25 ring-1 ring-sky-300/40'
        }`}
      >
        <Sparkles className="w-4 h-4" />
        <span>
          {isGenerating
            ? 'Calculating Optimal Voice Leading...'
            : !hasCfNotes
            ? 'Add Melody Notes to Generate'
            : `Generate ${config.style === 'bach' ? 'Bach' : 'Modern'} Counterpoint`}
        </span>
      </button>

      {/* Rules Explainer Summary */}
      <div className="bg-[#0a0d14] p-3 rounded-xl border border-[#1a2333] text-[11px] text-slate-400 space-y-1">
        <div className="font-semibold text-slate-300 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          Active Algorithmic Rules:
        </div>
        {config.style === 'bach' ? (
          <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
            <li>Strict consonance downbeats (Unisons, 3rds, 5ths, 6ths, 8ves)</li>
            <li>Parallel 5ths & parallel octaves prohibited (-∞ penalty)</li>
            <li>Direct / hidden fifths penalized with contrary motion bonus</li>
            <li>Leading tone step-up cadence resolution</li>
          </ul>
        ) : (
          <ul className="list-disc list-inside space-y-0.5 text-slate-400 pl-1">
            <li>Diatonic pandiatonic verticalities (2nds, 4ths, 7ths, 9ths permitted)</li>
            <li>Relaxed dissonance handling with horizontal melodic flow</li>
            <li>Linear vocal independence with open spacing</li>
            <li>Low Interval Limit enforced to prevent low muddiness</li>
          </ul>
        )}
      </div>
    </div>
  );
};
