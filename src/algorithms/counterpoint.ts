import { ClefType, CounterpointConfig, HarmonicAnalysisStep, ModeType, MotionType, NoteEvent, VoiceRole, VoiceTrack } from '../types/music.ts';

// Pitch tables
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number): { name: string; octave: number; fullName: string } {
  const octave = Math.floor(midi / 12) - 1;
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  return { name, octave, fullName: `${name}${octave}` };
}

export function noteNameToMidi(name: string, octave: number): number {
  const index = NOTE_NAMES.indexOf(name);
  if (index === -1) return 60; // C4 default
  return (octave + 1) * 12 + index;
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Voice vocal ranges (in MIDI numbers)
export const VOICE_RANGES: Record<VoiceRole, { min: number; max: number; defaultPitch: number; clef: ClefType }> = {
  soprano: { min: 60, max: 79, defaultPitch: 72, clef: 'treble' }, // C4 - G5
  alto: { min: 55, max: 72, defaultPitch: 64, clef: 'treble' },    // G3 - C5
  tenor: { min: 48, max: 67, defaultPitch: 57, clef: 'bass' },     // C3 - G4
  bass: { min: 40, max: 60, defaultPitch: 48, clef: 'bass' },      // E2 - C4
};

// Mode scale steps (semitones from tonic)
export const MODE_INTERVALS: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10], // natural minor
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

export function getScalePitches(keyRoot: string, mode: string, minMidi: number, maxMidi: number): number[] {
  const rootIndex = NOTE_NAMES.indexOf(keyRoot.toUpperCase());
  const intervals = MODE_INTERVALS[mode] || MODE_INTERVALS.major;
  const pitches: number[] = [];

  for (let midi = minMidi; midi <= maxMidi; midi++) {
    const pitchClass = ((midi % 12) + 12) % 12;
    const relStep = ((pitchClass - rootIndex) + 12) % 12;
    if (intervals.includes(relStep)) {
      pitches.push(midi);
    }
  }
  return pitches;
}

export function getIntervalDetails(pitchA: number, pitchB: number): {
  semitones: number;
  simpleInterval: number; // 0 to 11
  name: string;
  isConsonant: boolean;
  isPerfect: boolean;
  isImperfect: boolean;
  isDissonant: boolean;
} {
  const diff = Math.abs(pitchA - pitchB);
  const simple = diff % 12;

  const names: Record<number, string> = {
    0: 'Unison / Octave',
    1: 'Minor 2nd',
    2: 'Major 2nd',
    3: 'Minor 3rd',
    4: 'Major 3rd',
    5: 'Perfect 4th',
    6: 'Tritone',
    7: 'Perfect 5th',
    8: 'Minor 6th',
    9: 'Major 6th',
    10: 'Minor 7th',
    11: 'Major 7th',
  };

  const isPerfect = simple === 0 || simple === 7;
  const isImperfect = simple === 3 || simple === 4 || simple === 8 || simple === 9;
  const isConsonant = isPerfect || isImperfect;
  const isDissonant = !isConsonant;

  return {
    semitones: diff,
    simpleInterval: simple,
    name: names[simple] || `Interval (${simple})`,
    isConsonant,
    isPerfect,
    isImperfect,
    isDissonant,
  };
}

export function detectMotion(
  voice1Prev: number,
  voice1Curr: number,
  voice2Prev: number,
  voice2Curr: number
): MotionType {
  const d1 = voice1Curr - voice1Prev;
  const d2 = voice2Curr - voice2Prev;

  if (d1 === 0 || d2 === 0) {
    return 'oblique';
  }
  if ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) {
    return 'contrary';
  }
  if (d1 === d2) {
    return 'parallel';
  }
  return 'similar';
}

// Classical (Bach) Rule Evaluation for candidate transition
function evaluateBachTransition(
  cfPrev: number,
  cfCurr: number,
  cpPrev: number,
  cpCurr: number,
  isFirstNote: boolean,
  isLastNote: boolean,
  isPenultimate: boolean,
  keyRootMidi: number,
  role: VoiceRole,
  isCpAboveCf: boolean
): number {
  let score = 100;

  // 1. Voice Crossing check
  if (isCpAboveCf && cpCurr <= cfCurr) {
    return -9999; // Voice crossing forbidden
  }
  if (!isCpAboveCf && cpCurr >= cfCurr) {
    return -9999;
  }

  const interval = getIntervalDetails(cfCurr, cpCurr);

  // 2. Downbeat consonance in 1st species
  if (interval.isDissonant) {
    return -9999; // Classical 1st species downbeat must be consonant
  }

  // 3. Perfect consonance checks & Parallelism
  if (!isFirstNote) {
    const prevInterval = getIntervalDetails(cfPrev, cpPrev);
    const motion = detectMotion(cfPrev, cfCurr, cpPrev, cpCurr);

    // Parallel 5ths or Octaves are STRICTLY FORBIDDEN
    if (motion === 'parallel') {
      if (interval.simpleInterval === 7 && prevInterval.simpleInterval === 7) {
        return -9999; // Parallel 5th
      }
      if (interval.simpleInterval === 0 && prevInterval.simpleInterval === 0) {
        return -9999; // Parallel 8ve
      }
    }

    // Direct / Hidden fifth or octave: similar motion into perfect interval with leap in upper voice
    if (motion === 'similar' && (interval.simpleInterval === 7 || interval.simpleInterval === 0)) {
      const cpLeap = Math.abs(cpCurr - cpPrev);
      if (cpLeap > 2) {
        score -= 50; // Penalize direct 5th/8ve
      }
    }

    // Contrary motion is favored in Bach counterpoint
    if (motion === 'contrary') {
      score += 25;
    } else if (motion === 'oblique') {
      score += 15;
    } else if (motion === 'similar') {
      score -= 10;
    }

    // Melodic interval check for Counterpoint line
    const cpStep = Math.abs(cpCurr - cpPrev);

    // Stepwise motion favored
    if (cpStep === 1 || cpStep === 2) {
      score += 20;
    } else if (cpStep === 3 || cpStep === 4) {
      score += 5; // Third is acceptable
    } else if (cpStep === 5 || cpStep === 7) {
      score -= 15; // 4th or 5th leap acceptable if balanced
    } else if (cpStep === 6 || cpStep === 11 || cpStep > 12) {
      return -9999; // Tritone leap, major 7th, or > octave forbidden
    } else {
      score -= 30; // Large leap penalized
    }
  }

  // 4. Cadence & Final note rules
  if (isLastNote) {
    // End on tonic root unison or octave
    const rootPitchClass = keyRootMidi % 12;
    if (cpCurr % 12 === rootPitchClass && (interval.simpleInterval === 0 || interval.simpleInterval === 7)) {
      score += 60;
    } else {
      score -= 40;
    }
  }

  if (isPenultimate) {
    // Penultimate measure should ideally be 6th or 3rd to resolve to 8ve/unison
    if (interval.simpleInterval === 9 || interval.simpleInterval === 8 || interval.simpleInterval === 3 || interval.simpleInterval === 4) {
      score += 35;
    }
  }

  return score;
}

// Modern (Pandiatonic & Modal) Rule Evaluation
function evaluateModernTransition(
  cfPrev: number,
  cfCurr: number,
  cpPrev: number,
  cpCurr: number,
  isFirstNote: boolean,
  isLastNote: boolean,
  keyRootMidi: number
): number {
  let score = 100;

  const interval = getIntervalDetails(cfCurr, cpCurr);

  // Pandiatonic colors (2nds, 4ths, 7ths, 9ths) are welcomed!
  if (interval.simpleInterval === 2 || interval.simpleInterval === 10) {
    score += 15; // Major 2nd or minor 7th pandiatonic crunch
  } else if (interval.simpleInterval === 5) {
    score += 12; // Quartal harmonic color
  } else if (interval.isConsonant) {
    score += 10;
  }

  // Low Interval Limit: Avoid muddy 2nds or 3rds below C3 (MIDI 48)
  const lowestPitch = Math.min(cfCurr, cpCurr);
  if (lowestPitch < 48 && (interval.simpleInterval === 1 || interval.simpleInterval === 2 || interval.simpleInterval === 3)) {
    score -= 30;
  }

  if (!isFirstNote) {
    const motion = detectMotion(cfPrev, cfCurr, cpPrev, cpCurr);

    // Contrary motion still produces great linear independence
    if (motion === 'contrary') {
      score += 20;
    }

    const cpStep = Math.abs(cpCurr - cpPrev);
    // Smooth vocal flow
    if (cpStep <= 2) {
      score += 15;
    } else if (cpStep <= 4) {
      score += 8;
    } else if (cpStep === 6) {
      score += 5; // Neoclassical tritone melodic inflection is acceptable in modern style
    } else if (cpStep > 12) {
      score -= 20;
    }
  }

  if (isLastNote) {
    // Modern cadences can end on open fifths, add9, or modal tonic
    const rootPitchClass = keyRootMidi % 12;
    if (cpCurr % 12 === rootPitchClass || (cpCurr % 12) === ((rootPitchClass + 7) % 12)) {
      score += 30;
    }
  }

  return score;
}

// Beam Search Solver for a single counterpoint line
export function generateSingleCounterpointLine(
  cfNotes: NoteEvent[],
  config: CounterpointConfig,
  role: VoiceRole,
  isCpAboveCf: boolean,
  existingVoicesPitches?: { [beat: number]: number[] }
): NoteEvent[] {
  if (cfNotes.length === 0) return [];

  const range = VOICE_RANGES[role];
  const rootIndex = NOTE_NAMES.indexOf(config.key.toUpperCase());
  const keyRootMidi = 60 + (rootIndex !== -1 ? rootIndex : 0);

  const candidatePitches = getScalePitches(config.key, config.mode, range.min, range.max);
  if (candidatePitches.length === 0) {
    candidatePitches.push(range.defaultPitch);
  }

  // Beam search configuration
  const BEAM_WIDTH = 18;

  interface BeamNode {
    pitches: number[];
    score: number;
  }

  let beam: BeamNode[] = [{ pitches: [], score: 0 }];

  for (let i = 0; i < cfNotes.length; i++) {
    const cfCurr = cfNotes[i].midi;
    const isFirst = i === 0;
    const isLast = i === cfNotes.length - 1;
    const isPenultimate = i === cfNotes.length - 2;

    const newCandidates: BeamNode[] = [];

    for (const node of beam) {
      const cpPrev = isFirst ? 0 : node.pitches[node.pitches.length - 1];
      const cfPrev = isFirst ? 0 : cfNotes[i - 1].midi;

      for (const pitch of candidatePitches) {
        let stepScore = 0;

        if (config.style === 'bach') {
          stepScore = evaluateBachTransition(
            cfPrev,
            cfCurr,
            cpPrev,
            pitch,
            isFirst,
            isLast,
            isPenultimate,
            keyRootMidi,
            role,
            isCpAboveCf
          );
        } else {
          stepScore = evaluateModernTransition(
            cfPrev,
            cfCurr,
            cpPrev,
            pitch,
            isFirst,
            isLast,
            keyRootMidi
          );
        }

        // Check against existing voices for multi-voice polyphony
        if (existingVoicesPitches && existingVoicesPitches[cfNotes[i].beat]) {
          const others = existingVoicesPitches[cfNotes[i].beat];
          const othersList = Array.isArray(others) ? others : typeof others === 'number' ? [others] : [];
          for (const otherPitch of othersList) {
            if (typeof otherPitch !== 'number') continue;
            // Avoid extreme unison overlap
            if (otherPitch === pitch) {
              stepScore -= 15;
            }
            if (config.style === 'bach') {
              const otherInterval = getIntervalDetails(otherPitch, pitch);
              if (otherInterval.isDissonant) {
                stepScore -= 20;
              }
            }
          }
        }

        if (stepScore > -5000) {
          newCandidates.push({
            pitches: [...node.pitches, pitch],
            score: node.score + stepScore,
          });
        }
      }
    }

    if (newCandidates.length > 0) {
      newCandidates.sort((a, b) => b.score - a.score);
      beam = newCandidates.slice(0, BEAM_WIDTH);
    } else {
      // Fallback: Pick closest pitch within range that minimizes leap or stays in voice range
      const pitchPool = candidatePitches.length > 0 ? candidatePitches : [range.defaultPitch];
      if (beam.length === 0) {
        beam = [{ pitches: [], score: -100 }];
      }
      beam = beam.map((node) => {
        const lastPitch = node.pitches.length > 0 ? node.pitches[node.pitches.length - 1] : range.defaultPitch;
        const target = isFirst ? range.defaultPitch : lastPitch;
        const fallbackPitch = nodeClosestPitch(pitchPool, target);
        return {
          pitches: [...node.pitches, fallbackPitch],
          score: node.score - 50,
        };
      });
    }
  }

  const bestSolution = beam[0];
  const generatedNotes: NoteEvent[] = [];

  for (let i = 0; i < cfNotes.length; i++) {
    const rawMidi = bestSolution && Array.isArray(bestSolution.pitches) ? bestSolution.pitches[i] : undefined;
    const midi = typeof rawMidi === 'number' && !Number.isNaN(rawMidi) ? rawMidi : range.defaultPitch;
    const { name, octave } = midiToNoteName(midi);
    generatedNotes.push({
      id: `cp-${role}-${i}-${Date.now()}`,
      midi,
      pitchName: name,
      octave,
      beat: cfNotes[i].beat,
      duration: cfNotes[i].duration,
    });
  }

  return generatedNotes;
}

function nodeClosestPitch(pitches: any, target: any): number {
  if (typeof pitches === 'number' && Array.isArray(target)) {
    const temp = pitches;
    pitches = target;
    target = temp;
  }
  if (typeof pitches === 'number') {
    return pitches;
  }
  if (!Array.isArray(pitches) || pitches.length === 0) {
    return typeof target === 'number' && !Number.isNaN(target) ? target : 60;
  }
  const targetNum = typeof target === 'number' && !Number.isNaN(target) ? target : 60;
  let closest = typeof pitches[0] === 'number' ? pitches[0] : 60;
  let minDiff = Math.abs(closest - targetNum);
  for (const p of pitches) {
    if (typeof p !== 'number') continue;
    const diff = Math.abs(p - targetNum);
    if (diff < minDiff) {
      minDiff = diff;
      closest = p;
    }
  }
  return closest;
}

// Generate all counterpoint tracks based on user configuration
export function generateCounterpointTracks(
  cfTrack: VoiceTrack,
  config: CounterpointConfig
): VoiceTrack[] {
  const cfNotes = cfTrack.notes;
  if (cfNotes.length === 0) return [cfTrack];

  const tracks: VoiceTrack[] = [cfTrack];

  // Map to store generated pitches per beat to avoid voice collisions
  const existingVoicesPitches: { [beat: number]: number[] } = {};
  for (const n of cfNotes) {
    existingVoicesPitches[n.beat] = [n.midi];
  }

  if (config.voiceCount === 5) {
    // 5-Voice Polyphony Setup
    const voiceRoles: { role: VoiceRole; id: string; name: string; color: string; isAbove: boolean; pan: number }[] = [
      { role: 'soprano', id: 'track-soprano', name: 'Soprano Counterpoint', color: '#84CC16', isAbove: true, pan: -0.35 },
      { role: 'alto', id: 'track-alto', name: 'Alto Voice', color: '#10B981', isAbove: true, pan: 0.3 },
      { role: 'tenor', id: 'track-tenor-cp', name: 'Tenor Voice', color: '#06B6D4', isAbove: false, pan: -0.2 },
      { role: 'bass', id: 'track-bass', name: 'Bass Foundation', color: '#8B5CF6', isAbove: false, pan: 0.1 },
    ];

    let trackNum = 2;
    for (const v of voiceRoles) {
      if (v.role === cfTrack.voiceRole && tracks.length === 1) {
        // If CF has this role, create a complement voice
      }

      const notes = generateSingleCounterpointLine(
        cfNotes,
        config,
        v.role,
        v.isAbove,
        existingVoicesPitches
      );

      for (const note of notes) {
        if (!existingVoicesPitches[note.beat]) existingVoicesPitches[note.beat] = [];
        existingVoicesPitches[note.beat].push(note.midi);
      }

      tracks.push({
        id: v.id,
        trackNumber: trackNum++,
        name: v.name,
        voiceRole: v.role,
        clef: VOICE_RANGES[v.role].clef,
        color: v.color,
        isCantusFirmus: false,
        notes,
        volume: 0.8,
        pan: v.pan,
        muted: false,
        solo: false,
      });
    }
  } else if (config.species === 'chorale' || config.voiceCount === 4) {
    // 4-Voice SATB setup
    const voiceRoles: { role: VoiceRole; name: string; color: string; isAbove: boolean }[] = [
      { role: 'soprano', name: 'Soprano (Counterpoint 1)', color: '#84CC16', isAbove: true },
      { role: 'alto', name: 'Alto (Counterpoint 2)', color: '#10B981', isAbove: true },
      { role: 'tenor', name: 'Tenor (Counterpoint 3)', color: '#06B6D4', isAbove: false },
      { role: 'bass', name: 'Bass (Harmonic Root)', color: '#8B5CF6', isAbove: false },
    ];

    let trackNum = 2;
    for (const v of voiceRoles) {
      if (v.role === cfTrack.voiceRole) continue; // Skip CF role

      const notes = generateSingleCounterpointLine(
        cfNotes,
        config,
        v.role,
        v.isAbove,
        existingVoicesPitches
      );

      // Record pitches
      for (const note of notes) {
        if (!existingVoicesPitches[note.beat]) existingVoicesPitches[note.beat] = [];
        existingVoicesPitches[note.beat].push(note.midi);
      }

      tracks.push({
        id: `track-${v.role}`,
        trackNumber: trackNum++,
        name: v.name,
        voiceRole: v.role,
        clef: VOICE_RANGES[v.role].clef,
        color: v.color,
        isCantusFirmus: false,
        notes,
        volume: 0.8,
        pan: v.role === 'soprano' ? -0.3 : v.role === 'bass' ? 0.3 : 0,
        muted: false,
        solo: false,
      });
    }
  } else if (config.voiceCount === 3) {
    // 3-Voice counterpoint
    const roles: { role: VoiceRole; name: string; color: string; isAbove: boolean }[] = [
      { role: 'soprano', name: 'Counterpoint Upper', color: '#84CC16', isAbove: true },
      { role: 'bass', name: 'Counterpoint Lower', color: '#8B5CF6', isAbove: false },
    ];

    let trackNum = 2;
    for (const v of roles) {
      const notes = generateSingleCounterpointLine(
        cfNotes,
        config,
        v.role,
        v.isAbove,
        existingVoicesPitches
      );

      for (const note of notes) {
        if (!existingVoicesPitches[note.beat]) existingVoicesPitches[note.beat] = [];
        existingVoicesPitches[note.beat].push(note.midi);
      }

      tracks.push({
        id: `track-${v.role}`,
        trackNumber: trackNum++,
        name: v.name,
        voiceRole: v.role,
        clef: VOICE_RANGES[v.role].clef,
        color: v.color,
        isCantusFirmus: false,
        notes,
        volume: 0.8,
        pan: v.isAbove ? -0.25 : 0.25,
        muted: false,
        solo: false,
      });
    }
  } else {
    // 2-Voice counterpoint
    const role: VoiceRole = config.cfPosition === 'bass' ? 'soprano' : 'bass';
    const isAbove = config.cfPosition === 'bass';

    const notes = generateSingleCounterpointLine(
      cfNotes,
      config,
      role,
      isAbove,
      existingVoicesPitches
    );

    tracks.push({
      id: `track-${role}`,
      trackNumber: 2,
      name: isAbove ? 'Counterpoint Line (Soprano)' : 'Counterpoint Line (Bass)',
      voiceRole: role,
      clef: VOICE_RANGES[role].clef,
      color: '#84CC16',
      isCantusFirmus: false,
      notes,
      volume: 0.85,
      pan: 0,
      muted: false,
      solo: false,
    });
  }

  // Ensure track 1 has trackNumber 1
  if (tracks.length > 0 && !tracks[0].trackNumber) {
    tracks[0].trackNumber = 1;
  }

  return tracks;
}

// Harmonic analysis between Cantus Firmus and Counterpoint lines
export function performHarmonicAnalysis(tracks: VoiceTrack[]): HarmonicAnalysisStep[] {
  const cfTrack = tracks.find((t) => t.isCantusFirmus) || tracks[0];
  if (!cfTrack || cfTrack.notes.length === 0) return [];

  const otherTracks = tracks.filter((t) => t.id !== cfTrack.id);
  const steps: HarmonicAnalysisStep[] = [];

  for (let i = 0; i < cfTrack.notes.length; i++) {
    const cfNote = cfTrack.notes[i];
    const cpPitches: { [trackId: string]: number } = {};
    const intervals: HarmonicAnalysisStep['intervals'] = [];

    for (const track of otherTracks) {
      const note = track.notes[i];
      if (note) {
        cpPitches[track.id] = note.midi;
        const details = getIntervalDetails(cfNote.midi, note.midi);

        let motion: MotionType | undefined;
        let isParallelWarning = false;

        if (i > 0) {
          const prevCf = cfTrack.notes[i - 1].midi;
          const prevCp = track.notes[i - 1]?.midi;
          if (prevCp !== undefined) {
            motion = detectMotion(prevCf, cfNote.midi, prevCp, note.midi);
            const prevDetails = getIntervalDetails(prevCf, prevCp);

            if (motion === 'parallel' && (details.simpleInterval === 7 || details.simpleInterval === 0) && (prevDetails.simpleInterval === 7 || prevDetails.simpleInterval === 0)) {
              isParallelWarning = true;
            }
          }
        }

        let consonanceType: HarmonicAnalysisStep['intervals'][0]['consonanceType'] = 'dissonance';
        if (details.isPerfect) consonanceType = 'perfect';
        else if (details.isImperfect) consonanceType = 'imperfect';
        else if (details.simpleInterval === 2 || details.simpleInterval === 10 || details.simpleInterval === 5) {
          consonanceType = 'pandiatonic_color';
        }

        intervals.push({
          trackId: track.id,
          intervalSemis: details.semitones,
          intervalName: details.name,
          consonanceType,
          motion,
          isParallelWarning,
          comment: isParallelWarning
            ? 'Warning: Parallel 5th or Octave in classical style!'
            : motion === 'contrary'
            ? 'Graceful contrary motion'
            : details.isConsonant
            ? 'Balanced consonance'
            : 'Color verticality',
        });
      }
    }

    steps.push({
      beat: cfNote.beat,
      cfPitch: cfNote.midi,
      cpPitches,
      intervals,
    });
  }

  return steps;
}

// Canonical Presets for quick learning & composition
export const CANONICAL_PRESETS = [
  {
    name: 'Fux Dorian Cantus Firmus',
    description: 'Classical 18th-century modal cantus firmus from Gradus ad Parnassum.',
    key: 'D',
    mode: 'dorian' as ModeType,
    notes: [
      { midi: 62, duration: 2 }, // D4
      { midi: 65, duration: 2 }, // F4
      { midi: 64, duration: 2 }, // E4
      { midi: 62, duration: 2 }, // D4
      { midi: 67, duration: 2 }, // G4
      { midi: 65, duration: 2 }, // F4
      { midi: 64, duration: 2 }, // E4
      { midi: 62, duration: 4 }, // D4
    ],
  },
  {
    name: 'Bach Chorale "O Sacred Head"',
    description: 'Johann Sebastian Bach chorale melody in natural minor.',
    key: 'A',
    mode: 'minor' as ModeType,
    notes: [
      { midi: 69, duration: 2 }, // A4
      { midi: 64, duration: 2 }, // E4
      { midi: 65, duration: 2 }, // F4
      { midi: 67, duration: 2 }, // G4
      { midi: 69, duration: 2 }, // A4
      { midi: 67, duration: 2 }, // G4
      { midi: 65, duration: 2 }, // F4
      { midi: 64, duration: 4 }, // E4
    ],
  },
  {
    name: 'Pandiatonic Neoclassical Theme',
    description: '20th-century modal cantus firmus in Lydian/Major style.',
    key: 'C',
    mode: 'major' as ModeType,
    notes: [
      { midi: 60, duration: 2 }, // C4
      { midi: 64, duration: 2 }, // E4
      { midi: 67, duration: 2 }, // G4
      { midi: 71, duration: 2 }, // B4
      { midi: 72, duration: 2 }, // C5
      { midi: 69, duration: 2 }, // A4
      { midi: 62, duration: 2 }, // D4
      { midi: 60, duration: 4 }, // C4
    ],
  },
];

// In-depth musical analysis of user input Cantus Firmus melody
export function analyzeMelody(notes: NoteEvent[]): import('../types/music.ts').MelodyAnalysis {
  if (notes.length === 0) {
    return {
      detectedKey: 'C',
      detectedMode: 'major',
      confidence: 50,
      pitchRange: { minMidi: 60, maxMidi: 60, spanSemitones: 0, minNote: 'C4', maxNote: 'C4' },
      climaxNote: { midi: 60, name: 'C4', beat: 0 },
      stepPercentage: 0,
      leapPercentage: 0,
      contourType: 'undulating',
      cadenceQuality: 'open',
      recommendedCfRole: 'tenor',
      summary: 'No notes entered yet.',
      suggestions: ['Place notes on the staff to begin contrapuntal analysis.'],
    };
  }

  const midis = notes.map((n) => n.midi);
  const minMidi = Math.min(...midis);
  const maxMidi = Math.max(...midis);
  const span = maxMidi - minMidi;

  // Climax note (highest pitch)
  let climaxMidi = notes[0].midi;
  let climaxBeat = notes[0].beat;
  let climaxIndex = 0;
  for (let i = 0; i < notes.length; i++) {
    if (notes[i].midi > climaxMidi) {
      climaxMidi = notes[i].midi;
      climaxBeat = notes[i].beat;
      climaxIndex = i;
    }
  }

  // Melodic intervals (steps vs leaps)
  let stepsCount = 0;
  let leapsCount = 0;
  for (let i = 1; i < notes.length; i++) {
    const diff = Math.abs(notes[i].midi - notes[i - 1].midi);
    if (diff <= 2) {
      stepsCount++;
    } else {
      leapsCount++;
    }
  }
  const totalTransitions = Math.max(1, notes.length - 1);
  const stepPercentage = Math.round((stepsCount / totalTransitions) * 100);
  const leapPercentage = 100 - stepPercentage;

  // Contour shape
  let contourType: 'arch' | 'ascending' | 'descending' | 'undulating' = 'undulating';
  const startMidi = notes[0].midi;
  const endMidi = notes[notes.length - 1].midi;
  const isClimaxInMiddle = climaxIndex > 0 && climaxIndex < notes.length - 1;

  if (isClimaxInMiddle && climaxMidi > startMidi && climaxMidi > endMidi) {
    contourType = 'arch';
  } else if (endMidi > startMidi + 3) {
    contourType = 'ascending';
  } else if (startMidi > endMidi + 3) {
    contourType = 'descending';
  }

  // Tonal center / key and mode detection
  // Count frequency of pitch classes weighted by position
  const pcWeights = new Array(12).fill(0);
  notes.forEach((n, idx) => {
    const pc = ((n.midi % 12) + 12) % 12;
    // Notes at start and end carry high tonal weight
    let weight = n.duration;
    if (idx === 0) weight *= 2.5;
    if (idx === notes.length - 1) weight *= 3.5;
    pcWeights[pc] += weight;
  });

  // Evaluate each root and mode
  const modeList: ModeType[] = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian'];
  let bestRoot = ((notes[notes.length - 1].midi % 12) + 12) % 12; // Start with final note as primary candidate
  let bestMode: ModeType = 'major';
  let bestScore = -1;

  for (let root = 0; root < 12; root++) {
    for (const m of modeList) {
      const intervals = MODE_INTERVALS[m];
      let matchCount = 0;
      let totalWeight = 0;

      notes.forEach((n) => {
        const pc = ((n.midi % 12) + 12) % 12;
        const rel = ((pc - root) + 12) % 12;
        if (intervals.includes(rel)) {
          matchCount += n.duration;
        }
        totalWeight += n.duration;
      });

      let score = (matchCount / totalWeight) * 80;
      // Bonus if root matches final note (strong classical cadential tendency)
      if (root === ((notes[notes.length - 1].midi % 12) + 12) % 12) {
        score += 20;
      }
      // Bonus if root matches initial note
      if (root === ((notes[0].midi % 12) + 12) % 12) {
        score += 10;
      }

      // Check characteristic scale degrees for modal specificity
      notes.forEach((n) => {
        const pc = ((n.midi % 12) + 12) % 12;
        const rel = ((pc - root) + 12) % 12;
        if (m === 'dorian' && rel === 9) score += 15; // Raised 6th (Dorian hallmark)
        if (m === 'minor' && rel === 8) score += 15; // Flat 6th (Natural minor hallmark)
        if (m === 'phrygian' && rel === 1) score += 15; // Flat 2nd (Phrygian hallmark)
        if (m === 'lydian' && rel === 6) score += 15; // Raised 4th (Lydian hallmark)
        if (m === 'mixolydian' && rel === 10) score += 15; // Flat 7th in major (Mixolydian hallmark)
      });

      // Historical church modal affinity for D-based cantus firmus
      if (root === 2 && m === 'dorian') score += 2;

      if (score > bestScore) {
        bestScore = score;
        bestRoot = root;
        bestMode = m;
      }
    }
  }

  const detectedKey = NOTE_NAMES[bestRoot];
  const detectedMode = bestMode;
  const confidence = Math.min(98, Math.max(55, Math.round(bestScore)));

  // Cadence Quality
  const finalPc = ((notes[notes.length - 1].midi % 12) + 12) % 12;
  let cadenceQuality: 'strong' | 'moderate' | 'open' = 'moderate';
  if (finalPc === bestRoot) {
    if (notes.length > 1) {
      const penultPc = ((notes[notes.length - 2].midi % 12) + 12) % 12;
      const penultInterval = ((penultPc - bestRoot) + 12) % 12;
      if (penultInterval === 2 || penultInterval === 11 || penultInterval === 1) {
        cadenceQuality = 'strong'; // 2->1 or 7->1 stepwise cadence
      }
    }
  } else if (finalPc === ((bestRoot + 7) % 12) || finalPc === ((bestRoot + 4) % 12)) {
    cadenceQuality = 'open';
  }

  // Recommended Vocal Role based on register
  const avgMidi = midis.reduce((a, b) => a + b, 0) / midis.length;
  let recommendedCfRole: VoiceRole = 'tenor';
  if (avgMidi >= 66) recommendedCfRole = 'soprano';
  else if (avgMidi >= 58) recommendedCfRole = 'alto';
  else if (avgMidi >= 48) recommendedCfRole = 'tenor';
  else recommendedCfRole = 'bass';

  const minNote = midiToNoteName(minMidi).fullName;
  const maxNote = midiToNoteName(maxMidi).fullName;
  const climaxNoteName = midiToNoteName(climaxMidi).fullName;

  // Dynamic suggestions & feedback
  const suggestions: string[] = [];
  if (span > 16) {
    suggestions.push(`Melody span (${span} semitones) is wide. Classical cantus firmi typically stay within a 10th.`);
  } else {
    suggestions.push(`Excellent vocal range span (${span} semitones) within classical guidelines.`);
  }

  if (stepPercentage < 60) {
    suggestions.push(`Stepwise motion is ${stepPercentage}%. Classical rules recommend >60% steps for smooth vocal contour.`);
  } else {
    suggestions.push(`Smooth melodic flow with ${stepPercentage}% stepwise motion.`);
  }

  if (contourType === 'arch') {
    suggestions.push(`Classic arch contour detected with climax on ${climaxNoteName} (Bar ${Math.floor(climaxBeat / 4) + 1}).`);
  }

  const summary = `Detected ${detectedKey} ${detectedMode.charAt(0).toUpperCase() + detectedMode.slice(1)} (${confidence}% match). Melodic range ${minNote}–${maxNote} (${span}st) with ${stepPercentage}% steps.`;

  return {
    detectedKey,
    detectedMode,
    confidence,
    pitchRange: { minMidi, maxMidi, spanSemitones: span, minNote, maxNote },
    climaxNote: { midi: climaxMidi, name: climaxNoteName, beat: climaxBeat },
    stepPercentage,
    leapPercentage,
    contourType,
    cadenceQuality,
    recommendedCfRole,
    summary,
    suggestions,
  };
}

