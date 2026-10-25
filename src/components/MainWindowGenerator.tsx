import React, { useState } from 'react';
import { CounterpointConfig, CounterpointStyle, MelodyAnalysis, VoiceRole, VoiceTrack } from '../types/music.ts';
import { Plus, Sparkles, Layers, Wand2, Music4, Trash2, Play, Square, Volume2 } from 'lucide-react';

interface MainWindowGeneratorProps {
  config: CounterpointConfig;
  onChangeConfig: (config: CounterpointConfig) => void;
  onAddCounterpointRow: (role: VoiceRole, style: CounterpointStyle) => void;
  onAddSatbArrangement: () => void;
  onClearGeneratedRows: () => void;
  isGenerating: boolean;
  hasCfNotes: boolean;
  melodyAnalysis: MelodyAnalysis;
  generatedTrackCount: number;
  tracks?: VoiceTrack[];
  onToggleMute?: (trackId: string) => void;
  onToggleSolo?: (trackId: string) => void;
  onPlayTrack?: (track: VoiceTrack) => void;
  onPreviewPitch?: (midi: number) => void;
  onDeleteTrack?: (trackId: string) => void;
  auditioningTrackId?: string | null;
}

export const MainWindowGenerator: React.FC<MainWindowGeneratorProps> = ({
  config,
  onChangeConfig,
  onAddCounterpointRow,
  onAddSatbArrangement,
  onClearGeneratedRows,
  isGenerating,
  hasCfNotes,
  melodyAnalysis,
  generatedTrackCount,
  tracks = [],
  onToggleMute,
  onToggleSolo,
  onPlayTrack,
  onPreviewPitch,
  onDeleteTrack,
  auditioningTrackId = null,
}) => {
  const [selectedRole, setSelectedRole] = useState<VoiceRole>('soprano');
  const generatedTracks = tracks.filter((t) => !t.isCantusFirmus);

  const voiceRoles: { role: VoiceRole; label: string; range: string; color: string }[] = [
    { role: 'soprano', label: 'Soprano', range: 'C4–G5', color: '#38BDF8' },
    { role: 'alto', label: 'Alto', range: 'G3–C5', color: '#A78BFA' },
    { role: 'tenor', label: 'Tenor', range: 'C3–G4', color: '#F472B6' },
    { role: 'bass', label: 'Bass', range: 'E2–C4', color: '#34D399' },
  ];

  return (
    <div className="bg-[#0e131d] rounded-2xl border border-sky-500/30 p-3 sm:p-4 shadow-xl space-y-3 relative overflow-hidden">
      {/* Background soft ambient highlight */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1c2536]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
            <Wand2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              Counterpoint Generation
              <span className="text-[10px] font-mono font-normal text-sky-400 bg-sky-950/70 border border-sky-800/60 px-1.5 py-0.2 rounded">
                Main Console
              </span>
            </h2>
          </div>
        </div>

        {/* Melody Analysis Indicator Tag */}
        {hasCfNotes && (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 bg-[#090d14] px-2.5 py-1 rounded-xl border border-[#1d273a]">
            <span className="text-slate-400">Analysis:</span>
            <span className="text-sky-300 font-bold">
              {melodyAnalysis.detectedKey} {melodyAnalysis.detectedMode.charAt(0).toUpperCase() + melodyAnalysis.detectedMode.slice(1)}
            </span>
            <span className="text-[10px] text-slate-500">({melodyAnalysis.confidence}%)</span>
          </div>
        )}
      </div>

      {/* Controls Row: Contrapuntal Style + Voice Role Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Style Selector: Bach vs Modern */}
        <div className="sm:col-span-5 flex items-center bg-[#090d14] p-1 rounded-xl border border-[#1d273a]">
          <button
            onClick={() => onChangeConfig({ ...config, style: 'bach' })}
            aria-label="Select Bach Classical Style"
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
              config.style === 'bach'
                ? 'bg-sky-500 text-slate-950 shadow-sm shadow-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bach Classical
          </button>
          <button
            onClick={() => onChangeConfig({ ...config, style: 'modern' })}
            aria-label="Select Modern Pandiatonic Style"
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
              config.style === 'modern'
                ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Modern Pandiatonic
          </button>
        </div>

        {/* Voice Role Selection for the new row */}
        <div className="sm:col-span-7 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">Add Voice:</span>
          <div className="flex-1 grid grid-cols-4 gap-1 bg-[#090d14] p-1 rounded-xl border border-[#1d273a]">
            {voiceRoles.map((v) => (
              <button
                key={v.role}
                onClick={() => setSelectedRole(v.role)}
                aria-label={`Select ${v.label} voice`}
                className={`py-1 text-xs font-medium rounded-lg transition-all flex flex-col items-center justify-center ${
                  selectedRole === v.role
                    ? 'bg-[#1e273a] text-white font-bold ring-1'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                style={{
                  outline: selectedRole === v.role ? `1px solid ${v.color}` : 'none',
                }}
              >
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: v.color }} />
                  {v.label}
                </span>
                <span className="text-[8px] font-mono text-slate-500">{v.range}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Action Buttons: Add Row vs Batch SATB */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* Primary Action Button: Add Row */}
        <button
          onClick={() => onAddCounterpointRow(selectedRole, config.style)}
          disabled={!hasCfNotes || isGenerating}
          aria-label={`Add generated ${selectedRole} counterpoint row`}
          className={`flex-1 min-h-[44px] rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] ${
            !hasCfNotes
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-[#1e273a]'
              : isGenerating
              ? 'bg-sky-600 text-white animate-pulse'
              : 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:brightness-110 shadow-sky-500/25 ring-1 ring-sky-300/40'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>
            {isGenerating
              ? 'Calculating Voice Leading...'
              : !hasCfNotes
              ? 'Input melody notes to generate lines'
              : `+ Add ${selectedRole.toUpperCase()} Counterpoint Row`}
          </span>
        </button>

        {/* Batch Generate Full SATB Arrangement */}
        <button
          onClick={onAddSatbArrangement}
          disabled={!hasCfNotes || isGenerating}
          aria-label="Generate full 4-voice SATB counterpoint rows"
          className={`min-h-[44px] px-3.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all active:scale-[0.98] border ${
            !hasCfNotes
              ? 'bg-slate-900/60 text-slate-600 border-[#1a2333] cursor-not-allowed'
              : 'bg-[#131b2a] hover:bg-[#1a253a] text-sky-300 border-sky-800/60 shadow-sm'
          }`}
          title="Add 4-Part Bach Chorale SATB Rows"
        >
          <Layers className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">Add Full SATB (4 Voices)</span>
          <span className="sm:hidden">Full SATB</span>
        </button>

        {/* Clear Generated Rows */}
        {generatedTrackCount > 0 && (
          <button
            onClick={onClearGeneratedRows}
            aria-label="Clear all generated counterpoint rows"
            className="min-h-[44px] px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1 border border-rose-500/20 transition-all active:scale-95"
            title="Remove all generated counterpoint lines"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Lines ({generatedTrackCount})</span>
          </button>
        )}
      </div>

      {/* Generated Rows Console Section */}
      {generatedTracks.length > 0 && (
        <div className="pt-2 border-t border-[#1c2536] space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-bold flex items-center gap-1.5 text-sky-400">
              <Sparkles className="w-3.5 h-3.5" />
              Active Generated Lines ({generatedTracks.length})
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              [▶] Audition Line · [M] Mute · [S] Solo · Tap note to sound
            </span>
          </div>

          <div className="space-y-1.5">
            {generatedTracks.map((gt) => {
              const isAuditioning = auditioningTrackId === gt.id;

              return (
                <div
                  key={gt.id}
                  className="bg-[#090d14] rounded-xl border border-[#1d273a] p-2 flex flex-wrap items-center justify-between gap-2 transition-all hover:border-[#283750]"
                >
                  {/* Left Controls: Audition Play, Mute, Solo */}
                  <div className="flex items-center gap-1">
                    {onPlayTrack && (
                      <button
                        onClick={() => onPlayTrack(gt)}
                        aria-label={isAuditioning ? `Stop auditioning ${gt.name}` : `Audition line ${gt.name}`}
                        className={`w-7 h-7 rounded-lg text-xs font-black transition-all active:scale-95 flex items-center justify-center ${
                          isAuditioning
                            ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/40 ring-1 ring-emerald-300 animate-pulse'
                            : 'bg-[#141b27] hover:bg-[#1d2738] text-emerald-400 border border-[#222e42]'
                        }`}
                        title={isAuditioning ? 'Stop Auditioning' : 'Audition / Play This Generated Line'}
                      >
                        {isAuditioning ? (
                          <Square className="w-3 h-3 fill-current" />
                        ) : (
                          <Play className="w-3 h-3 fill-current ml-0.5" />
                        )}
                      </button>
                    )}

                    {onToggleMute && (
                      <button
                        onClick={() => onToggleMute(gt.id)}
                        aria-label={`Mute line ${gt.name}`}
                        className={`w-7 h-7 rounded-lg text-xs font-black font-mono transition-all active:scale-95 flex items-center justify-center ${
                          gt.muted
                            ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/40'
                            : 'bg-[#141b27] hover:bg-[#1d2738] text-slate-300 border border-[#222e42]'
                        }`}
                        title="Mute Track (M)"
                      >
                        M
                      </button>
                    )}

                    {onToggleSolo && (
                      <button
                        onClick={() => onToggleSolo(gt.id)}
                        aria-label={`Solo line ${gt.name}`}
                        className={`w-7 h-7 rounded-lg text-xs font-black font-mono transition-all active:scale-95 flex items-center justify-center ${
                          gt.solo
                            ? 'bg-amber-400 text-slate-950 shadow-sm shadow-amber-400/40'
                            : 'bg-[#141b27] hover:bg-[#1d2738] text-slate-300 border border-[#222e42]'
                        }`}
                        title="Solo Track (S)"
                      >
                        S
                      </button>
                    )}
                  </div>

                  {/* Track Label */}
                  <div className="flex items-center gap-1.5 min-w-[120px]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: gt.color }} />
                    <span className="text-xs font-bold text-slate-200">{gt.name}</span>
                    <span className="text-[9px] uppercase font-mono text-slate-500 bg-[#141a24] px-1 py-0.2 rounded">
                      {gt.clef}
                    </span>
                  </div>

                  {/* Note sequence preview chips (clickable to play pitch!) */}
                  <div className="flex-1 flex flex-wrap items-center gap-1 overflow-x-auto py-0.5">
                    {gt.notes.map((note, nIdx) => (
                      <button
                        key={`gt-note-${gt.id}-${nIdx}`}
                        onClick={() => onPreviewPitch && onPreviewPitch(note.midi)}
                        aria-label={`Play note ${note.pitchName}${note.octave}`}
                        title={`Click to sound ${note.pitchName}${note.octave} (MIDI ${note.midi})`}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all hover:scale-105 active:scale-95 bg-[#121824] hover:bg-[#1c2638] text-sky-300 border border-[#1e2a3c]"
                        style={{ borderLeftColor: gt.color, borderLeftWidth: 2 }}
                      >
                        {note.pitchName}
                      </button>
                    ))}
                  </div>

                  {/* Delete Button */}
                  {onDeleteTrack && (
                    <button
                      onClick={() => onDeleteTrack(gt.id)}
                      aria-label={`Delete line ${gt.name}`}
                      className="w-6 h-6 rounded flex items-center justify-center text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete this generated line"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
