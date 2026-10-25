import React from 'react';
import { CounterpointConfig, CounterpointStyle, MelodyAnalysis, SpeciesType, VoiceRole } from '../types/music.ts';
import { Sparkles, Wand2, Plus, Music2, BookOpen, Sliders, Layers, RotateCcw, Piano } from 'lucide-react';

interface DawControlRibbonProps {
  config: CounterpointConfig;
  onChangeConfig: (newConfig: CounterpointConfig) => void;
  onGenerate: () => void;
  onAnalyzeAndGenerate: () => void;
  onAddVoiceLine: (role: VoiceRole) => void;
  onClearGenerated: () => void;
  isGenerating: boolean;
  hasCfNotes: boolean;
  melodyAnalysis: MelodyAnalysis;
  activeTrackCount: number;
  showStaffEditor: boolean;
  onToggleStaffEditor: () => void;
  showTheoryInspector: boolean;
  onToggleTheoryInspector: () => void;
  showVirtualKeyboard?: boolean;
  onToggleVirtualKeyboard?: () => void;
  onCleanStart?: () => void;
}

export const DawControlRibbon: React.FC<DawControlRibbonProps> = ({
  config,
  onChangeConfig,
  onGenerate,
  onAnalyzeAndGenerate,
  onAddVoiceLine,
  onClearGenerated,
  onCleanStart,
  isGenerating,
  hasCfNotes,
  melodyAnalysis,
  activeTrackCount,
  showStaffEditor,
  onToggleStaffEditor,
  showTheoryInspector,
  onToggleTheoryInspector,
  showVirtualKeyboard,
  onToggleVirtualKeyboard,
}) => {
  const speciesList: { id: SpeciesType; label: string; desc: string }[] = [
    { id: 'first', label: '1st Sp (1:1)', desc: 'Note against note' },
    { id: 'second', label: '2nd Sp (2:1)', desc: 'Two notes per CF note with passing tones' },
    { id: 'third', label: '3rd Sp (4:1)', desc: 'Four quarter notes per CF note' },
    { id: 'fourth', label: '4th Sp (Susp)', desc: 'Prepared suspensions & syncopation (7-6, 4-3)' },
    { id: 'chorale', label: 'SATB Chorale', desc: 'Full 4-part Bach harmonization' },
  ];

  const keys = ['C', 'G', 'D', 'A', 'E', 'B', 'F', 'Bb', 'Eb', 'Ab'];
  const modes = [
    { id: 'major', label: 'Major (Ionian)' },
    { id: 'minor', label: 'Natural Minor' },
    { id: 'dorian', label: 'Dorian' },
    { id: 'mixolydian', label: 'Mixolydian' },
    { id: 'phrygian', label: 'Phrygian' },
    { id: 'lydian', label: 'Lydian' },
  ];

  return (
    <div className="bg-[#12151f] border-b border-[#212738] px-3 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-slate-200 select-none shadow-md">
      {/* Left: 1-Click Generate Action & Species / Style Selectors */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Main Generate Button */}
        <button
          onClick={onGenerate}
          disabled={!hasCfNotes || isGenerating}
          aria-label="Generate contrapuntal voice lines"
          className={`px-3 sm:px-4 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
            hasCfNotes
              ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-500/25 ring-1 ring-sky-400/50 cursor-pointer'
              : 'bg-[#181d2a] text-slate-500 border border-[#242c3f] cursor-not-allowed'
          }`}
          title={hasCfNotes ? 'Generate counterpoint for all voices' : 'Add Cantus Firmus notes first to generate counterpoint'}
        >
          <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Computing...' : 'Generate Counterpoint'}</span>
        </button>

        {/* Species Selector */}
        <div className="flex items-center gap-1 bg-[#0a0d14] px-2 py-1 rounded-xl border border-[#1e2638]">
          <span className="text-[10px] font-mono uppercase text-slate-400 hidden sm:inline">Species:</span>
          <select
            value={config.species}
            onChange={(e) => onChangeConfig({ ...config, species: e.target.value as SpeciesType })}
            aria-label="Select Counterpoint Species"
            className="bg-transparent text-xs font-semibold text-sky-400 border-none cursor-pointer focus:outline-none"
          >
            {speciesList.map((s) => (
              <option key={s.id} value={s.id} className="bg-[#12151f] text-slate-200">
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Style: Bach vs Pandiatonic */}
        <div className="flex items-center bg-[#0a0d14] p-0.5 rounded-xl border border-[#1e2638]">
          <button
            onClick={() => onChangeConfig({ ...config, style: 'bach' })}
            aria-label="Bach classical style"
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              config.style === 'bach'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bach
          </button>
          <button
            onClick={() => onChangeConfig({ ...config, style: 'modern' })}
            aria-label="Modern pandiatonic style"
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              config.style === 'modern'
                ? 'bg-purple-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pandiatonic
          </button>
        </div>

        {/* Voice Count: 2, 3, 4, 5 */}
        <div className="flex items-center gap-1 bg-[#0a0d14] px-2 py-1 rounded-xl border border-[#1e2638]">
          <span className="text-[10px] font-mono uppercase text-slate-400 hidden sm:inline">Voices:</span>
          <select
            value={config.voiceCount}
            onChange={(e) => onChangeConfig({ ...config, voiceCount: Number(e.target.value) as 2 | 3 | 4 | 5 })}
            aria-label="Voice Count"
            className="bg-transparent text-xs font-semibold text-emerald-400 border-none cursor-pointer focus:outline-none"
          >
            <option value="2" className="bg-[#12151f] text-slate-200">2 Voices (Duo)</option>
            <option value="3" className="bg-[#12151f] text-slate-200">3 Voices (Trio)</option>
            <option value="4" className="bg-[#12151f] text-slate-200">4 Voices (SATB)</option>
            <option value="5" className="bg-[#12151f] text-slate-200">5 Voices (Full Polyphony)</option>
          </select>
        </div>

        {/* Key & Mode Selector */}
        <div className="hidden lg:flex items-center gap-1.5 bg-[#0a0d14] px-2 py-1 rounded-xl border border-[#1e2638]">
          <select
            value={config.key}
            onChange={(e) => onChangeConfig({ ...config, key: e.target.value })}
            aria-label="Tonal Key"
            className="bg-transparent text-xs font-semibold text-amber-300 border-none cursor-pointer focus:outline-none"
          >
            {keys.map((k) => (
              <option key={k} value={k} className="bg-[#12151f] text-slate-200">
                {k}
              </option>
            ))}
          </select>
          <select
            value={config.mode}
            onChange={(e) => onChangeConfig({ ...config, mode: e.target.value as any })}
            aria-label="Musical Mode"
            className="bg-transparent text-xs font-semibold text-slate-300 border-none cursor-pointer focus:outline-none"
          >
            {modes.map((m) => (
              <option key={m.id} value={m.id} className="bg-[#12151f] text-slate-200">
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Auto Analyze & Harmonize */}
        {hasCfNotes && (
          <button
            onClick={onAnalyzeAndGenerate}
            disabled={isGenerating}
            aria-label="Analyze melody and harmonize"
            className="px-2.5 py-1 rounded-xl text-xs font-mono bg-[#161a26] hover:bg-[#1e2434] text-sky-300 border border-[#2a3449] transition-colors flex items-center gap-1"
            title={`Detected ${melodyAnalysis.detectedKey} ${melodyAnalysis.detectedMode} (${melodyAnalysis.confidence}% confidence)`}
          >
            <Wand2 className="w-3 h-3 text-sky-400" />
            <span className="hidden sm:inline">Auto-Detect:</span>
            <span className="font-bold text-white">{melodyAnalysis.detectedKey} {melodyAnalysis.detectedMode}</span>
          </button>
        )}
      </div>

      {/* Right: Quick Add Voice & View Toggles */}
      <div className="flex items-center gap-2">
        {/* Quick Add Voice dropdown */}
        <div className="flex items-center bg-[#0a0d14] px-2 py-1 rounded-xl border border-[#1e2638]">
          <span className="text-[10px] font-mono uppercase text-slate-400 mr-1 flex items-center gap-0.5">
            <Plus className="w-3 h-3" /> Voice:
          </span>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                onAddVoiceLine(e.target.value as VoiceRole);
                e.target.value = '';
              }
            }}
            aria-label="Add individual voice line"
            className="bg-transparent text-xs text-sky-400 font-semibold cursor-pointer focus:outline-none"
          >
            <option value="" disabled>+ Add Line...</option>
            <option value="soprano" className="bg-[#12151f] text-slate-200">Soprano</option>
            <option value="alto" className="bg-[#12151f] text-slate-200">Alto</option>
            <option value="tenor" className="bg-[#12151f] text-slate-200">Tenor</option>
            <option value="bass" className="bg-[#12151f] text-slate-200">Bass</option>
          </select>
        </div>

        {/* Toggle Virtual Piano Keyboard */}
        {onToggleVirtualKeyboard && (
          <button
            onClick={onToggleVirtualKeyboard}
            aria-label="Toggle Virtual Piano Keyboard"
            className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shadow-sm ${
              showVirtualKeyboard
                ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'bg-[#181d2a] text-slate-300 hover:text-white border-[#273248]'
            }`}
            title="Toggle Virtual Piano Keyboard for melody input into Cantus Firmus"
          >
            <Piano className="w-3.5 h-3.5 text-amber-400" />
            <span>Virtual Keyboard</span>
          </button>
        )}

        {/* Toggle Notation / Piano Roll Staff Editor */}
        <button
          onClick={onToggleStaffEditor}
          aria-label="Toggle Staff Notation Editor"
          className={`px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all border ${
            showStaffEditor
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm'
              : 'bg-[#141824] text-slate-400 hover:text-slate-200 border-[#222838]'
          }`}
          title="Toggle Cantus Firmus Notation & Step Input"
        >
          <Music2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Notation Editor</span>
        </button>

        {/* Toggle Harmonic Theory & Rule Inspector */}
        <button
          onClick={onToggleTheoryInspector}
          aria-label="Toggle Harmonic Rules Inspector"
          className={`px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all border ${
            showTheoryInspector
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
              : 'bg-[#141824] text-slate-400 hover:text-slate-200 border-[#222838]'
          }`}
          title="Toggle Real-Time Harmonic Rule Linting"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Rules & Analysis</span>
        </button>

        {/* Clean Start Button */}
        {onCleanStart && (
          <button
            onClick={onCleanStart}
            aria-label="Clean Start: Clear all notes and begin fresh"
            className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 border border-rose-500/40 hover:border-rose-400 flex items-center gap-1.5 transition-all active:scale-95 shadow-sm cursor-pointer"
            title="Clean Start: Clear all tracks and begin fresh (Undoable with Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span>Clean Start</span>
          </button>
        )}
      </div>
    </div>
  );
};
