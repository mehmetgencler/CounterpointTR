export type ClefType = 'treble' | 'bass';
export type VoiceRole = 'soprano' | 'alto' | 'tenor' | 'bass';
export type CounterpointStyle = 'bach' | 'modern';
export type SpeciesType = 'first' | 'second' | 'third' | 'fourth' | 'chorale';
export type SoundEngineType = 'piano' | 'strings';
export type ModeType = 'major' | 'minor' | 'dorian' | 'mixolydian' | 'lydian' | 'phrygian';

export interface NoteEvent {
  id: string;
  midi: number;
  pitchName: string;
  octave: number;
  beat: number; // in quarter notes or half notes
  duration: number; // beat duration (e.g., 1 for quarter, 2 for half, 4 for whole)
  isRest?: boolean;
}

export interface VoiceTrack {
  id: string;
  trackNumber?: number;
  name: string;
  voiceRole: VoiceRole;
  clef: ClefType;
  color: string;
  isCantusFirmus: boolean;
  notes: NoteEvent[];
  volume: number; // 0 to 1.5 (1.0 = 0 dB unity)
  pan: number; // -1 (left) to 1 (right)
  muted: boolean;
  solo: boolean;
  armed?: boolean;
}

export interface CounterpointConfig {
  style: CounterpointStyle;
  species: SpeciesType;
  voiceCount: 2 | 3 | 4 | 5;
  cfPosition: 'soprano' | 'tenor' | 'bass';
  key: string;
  mode: ModeType;
  tempo: number; // BPM
}

export type MotionType = 'contrary' | 'oblique' | 'parallel' | 'similar';

export interface HarmonicAnalysisStep {
  beat: number;
  cfPitch: number;
  cpPitches: { [trackId: string]: number };
  intervals: {
    trackId: string;
    intervalSemis: number;
    intervalName: string;
    consonanceType: 'perfect' | 'imperfect' | 'dissonance' | 'pandiatonic_color';
    motion?: MotionType;
    comment: string;
    isParallelWarning?: boolean;
  }[];
}

export interface MelodyAnalysis {
  detectedKey: string;
  detectedMode: ModeType;
  confidence: number; // 0 - 100%
  pitchRange: {
    minMidi: number;
    maxMidi: number;
    spanSemitones: number;
    minNote: string;
    maxNote: string;
  };
  climaxNote: {
    midi: number;
    name: string;
    beat: number;
  };
  stepPercentage: number;
  leapPercentage: number;
  contourType: 'arch' | 'ascending' | 'descending' | 'undulating';
  cadenceQuality: 'strong' | 'moderate' | 'open';
  recommendedCfRole: VoiceRole;
  summary: string;
  suggestions: string[];
}

export interface PlaybackState {
  isPlaying: boolean;
  currentBeat: number;
  totalBeats: number;
  tempo: number;
  isLooping: boolean;
}
