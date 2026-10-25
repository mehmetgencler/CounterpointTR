import { NoteEvent, SoundEngineType, VoiceTrack } from '../types/music.ts';
import { midiToFrequency } from '../algorithms/counterpoint.ts';

// Free open-source Salamander Grand Piano sample map (CC BY 3.0)
const SALAMANDER_SAMPLES: { name: string; midi: number }[] = [
  { name: 'C2', midi: 36 },
  { name: 'Ds2', midi: 39 },
  { name: 'Fs2', midi: 42 },
  { name: 'A2', midi: 45 },
  { name: 'C3', midi: 48 },
  { name: 'Ds3', midi: 51 },
  { name: 'Fs3', midi: 54 },
  { name: 'A3', midi: 57 },
  { name: 'C4', midi: 60 },
  { name: 'Ds4', midi: 63 },
  { name: 'Fs4', midi: 66 },
  { name: 'A4', midi: 69 },
  { name: 'C5', midi: 72 },
  { name: 'Ds5', midi: 75 },
  { name: 'Fs5', midi: 78 },
  { name: 'A5', midi: 81 },
  { name: 'C6', midi: 84 },
];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private dryGain: GainNode | null = null;
  private trackGainNodes: Map<string, GainNode> = new Map();
  private trackPanNodes: Map<string, StereoPannerNode> = new Map();
  private trackAnalyserNodes: Map<string, AnalyserNode> = new Map();
  private activeOscillators: Array<{ stop: (time: number) => void }> = [];
  private soundEngineType: SoundEngineType = 'piano';
  private isUnlocked: boolean = false;
  private animationFrameId: number | null = null;

  // Real Sample Audio Buffers
  private sampleBuffers: Map<string, AudioBuffer> = new Map();
  private loadingSamples: Set<string> = new Set();
  public sampleLoadStatus: 'idle' | 'loading' | 'ready' | 'fallback' = 'idle';

  constructor() {
    // Lazy initialization on user interaction
  }

  public init(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output bus
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      this.masterAnalyser = this.ctx.createAnalyser();
      this.masterAnalyser.fftSize = 64;

      this.dryGain = this.ctx.createGain();
      this.dryGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

      this.reverbGain = this.ctx.createGain();
      this.reverbGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

      // Create rich algorithmic impulse response for concert hall space
      this.reverbNode = this.ctx.createConvolver();
      this.reverbNode.buffer = this.buildHallImpulseResponse(this.ctx, 2.2, 2.8);

      // Connections
      this.dryGain.connect(this.masterGain);
      this.reverbGain.connect(this.masterGain);
      this.reverbNode.connect(this.reverbGain);

      this.masterGain.connect(this.masterAnalyser);
      this.masterAnalyser.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  public async unlock(): Promise<boolean> {
    const ctx = this.init();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
        this.isUnlocked = true;
      } catch {
        return false;
      }
    } else {
      this.isUnlocked = true;
    }

    // Begin background preloading of all essential piano samples across vocal ranges
    this.preloadAllPianoSamples();
    return this.isUnlocked;
  }

  // Preload all Salamander grand piano samples (CC BY 3.0) across all vocal ranges (C2 to C6)
  public async preloadAllPianoSamples() {
    if (this.sampleLoadStatus === 'ready' || this.sampleLoadStatus === 'loading') return;
    this.sampleLoadStatus = 'loading';

    try {
      await Promise.all(SALAMANDER_SAMPLES.map((s) => this.fetchSample(s.name)));
      this.sampleLoadStatus = 'ready';
    } catch {
      this.sampleLoadStatus = 'fallback';
    }
  }

  // Backward compatible alias
  public async preloadCorePianoSamples() {
    return this.preloadAllPianoSamples();
  }

  private async fetchSample(name: string): Promise<AudioBuffer | null> {
    if (this.sampleBuffers.has(name)) {
      return this.sampleBuffers.get(name)!;
    }
    if (this.loadingSamples.has(name)) return null;

    this.loadingSamples.add(name);
    try {
      const url = `https://tonejs.github.io/audio/salamander/${name}.mp3`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const ctx = this.init();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      this.sampleBuffers.set(name, audioBuffer);
      this.loadingSamples.delete(name);
      return audioBuffer;
    } catch {
      this.loadingSamples.delete(name);
      return null;
    }
  }

  public setSoundEngine(type: SoundEngineType) {
    this.soundEngineType = type;
    if (type === 'piano') {
      this.preloadAllPianoSamples();
    }
  }

  public getSoundEngine(): SoundEngineType {
    return this.soundEngineType;
  }

  // Algorithmic concert hall impulse response
  private buildHallImpulseResponse(ctx: AudioContext, duration: number, decay: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = length - i;
      const factor = Math.pow(n / length, decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }

    return impulse;
  }

  private getOrCreateTrackBus(trackId: string): { gainNode: GainNode; panNode: StereoPannerNode; analyserNode: AnalyserNode } {
    const ctx = this.init();
    if (!this.trackGainNodes.has(trackId)) {
      const gainNode = ctx.createGain();
      const panNode = ctx.createStereoPanner ? ctx.createStereoPanner() : (ctx.createGain() as unknown as StereoPannerNode);
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 64;

      gainNode.connect(panNode);
      panNode.connect(analyserNode);
      analyserNode.connect(this.dryGain!);
      analyserNode.connect(this.reverbNode!);

      this.trackGainNodes.set(trackId, gainNode);
      this.trackPanNodes.set(trackId, panNode);
      this.trackAnalyserNodes.set(trackId, analyserNode);
    }
    return {
      gainNode: this.trackGainNodes.get(trackId)!,
      panNode: this.trackPanNodes.get(trackId)!,
      analyserNode: this.trackAnalyserNodes.get(trackId)!,
    };
  }

  public getTrackLevels(trackId: string): { left: number; right: number; peak: number } {
    const analyser = this.trackAnalyserNodes.get(trackId);
    const panNode = this.trackPanNodes.get(trackId);
    if (!analyser) return { left: 0, right: 0, peak: 0 };

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    let sum = 0;
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 255;
      sum += v * v;
      if (v > max) max = v;
    }
    const rms = Math.sqrt(sum / data.length);
    const pan = panNode?.pan ? panNode.pan.value : 0;
    const leftRatio = Math.max(0.1, Math.min(1, 1 - (pan > 0 ? pan * 0.7 : 0)));
    const rightRatio = Math.max(0.1, Math.min(1, 1 - (pan < 0 ? -pan * 0.7 : 0)));

    return {
      left: Math.min(1, rms * 2.2 * leftRatio),
      right: Math.min(1, rms * 2.2 * rightRatio),
      peak: max,
    };
  }

  public getMasterLevels(): { left: number; right: number; peak: number } {
    if (!this.masterAnalyser) return { left: 0, right: 0, peak: 0 };
    const data = new Uint8Array(this.masterAnalyser.frequencyBinCount);
    this.masterAnalyser.getByteFrequencyData(data);
    let sum = 0;
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 255;
      sum += v * v;
      if (v > max) max = v;
    }
    const rms = Math.sqrt(sum / data.length);
    return {
      left: Math.min(1, rms * 2.0),
      right: Math.min(1, rms * 2.0),
      peak: max,
    };
  }

  public setMasterVolume(volume: number) {
    if (!this.masterGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1.5, volume)), now + 0.02);
  }

  public setMasterMute(muted: boolean) {
    if (!this.masterGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : 0.85, now + 0.02);
  }

  public updateTrackRouting(tracks: VoiceTrack[]) {
    const hasAnySolo = tracks.some((t) => t.solo);

    for (const track of tracks) {
      const { gainNode, panNode } = this.getOrCreateTrackBus(track.id);
      const baseVol = typeof track.volume === 'number' && !Number.isNaN(track.volume) ? track.volume : 0.85;
      let effectiveGain = baseVol;

      if (track.muted) {
        effectiveGain = 0;
      } else if (hasAnySolo && !track.solo) {
        effectiveGain = 0;
      }

      const ctx = this.init();
      const now = ctx.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(effectiveGain, now + 0.02);

      if (panNode.pan) {
        const panVal = typeof track.pan === 'number' && !Number.isNaN(track.pan) ? track.pan : 0;
        panNode.pan.cancelScheduledValues(now);
        panNode.pan.setValueAtTime(panVal, now);
      }
    }
  }

  // Play single note preview on user touch or click
  public playPreviewNote(midi: number, durationSeconds: number = 0.8) {
    if (typeof midi !== 'number' || Number.isNaN(midi) || midi <= 0) return;
    const ctx = this.init();
    this.unlock();
    const now = ctx.currentTime;
    const dest = this.dryGain || ctx.destination;

    if (this.soundEngineType === 'piano') {
      this.playPianoNote(ctx, dest, midi, now, durationSeconds);
    } else {
      this.synthesizeStringsVoice(ctx, dest, midi, now, durationSeconds);
    }
  }

  // Plays note using real Salamander Grand Piano audio sample (with pitch shifting), or FM model fallback
  private playPianoNote(
    ctx: AudioContext,
    destination: AudioNode,
    midi: number,
    startTime: number,
    duration: number
  ) {
    if (typeof midi !== 'number' || Number.isNaN(midi) || midi <= 0) return;
    const safeDuration = Math.max(0.12, typeof duration === 'number' && !Number.isNaN(duration) ? duration : 0.8);

    // Find closest available sample in map
    let closest = SALAMANDER_SAMPLES[0];
    let minDiff = Math.abs(SALAMANDER_SAMPLES[0].midi - midi);
    for (const s of SALAMANDER_SAMPLES) {
      const diff = Math.abs(s.midi - midi);
      if (diff < minDiff) {
        minDiff = diff;
        closest = s;
      }
    }

    const cachedBuffer = this.sampleBuffers.get(closest.name);
    const safeStartTime = Math.max(ctx.currentTime + 0.005, typeof startTime === 'number' && !Number.isNaN(startTime) ? startTime : ctx.currentTime + 0.005);

    if (cachedBuffer) {
      // Play real recorded acoustic grand piano sample
      const source = ctx.createBufferSource();
      source.buffer = cachedBuffer;

      // Pitch shift relative to recorded base pitch
      const pitchRatio = Math.pow(2, (midi - closest.midi) / 12);
      source.playbackRate.setValueAtTime(pitchRatio, safeStartTime);

      const voiceGain = ctx.createGain();
      voiceGain.connect(destination);

      // Acoustic envelope with smooth release
      voiceGain.gain.setValueAtTime(0.0001, safeStartTime);
      voiceGain.gain.linearRampToValueAtTime(0.75, safeStartTime + 0.008);
      voiceGain.gain.setValueAtTime(0.7, safeStartTime + safeDuration * 0.8);
      voiceGain.gain.exponentialRampToValueAtTime(0.0001, safeStartTime + safeDuration + 0.4);

      source.connect(voiceGain);
      source.start(safeStartTime);
      source.stop(safeStartTime + safeDuration + 0.45);

      this.activeOscillators.push({
        stop: (t) => {
          try {
            voiceGain.gain.cancelScheduledValues(t);
            voiceGain.gain.linearRampToValueAtTime(0.0001, t + 0.03);
            source.stop(t + 0.04);
          } catch {}
        },
      });
    } else {
      // If sample is currently loading or offline, trigger background fetch and use acoustic FM synthesis
      this.fetchSample(closest.name);
      this.synthesizePianoVoice(ctx, destination, midi, safeStartTime, safeDuration);
    }
  }

  // Piano FM Synthesis Model: Hammer transient, fundamental, overtone decay (instantaneous fallback)
  private synthesizePianoVoice(
    ctx: AudioContext,
    destination: AudioNode,
    midi: number,
    startTime: number,
    duration: number
  ) {
    const freq = midiToFrequency(midi);
    const voiceGain = ctx.createGain();
    voiceGain.connect(destination);

    // Dynamic envelope
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(0.35, startTime + 0.006);
    voiceGain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.08);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    // Fundamental & Harmonics
    const osc1 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, startTime);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, startTime);
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.2, startTime);
    osc2Gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration * 0.7);
    osc2.connect(osc2Gain);
    osc2Gain.connect(voiceGain);

    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 3, startTime);
    const osc3Gain = ctx.createGain();
    osc3Gain.gain.setValueAtTime(0.08, startTime);
    osc3Gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.4);
    osc3.connect(osc3Gain);
    osc3Gain.connect(voiceGain);

    // Warm Low-pass soundboard filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(freq * 5, 5500), startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.min(freq * 2, 2200), startTime + duration);

    osc1.connect(filter);
    filter.connect(voiceGain);

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);

    const stopTime = startTime + duration + 0.05;
    osc1.stop(stopTime);
    osc2.stop(stopTime);
    osc3.stop(stopTime);

    this.activeOscillators.push({
      stop: (t) => {
        try {
          voiceGain.gain.cancelScheduledValues(t);
          voiceGain.gain.linearRampToValueAtTime(0.0001, t + 0.03);
          osc1.stop(t + 0.04);
          osc2.stop(t + 0.04);
          osc3.stop(t + 0.04);
        } catch {}
      },
    });
  }

  // Symphonic Strings Model: Detuned bowed multi-saw with natural LFO vibrato
  private synthesizeStringsVoice(
    ctx: AudioContext,
    destination: AudioNode,
    midi: number,
    startTime: number,
    duration: number
  ) {
    const freq = midiToFrequency(midi);
    const voiceGain = ctx.createGain();
    voiceGain.connect(destination);

    // Bowed envelope: smooth attack, warm sustain, gentle release
    const attack = 0.09;
    const release = 0.15;
    voiceGain.gain.setValueAtTime(0.0001, startTime);
    voiceGain.gain.linearRampToValueAtTime(0.25, startTime + attack);
    voiceGain.gain.setValueAtTime(0.24, Math.max(startTime + attack, startTime + duration - release));
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + release);

    // Bow warmth acoustic filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, startTime);
    filter.Q.setValueAtTime(1.2, startTime);
    filter.connect(voiceGain);

    // Vibrato LFO (5.3 Hz)
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(5.3, startTime);
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0, startTime);
    lfoGain.gain.linearRampToValueAtTime(4.5, startTime + 0.25);
    lfo.connect(lfoGain);

    // 3 Detuned Ensemble Oscillators (Violin / Viola chorus effect)
    const detunes = [-8, 0, 8];
    const oscs: OscillatorNode[] = [];

    detunes.forEach((cents) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.detune.setValueAtTime(cents, startTime);
      lfoGain.connect(osc.detune);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.33, startTime);
      osc.connect(oscGain);
      oscGain.connect(filter);
      oscs.push(osc);
    });

    lfo.start(startTime);
    oscs.forEach((o) => o.start(startTime));

    const stopTime = startTime + duration + release + 0.05;
    lfo.stop(stopTime);
    oscs.forEach((o) => o.stop(stopTime));

    this.activeOscillators.push({
      stop: (t) => {
        try {
          voiceGain.gain.cancelScheduledValues(t);
          voiceGain.gain.linearRampToValueAtTime(0.0001, t + 0.04);
          lfo.stop(t + 0.05);
          oscs.forEach((o) => o.stop(t + 0.05));
        } catch {}
      },
    });
  }

  // Schedule full multi-track polyphonic timeline
  public schedulePlayback(
    tracks: VoiceTrack[],
    startBeat: number,
    bpm: number,
    onBeatProgress: (beat: number) => void,
    onPlaybackEnded: () => void
  ) {
    this.stopPlayback();
    const ctx = this.init();
    this.unlock();

    this.updateTrackRouting(tracks);

    const secondsPerBeat = 60 / bpm;
    const now = ctx.currentTime;
    const startTime = now + 0.06;

    let maxBeat = 0;

    for (const track of tracks) {
      const { gainNode } = this.getOrCreateTrackBus(track.id);

      for (const note of track.notes) {
        if (note.beat < startBeat) continue;
        if (note.isRest || typeof note.midi !== 'number' || Number.isNaN(note.midi) || note.midi <= 0) continue;

        const noteStartTime = startTime + (note.beat - startBeat) * secondsPerBeat;
        const noteDurationSeconds = Math.max(0.15, note.duration * secondsPerBeat * 0.95);
        const endBeat = note.beat + note.duration;
        if (endBeat > maxBeat) {
          maxBeat = endBeat;
        }

        if (this.soundEngineType === 'piano') {
          this.playPianoNote(ctx, gainNode, note.midi, noteStartTime, noteDurationSeconds);
        } else {
          this.synthesizeStringsVoice(ctx, gainNode, note.midi, noteStartTime, noteDurationSeconds);
        }
      }
    }

    // Animated playhead loop
    const trackPlayhead = () => {
      if (!this.ctx) return;
      const elapsed = this.ctx.currentTime - startTime;
      const currentBeat = startBeat + elapsed / secondsPerBeat;

      if (currentBeat <= maxBeat) {
        onBeatProgress(currentBeat);
        this.animationFrameId = requestAnimationFrame(trackPlayhead);
      } else {
        onBeatProgress(maxBeat);
        onPlaybackEnded();
      }
    };

    this.animationFrameId = requestAnimationFrame(trackPlayhead);
  }

  // Play an individual track solo (e.g. audition a generated counterpoint line)
  public playSingleTrack(
    track: VoiceTrack,
    bpm: number,
    onBeatProgress?: (beat: number) => void,
    onPlaybackEnded?: () => void
  ) {
    this.stopPlayback();
    const ctx = this.init();
    this.unlock();

    if (!track.notes || track.notes.length === 0) {
      if (onPlaybackEnded) onPlaybackEnded();
      return;
    }

    // Ensure audio bus is unmuted and centered for solo audition
    const { gainNode, panNode } = this.getOrCreateTrackBus(track.id);
    const now = ctx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(0.85, now);
    if (panNode.pan) {
      panNode.pan.cancelScheduledValues(now);
      panNode.pan.setValueAtTime(0, now);
    }

    const secondsPerBeat = 60 / bpm;
    const startTime = now + 0.05;

    // Normalize so first note begins immediately
    const firstBeat = Math.min(...track.notes.map((n) => n.beat));
    const startOffsetBeat = Number.isFinite(firstBeat) ? firstBeat : 0;
    let maxBeat = 0;

    for (const note of track.notes) {
      if (note.isRest || typeof note.midi !== 'number' || Number.isNaN(note.midi) || note.midi <= 0) continue;
      const relBeat = note.beat - startOffsetBeat;
      const noteStartTime = startTime + relBeat * secondsPerBeat;
      const noteDurationSeconds = Math.max(0.18, note.duration * secondsPerBeat * 0.95);
      const endBeat = note.beat + note.duration;
      if (endBeat > maxBeat) {
        maxBeat = endBeat;
      }

      if (this.soundEngineType === 'piano') {
        this.playPianoNote(ctx, gainNode, note.midi, noteStartTime, noteDurationSeconds);
      } else {
        this.synthesizeStringsVoice(ctx, gainNode, note.midi, noteStartTime, noteDurationSeconds);
      }
    }

    if (maxBeat === 0) {
      if (onPlaybackEnded) onPlaybackEnded();
      return;
    }

    const trackPlayhead = () => {
      if (!this.ctx) return;
      const elapsed = this.ctx.currentTime - startTime;
      const currentBeat = elapsed / secondsPerBeat;

      if (currentBeat <= maxBeat) {
        if (onBeatProgress) onBeatProgress(currentBeat);
        this.animationFrameId = requestAnimationFrame(trackPlayhead);
      } else {
        if (onBeatProgress) onBeatProgress(maxBeat);
        if (onPlaybackEnded) onPlaybackEnded();
      }
    };

    this.animationFrameId = requestAnimationFrame(trackPlayhead);
  }

  public stopPlayback() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.ctx) {
      const now = this.ctx.currentTime;
      this.activeOscillators.forEach((osc) => {
        try {
          osc.stop(now);
        } catch {}
      });
    }
    this.activeOscillators = [];
  }
}

// Global audio engine singleton
export const globalAudioEngine = new AudioEngine();
