import test from 'node:test';
import assert from 'node:assert/strict';
import {
  midiToNoteName,
  noteNameToMidi,
  midiToFrequency,
  getIntervalDetails,
  detectMotion,
  getScalePitches,
  generateSingleCounterpointLine,
  generateCounterpointTracks,
  performHarmonicAnalysis,
  analyzeMelody,
} from './counterpoint.ts';
import { NoteEvent, VoiceTrack, CounterpointConfig } from '../types/music.ts';

test('midiToNoteName converts 60 to C4 and 69 to A4', () => {
  const c4 = midiToNoteName(60);
  assert.equal(c4.fullName, 'C4');
  assert.equal(c4.name, 'C');
  assert.equal(c4.octave, 4);

  const a4 = midiToNoteName(69);
  assert.equal(a4.fullName, 'A4');
  assert.equal(a4.name, 'A');
  assert.equal(a4.octave, 4);
});

test('noteNameToMidi parses pitch and octave accurately', () => {
  assert.equal(noteNameToMidi('C', 4), 60);
  assert.equal(noteNameToMidi('A', 4), 69);
  assert.equal(noteNameToMidi('D', 3), 50);
});

test('midiToFrequency calculates A440 exactly', () => {
  const freqA4 = midiToFrequency(69);
  assert.ok(Math.abs(freqA4 - 440) < 0.001);
});

test('getIntervalDetails correctly identifies consonances and dissonances', () => {
  // Octave / Unison: Perfect consonance
  const octave = getIntervalDetails(60, 72);
  assert.equal(octave.isConsonant, true);
  assert.equal(octave.isPerfect, true);

  // Perfect 5th (7 semitones): Perfect consonance
  const p5 = getIntervalDetails(60, 67);
  assert.equal(p5.isConsonant, true);
  assert.equal(p5.isPerfect, true);

  // Major 3rd (4 semitones): Imperfect consonance
  const m3 = getIntervalDetails(60, 64);
  assert.equal(m3.isConsonant, true);
  assert.equal(m3.isImperfect, true);

  // Major 2nd (2 semitones): Dissonance
  const m2 = getIntervalDetails(60, 62);
  assert.equal(m2.isDissonant, true);
  assert.equal(m2.isConsonant, false);

  // Tritone (6 semitones): Dissonance
  const tritone = getIntervalDetails(60, 66);
  assert.equal(tritone.isDissonant, true);
});

test('detectMotion accurately classifies voice movements', () => {
  // Voice 1: D4 to E4 (up), Voice 2: B4 to A4 (down) -> Contrary
  assert.equal(detectMotion(62, 64, 71, 69), 'contrary');

  // Voice 1: D4 to D4 (still), Voice 2: B4 to C5 (up) -> Oblique
  assert.equal(detectMotion(62, 62, 71, 72), 'oblique');

  // Both move up by 2 semitones -> Parallel
  assert.equal(detectMotion(60, 62, 67, 69), 'parallel');

  // Both move up but by different semitones -> Similar
  assert.equal(detectMotion(60, 64, 67, 72), 'similar');
});

test('getScalePitches returns diatonic notes in range', () => {
  const cMajor = getScalePitches('C', 'major', 60, 72);
  // C4, D4, E4, F4, G4, A4, B4, C5
  assert.deepEqual(cMajor, [60, 62, 64, 65, 67, 69, 71, 72]);
});

test('generateSingleCounterpointLine outputs valid notes matching CF length in Bach style', () => {
  const cfNotes: NoteEvent[] = [
    { id: '1', midi: 62, pitchName: 'D', octave: 4, beat: 0, duration: 2 },
    { id: '2', midi: 65, pitchName: 'F', octave: 4, beat: 2, duration: 2 },
    { id: '3', midi: 64, pitchName: 'E', octave: 4, beat: 4, duration: 2 },
    { id: '4', midi: 62, pitchName: 'D', octave: 4, beat: 6, duration: 2 },
  ];

  const config: CounterpointConfig = {
    style: 'bach',
    species: 'first',
    voiceCount: 2,
    cfPosition: 'tenor',
    key: 'D',
    mode: 'dorian',
    tempo: 100,
  };

  const cpNotes = generateSingleCounterpointLine(cfNotes, config, 'soprano', true);
  assert.equal(cpNotes.length, cfNotes.length);

  // In Bach 1st species, downbeats must be consonant
  for (let i = 0; i < cfNotes.length; i++) {
    const interval = getIntervalDetails(cfNotes[i].midi, cpNotes[i].midi);
    assert.equal(interval.isConsonant, true, `Note ${i} (${interval.name}) must be consonant`);
  }
});

test('generateCounterpointTracks generates full SATB chorale without crashing', () => {
  const cfTrack: VoiceTrack = {
    id: 'cf',
    name: 'Cantus Firmus',
    voiceRole: 'tenor',
    clef: 'bass',
    color: '#10B981',
    isCantusFirmus: true,
    notes: [
      { id: 'n1', midi: 60, pitchName: 'C', octave: 4, beat: 0, duration: 2 },
      { id: 'n2', midi: 64, pitchName: 'E', octave: 4, beat: 2, duration: 2 },
      { id: 'n3', midi: 62, pitchName: 'D', octave: 4, beat: 4, duration: 2 },
      { id: 'n4', midi: 60, pitchName: 'C', octave: 4, beat: 6, duration: 4 },
    ],
    volume: 0.8,
    pan: 0,
    muted: false,
    solo: false,
  };

  const config: CounterpointConfig = {
    style: 'bach',
    species: 'chorale',
    voiceCount: 4,
    cfPosition: 'tenor',
    key: 'C',
    mode: 'major',
    tempo: 100,
  };

  const tracks = generateCounterpointTracks(cfTrack, config);
  assert.equal(tracks.length, 4); // Soprano, Alto, Tenor (CF), Bass
  for (const track of tracks) {
    assert.equal(track.notes.length, cfTrack.notes.length);
  }

  const analysis = performHarmonicAnalysis(tracks);
  assert.equal(analysis.length, cfTrack.notes.length);
});

test('analyzeMelody correctly identifies D Dorian modal theme and arch contour', () => {
  const fuxDorianNotes: NoteEvent[] = [
    { id: '1', midi: 62, pitchName: 'D', octave: 4, beat: 0, duration: 2 },
    { id: '2', midi: 65, pitchName: 'F', octave: 4, beat: 2, duration: 2 },
    { id: '3', midi: 64, pitchName: 'E', octave: 4, beat: 4, duration: 2 },
    { id: '4', midi: 62, pitchName: 'D', octave: 4, beat: 6, duration: 2 },
    { id: '5', midi: 67, pitchName: 'G', octave: 4, beat: 8, duration: 2 },
    { id: '6', midi: 65, pitchName: 'F', octave: 4, beat: 10, duration: 2 },
    { id: '7', midi: 64, pitchName: 'E', octave: 4, beat: 12, duration: 2 },
    { id: '8', midi: 62, pitchName: 'D', octave: 4, beat: 14, duration: 4 },
  ];

  const analysis = analyzeMelody(fuxDorianNotes);
  assert.equal(analysis.detectedKey, 'D');
  assert.equal(analysis.detectedMode, 'dorian');
  assert.equal(analysis.climaxNote.name, 'G4');
  assert.equal(analysis.contourType, 'arch');
  assert.equal(analysis.cadenceQuality, 'strong');
  assert.ok(analysis.confidence >= 80);
});

test('generateSingleCounterpointLine handles constrained multi-voice fallback without throwing', () => {
  const cfNotes: NoteEvent[] = [
    { id: '1', midi: 60, pitchName: 'C', octave: 4, beat: 0, duration: 2 },
    { id: '2', midi: 62, pitchName: 'D', octave: 4, beat: 2, duration: 2 },
    { id: '3', midi: 64, pitchName: 'E', octave: 4, beat: 4, duration: 2 },
  ];

  const config: CounterpointConfig = {
    style: 'bach',
    species: 'first',
    voiceCount: 4,
    cfPosition: 'tenor',
    key: 'C',
    mode: 'major',
    tempo: 100,
  };

  // Pre-fill existing voice pitches at each beat with notes that create strict constraints
  const denseExistingVoices = {
    0: [60, 64, 67],
    2: [62, 65, 69],
    4: [64, 67, 71],
  };

  // Test across all 4 voice roles in Bach style
  for (const role of ['soprano', 'alto', 'tenor', 'bass'] as const) {
    const isAbove = role === 'soprano' || role === 'alto';
    const notes = generateSingleCounterpointLine(cfNotes, config, role, isAbove, denseExistingVoices);
    assert.equal(notes.length, cfNotes.length);
    assert.ok(notes.every((n) => typeof n.midi === 'number' && !Number.isNaN(n.midi)));
  }

  // Test across modern style
  const modernConfig: CounterpointConfig = { ...config, style: 'modern' };
  for (const role of ['soprano', 'alto', 'tenor', 'bass'] as const) {
    const isAbove = role === 'soprano' || role === 'alto';
    const notes = generateSingleCounterpointLine(cfNotes, modernConfig, role, isAbove, denseExistingVoices);
    assert.equal(notes.length, cfNotes.length);
    assert.ok(notes.every((n) => typeof n.midi === 'number' && !Number.isNaN(n.midi)));
  }
});

test('generateSingleCounterpointLine survives scalar numbers in existingVoicesPitches without TypeError: number is not iterable', () => {
  const cfNotes: NoteEvent[] = [
    { id: '1', midi: 60, pitchName: 'C', octave: 4, beat: 0, duration: 2 },
    { id: '2', midi: 62, pitchName: 'D', octave: 4, beat: 2, duration: 2 },
    { id: '3', midi: 64, pitchName: 'E', octave: 4, beat: 4, duration: 2 },
  ];

  const config: CounterpointConfig = {
    style: 'bach',
    species: 'first',
    voiceCount: 2,
    cfPosition: 'tenor',
    key: 'C',
    mode: 'major',
    tempo: 96,
  };

  // Malformed existingVoices with bare numbers instead of arrays
  const scalarExistingVoices: any = {
    0: 60, // Number instead of array!
    2: 62,
    4: 64,
  };

  const notes = generateSingleCounterpointLine(cfNotes, config, 'soprano', true, scalarExistingVoices);
  assert.equal(notes.length, 3);
  assert.ok(notes.every((n) => typeof n.midi === 'number' && n.midi >= 60 && n.midi <= 80));
});

test('generated tracks have valid midi, playable frequencies, and matching beat lengths', () => {
  const cfTrack: VoiceTrack = {
    id: 'track-cf',
    name: 'Theme',
    voiceRole: 'tenor',
    clef: 'bass',
    color: '#10B981',
    isCantusFirmus: true,
    notes: [
      { id: '1', midi: 60, pitchName: 'C', octave: 4, beat: 0, duration: 2 },
      { id: '2', midi: 64, pitchName: 'E', octave: 4, beat: 2, duration: 2 },
      { id: '3', midi: 67, pitchName: 'G', octave: 4, beat: 4, duration: 2 },
    ],
    volume: 0.9,
    pan: 0,
    muted: false,
    solo: false,
  };

  const config: CounterpointConfig = {
    style: 'bach',
    species: 'chorale',
    voiceCount: 4,
    cfPosition: 'tenor',
    key: 'C',
    mode: 'major',
    tempo: 100,
  };

  const tracks = generateCounterpointTracks(cfTrack, config);
  assert.equal(tracks.length, 4);

  tracks.forEach((t) => {
    assert.equal(t.notes.length, 3);
    t.notes.forEach((n) => {
      assert.ok(typeof n.midi === 'number' && !Number.isNaN(n.midi) && n.midi > 20);
      assert.ok(typeof n.beat === 'number' && n.beat >= 0);
      assert.ok(n.duration > 0);
      const freq = midiToFrequency(n.midi);
      assert.ok(Number.isFinite(freq) && freq > 20 && freq < 5000);
    });
  });
});



