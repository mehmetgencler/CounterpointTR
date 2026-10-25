# DAW Visual & Algorithmic Redesign Plan (Revised)
*(Streamlined Console: Volume Faders, Pan, Mute & Solo)*

## 1. Needs Assessment & Refinements

Based on user feedback, all **FX inserts** and **EQ display boxes** have been eliminated. The interface is streamlined to focus on an ultra-clean, tactile, and responsive DAW experience:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP: MULTI-TRACK ARRANGER & TIMELINE VIEW                                              │
├───────────────────┬────────────────────────────────────────────────────────────────────┤
│ Track Headers     │ Measure Ruler & Markers ("Chorus", Bars 1, 2, 3...)                │
│ [1] Cantus Firmus │ [████████ Waveform / MIDI Clip ████████]                           │
│ [2] Soprano Voice │ [════════ MIDI Note Clip ══════════════]                           │
│ [3] Alto Counter  │ [████████ Waveform / MIDI Clip ████████]                           │
│ [4] Tenor Voice   │ [════════ MIDI Note Clip ══════════════]                           │
│ [5] Bass Voice    │ [████████ Waveform / MIDI Clip ████████]                           │
│ [M] [S]  [Fader]  │                      │ Playhead                                    │
├───────────────────┴──────────────────────┴─────────────────────────────────────────────┤
│ BOTTOM: STREAMLINED CHANNEL STRIP MIXER CONSOLE                                        │
├───────────────┬───────────────┬───────────────┬───────────────┬────────────────────────┤
│ [1] Cantus    │ [2] Soprano   │ [3] Alto      │ [4] Tenor     │ [5] Bass               │
│ Role: Theme   │ Role: 1st Sp  │ Role: 2nd Sp  │ Role: 3rd Sp  │ Role: Root Bass        │
│               │               │               │               │                        │
│ [ Pan Knob ]  │ [ Pan Knob ]  │ [ Pan Knob ]  │ [ Pan Knob ]  │ [ Pan Knob ]           │
│   <  C  >     │   < -25 >     │   < +20 >     │   < -15 >     │   <  C  >              │
│               │               │               │               │                        │
│   -1.2 dB     │   -3.5 dB     │   -4.0 dB     │   -4.5 dB     │   -2.0 dB              │
│ ┌───┐ ┌─┐ ┌─┐ │ ┌───┐ ┌─┐ ┌─┐ │ ┌───┐ ┌─┐ ┌─┐ │ ┌───┐ ┌─┐ ┌─┐ │ ┌───┐ ┌─┐ ┌─┐          │
│ │   │ │█│ │█│ │ │   │ │█│ │█│ │ │   │ │█│ │█│ │ │   │ │█│ │█│ │ │   │ │█│ │█│          │
│ │ █ │ │█│ │█│ │ │ █ │ │█│ │█│ │ │ █ │ │█│ │█│ │ │ █ │ │█│ │█│ │ │ █ │ │█│ │█│          │
│ │   │ │█│ │█│ │ │   │ │█│ │█│ │ │   │ │█│ │█│ │ │   │ │█│ │█│ │ │   │ │█│ │█│          │
│ └───┘ └─┘ └─┘ │ └───┘ └─┘ └─┘ │ └───┘ └─┘ └─┘ │ └───┘ └─┘ └─┘ │ └───┘ └─┘ └─┘          │
│ [Vert Fader & │ [Vert Fader & │ [Vert Fader & │ [Vert Fader & │ [Vert Fader &          │
│  Dual Meters] │  Dual Meters] │  Dual Meters] │  Dual Meters] │  Dual Meters]          │
│               │               │               │               │                        │
│   [ M ] [ S ] │   [ M ] [ S ] │   [ M ] [ S ] │   [ M ] [ S ] │   [ M ] [ S ]          │
│ [Color Footer]│ [Color Footer]│ [Color Footer]│ [Color Footer]│ [Color Footer]         │
└───────────────┴───────────────┴───────────────┴───────────────┴────────────────────────┘
```

### Key UI Features:
1. **Upper Arranger / Timeline**:
   - Track headers showing track index badge (`1`, `2`, `3`…), voice name, `M` (Mute) & `S` (Solo) toggles, quick volume slider, rotary pan control, and assigned voice color strip.
   - Timeline grid with measure ruler, section marker labels, and smooth scrubbable playhead.
   - Rich clip regions displaying real-time rendered MIDI note bars (pitch height + duration) and audio waveform envelopes.
2. **Streamlined Lower Mixer Console**:
   - High-contrast, dark studio aesthetic (Logic Pro / Ableton style).
   - Track title and voice role (e.g. *Cantus Firmus*, *Soprano 1st Species*, *Alto 2nd Species*, *Tenor*, *Bass Foundation*).
   - Rotary Pan knob with illuminated green indicator arc and stereo position readout (`L50` to `R50`, `C`).
   - Tabular numeric gain readout (`0.0 dB`, `-3.5 dB`, etc.) with visual peak clipping detection.
   - Hardware-styled vertical volume fader handle on a calibrated dB track scale ($+6$ down to $-\infty$).
   - Dual-channel multi-segment stereo LED peak level meter flanking each fader (green $\rightarrow$ amber $\rightarrow$ red overload).
   - Bold, illuminated `M` (Mute) and `S` (Solo) buttons.
   - Track color accent footer matching the Arranger track color.

---

## 2. Algorithmic Voice Architecture

The contrapuntal algorithmic engine directly commands and populates the DAW tracks:

1. **Multi-Voice Track Assignment**:
   - **Track 1 (Gold)**: Cantus Firmus (Theme / Melody) — editable in piano roll or selectable from presets (Bach, Fux, Palestrina, Modern).
   - **Track 2 (Lime)**: Soprano Counter-Voice (Species 1–4 or Pandiatonic).
   - **Track 3 (Green)**: Alto Harmony (Consonant voice infill, contrary motion).
   - **Track 4 (Cyan)**: Tenor Voice (Stepwise connective counterpoint).
   - **Track 5 (Purple)**: Bass Line (Root harmonic grounding, cadential preparation).
2. **Algorithmic Rules & Capabilities**:
   - **Species Support**: First Species (1:1), Second Species (2:1), Third Species (4:1), Fourth Species (Suspensions 7-6, 4-3, 9-8), and Pandiatonic Modal.
   - **Real-Time Contrapuntal Linting**:
     - Parallel 5ths and 8ves detection.
     - Direct / hidden fifths/octaves warnings.
     - Voice crossing and spacing alerts ($>1$ octave between upper voices).
     - Leaps compensation (large leaps followed by stepwise reversal).
   - **One-Click Regenerate**: Regenerate individual voice tracks or all counterpoint voices simultaneously with smooth audio re-rendering.

---

## 3. Web Audio DSP Engine

- Direct, low-latency audio pipeline per track:
  $$\text{Voice Oscillator / Sampler} \longrightarrow \text{Stereo Panner Node} \longrightarrow \text{Gain Node (Fader)} \longrightarrow \text{Analyser Node} \longrightarrow \text{Master Limiter}$$
- Mute/Solo bus logic: When any track is Soloed, all non-soloed tracks are silenced. When Muted, gain drops smoothly to zero with ramped de-clicking.
- Real-time `AnalyserNode` frequency/time-domain data streams directly to the dual stereo LED meters via `requestAnimationFrame`.

---

## 4. Implementation Steps

1. **Update Data Types (`src/types/music.ts`)**:
   - Remove unused EQ/FX insert types.
   - Ensure clean `VoiceTrack` structure with `volume`, `pan`, `muted`, `soloed`, `notes`, `color`, and `role`.
2. **Streamline Mixer Console (`src/components/MixerConsole.tsx` & `src/components/ChannelStrip.tsx`)**:
   - Render streamlined channel strips: Pan knob, numeric dB readout, vertical volume fader, dual stereo LED peak meters, `M` & `S` buttons, and color footer.
3. **Build Upper Arranger & Track Headers (`src/components/ArrangerTimeline.tsx`)**:
   - Header with track info, `M`/`S` buttons, mini volume and pan.
   - Timeline with measure ruler, playhead, and MIDI/waveform clip rendering.
4. **Integrate Algorithmic Engine & Toolbar**:
   - Top transport bar with BPM, Key, Time Signature, Play/Pause/Loop, and quick "Generate Counterpoint" trigger.
   - Species selection and Bach/Pandiatonic mode toggles.
   - Real-time rule violation badges on clips.
5. **Verify & Test**:
   - Run tests (`counterpoint.test.ts`), compile applet, and verify interactive playback, solo/mute behavior, and live metering.
