import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  CounterpointConfig,
  CounterpointStyle,
  HarmonicAnalysisStep,
  NoteEvent,
  SoundEngineType,
  SpeciesType,
  VoiceRole,
  VoiceTrack,
} from './types/music.ts';
import {
  CANONICAL_PRESETS,
  generateCounterpointTracks,
  generateSingleCounterpointLine,
  midiToNoteName,
  performHarmonicAnalysis,
  VOICE_RANGES,
  analyzeMelody,
} from './algorithms/counterpoint.ts';
import { globalAudioEngine } from './audio/AudioEngine.ts';
import { TransportBar } from './components/TransportBar.tsx';
import { DawControlRibbon } from './components/DawControlRibbon.tsx';
import { MidiEditPalette } from './components/MidiEditPalette.tsx';
import { ArrangerTimeline } from './components/ArrangerTimeline.tsx';
import { MixerConsole } from './components/MixerConsole.tsx';
import { InteractiveStaff } from './components/InteractiveStaff.tsx';
import { TouchNoteBar } from './components/TouchNoteBar.tsx';
import { HarmonicAnalysis } from './components/HarmonicAnalysis.tsx';
import { MelodyAnalysisCard } from './components/MelodyAnalysisCard.tsx';
import { MobileBottomNav, MobileTab } from './components/MobileBottomNav.tsx';
import { VirtualKeyboard } from './components/VirtualKeyboard.tsx';

export default function App() {
  // Contrapuntal Configuration (Default: 4-Voice SATB in D Dorian)
  const [config, setConfig] = useState<CounterpointConfig>({
    style: 'bach',
    species: 'chorale',
    voiceCount: 4,
    cfPosition: 'tenor',
    key: 'D',
    mode: 'dorian',
    tempo: 96,
  });

  const [soundEngine, setSoundEngine] = useState<SoundEngineType>('piano');
  const [selectedDuration, setSelectedDuration] = useState<number>(2); // 2 = half note, 1 = quarter, 4 = whole, 0.5 = eighth
  const [isRestMode, setIsRestMode] = useState<boolean>(false);

  // Master Volume & Mute
  const [masterVolume, setMasterVolume] = useState<number>(1.0);
  const [isMasterMuted, setIsMasterMuted] = useState<boolean>(false);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [auditioningTrackId, setAuditioningTrackId] = useState<string | null>(null);
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Selection state for per-track row MIDI editing
  const [selectedTrackId, setSelectedTrackId] = useState<string>('track-cf');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // UI Toggles
  const [showStaffEditor, setShowStaffEditor] = useState<boolean>(false);
  const [showTheoryInspector, setShowTheoryInspector] = useState<boolean>(false);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState<boolean>(true);
  const [mobileTab, setMobileTab] = useState<MobileTab>('mixer');

  // Initialize with Fux Dorian theme so DAW tracks are immediately populated (Logic Pro layout)
  const initialTracks = useMemo<VoiceTrack[]>(() => {
    const fuxPreset = CANONICAL_PRESETS[0];
    let beat = 0;
    const cfNotes: NoteEvent[] = fuxPreset.notes.map((n, idx) => {
      const b = beat;
      beat += n.duration;
      const { name, octave } = midiToNoteName(n.midi);
      return {
        id: `cf-note-${idx}`,
        midi: n.midi,
        pitchName: name,
        octave,
        beat: b,
        duration: n.duration,
      };
    });

    const cfTrack: VoiceTrack = {
      id: 'track-cf',
      trackNumber: 1,
      name: 'Cantus Firmus (Theme)',
      voiceRole: 'tenor',
      clef: 'bass',
      color: '#EAB308', // Logic Pro Track 1 Gold
      isCantusFirmus: true,
      notes: cfNotes,
      volume: 0.9,
      pan: 0,
      muted: false,
      solo: false,
    };

    const initialConfig: CounterpointConfig = {
      style: 'bach',
      species: 'chorale',
      voiceCount: 4,
      cfPosition: 'tenor',
      key: 'D',
      mode: 'dorian',
      tempo: 96,
    };

    return generateCounterpointTracks(cfTrack, initialConfig);
  }, []);

  const [tracks, setTracks] = useState<VoiceTrack[]>(initialTracks);
  const tracksRef = useRef<VoiceTrack[]>(tracks);
  useEffect(() => {
    tracksRef.current = tracks;
  }, [tracks]);

  // Undo & Redo History Stacks
  const [undoStack, setUndoStack] = useState<VoiceTrack[][]>([]);
  const [redoStack, setRedoStack] = useState<VoiceTrack[][]>([]);

  // Push new state to history and update tracks
  const pushTracksState = useCallback((newTracks: VoiceTrack[], clearRedo: boolean = true) => {
    setUndoStack((prev) => [...prev.slice(-40), tracksRef.current]);
    if (clearRedo) {
      setRedoStack([]);
    }
    setTracks(newTracks);
    tracksRef.current = newTracks;
    globalAudioEngine.updateTrackRouting(newTracks);
  }, []);

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, tracksRef.current]);
    setTracks(previous);
    tracksRef.current = previous;
    setSelectedNoteId(null);
    globalAudioEngine.updateTrackRouting(previous);
  }, [undoStack]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, tracksRef.current]);
    setTracks(next);
    tracksRef.current = next;
    setSelectedNoteId(null);
    globalAudioEngine.updateTrackRouting(next);
  }, [redoStack]);

  // Find Cantus Firmus Track
  const cfTrack = tracks.find((t) => t.isCantusFirmus) || tracks[0];

  // Currently selected note object
  const selectedNoteInfo = useMemo(() => {
    if (!selectedNoteId) return null;
    const targetTrack = tracks.find((t) => t.id === selectedTrackId);
    if (!targetTrack) return null;
    const note = targetTrack.notes.find((n) => n.id === selectedNoteId);
    if (!note) return null;
    return { trackId: targetTrack.id, note };
  }, [tracks, selectedTrackId, selectedNoteId]);

  // Automated Musical Analysis of User Input Melody
  const melodyAnalysis = useMemo(() => {
    return analyzeMelody(cfTrack ? cfTrack.notes : []);
  }, [cfTrack]);

  // Calculate total beats across all tracks
  const totalBeats = useMemo(() => {
    let max = 0;
    tracks.forEach((t) => {
      t.notes.forEach((n) => {
        const end = n.beat + n.duration;
        if (end > max) max = end;
      });
    });
    return Math.max(8, max);
  }, [tracks]);

  // Harmonic analysis derivation (Intervals & Rules)
  const analysis = useMemo(() => {
    return performHarmonicAnalysis(tracks);
  }, [tracks]);

  // Playback scheduler using latest tracks
  const startPlaybackAtBeat = useCallback((startBeat: number) => {
    setAuditioningTrackId(null);
    globalAudioEngine.unlock();
    setIsPlaying(true);
    setCurrentBeat(startBeat);

    const activeTracks = tracksRef.current;
    globalAudioEngine.schedulePlayback(
      activeTracks,
      startBeat,
      config.tempo,
      (beat) => {
        setCurrentBeat(beat);
      },
      () => {
        if (isLooping) {
          setCurrentBeat(0);
          startPlaybackAtBeat(0);
        } else {
          setIsPlaying(false);
          setCurrentBeat(0);
        }
      }
    );
  }, [config.tempo, isLooping]);

  // Transport Handlers
  const handlePlay = () => {
    const startBeat = currentBeat >= totalBeats ? 0 : currentBeat;
    startPlaybackAtBeat(startBeat);
  };

  const handlePause = () => {
    globalAudioEngine.stopPlayback();
    setIsPlaying(false);
    setAuditioningTrackId(null);
  };

  const handleStop = () => {
    globalAudioEngine.stopPlayback();
    setIsPlaying(false);
    setAuditioningTrackId(null);
    setCurrentBeat(0);
  };

  const handleSeekBeat = (beat: number) => {
    setCurrentBeat(beat);
    if (isPlaying) {
      startPlaybackAtBeat(beat);
    }
  };

  // Sound Engine Change
  const handleSoundEngineChange = (engine: SoundEngineType) => {
    setSoundEngine(engine);
    globalAudioEngine.setSoundEngine(engine);
  };

  // Preview Pitch Sound on touch/click
  const handlePreviewPitch = (midi: number) => {
    globalAudioEngine.playPreviewNote(midi, 0.7);
  };

  // Audition / Solo Play a single track directly
  const handlePlayTrack = useCallback((track: VoiceTrack) => {
    if (auditioningTrackId === track.id) {
      globalAudioEngine.stopPlayback();
      setAuditioningTrackId(null);
      setIsPlaying(false);
      return;
    }

    setIsPlaying(false);
    setAuditioningTrackId(track.id);
    globalAudioEngine.unlock();

    globalAudioEngine.playSingleTrack(
      track,
      config.tempo,
      (beat) => {
        setCurrentBeat(beat);
      },
      () => {
        setAuditioningTrackId(null);
        setCurrentBeat(0);
      }
    );
  }, [auditioningTrackId, config.tempo]);

  // Track Mix Handlers (Mute, Solo, Volume, Pan)
  const handleToggleMute = (trackId: string) => {
    setTracks((prev) => {
      const updated = prev.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t));
      tracksRef.current = updated;
      globalAudioEngine.updateTrackRouting(updated);
      return updated;
    });
  };

  const handleToggleSolo = (trackId: string) => {
    setTracks((prev) => {
      const updated = prev.map((t) => (t.id === trackId ? { ...t, solo: !t.solo } : t));
      tracksRef.current = updated;
      globalAudioEngine.updateTrackRouting(updated);
      return updated;
    });
  };

  const handleVolumeChange = (trackId: string, volume: number) => {
    setTracks((prev) => {
      const updated = prev.map((t) => (t.id === trackId ? { ...t, volume } : t));
      tracksRef.current = updated;
      globalAudioEngine.updateTrackRouting(updated);
      return updated;
    });
  };

  const handlePanChange = (trackId: string, pan: number) => {
    setTracks((prev) => {
      const updated = prev.map((t) => (t.id === trackId ? { ...t, pan } : t));
      tracksRef.current = updated;
      globalAudioEngine.updateTrackRouting(updated);
      return updated;
    });
  };

  const handleMasterVolumeChange = (volume: number) => {
    setMasterVolume(volume);
    globalAudioEngine.setMasterVolume(volume);
  };

  const handleToggleMasterMute = () => {
    setIsMasterMuted((prev) => {
      const next = !prev;
      globalAudioEngine.setMasterMute(next);
      return next;
    });
  };

  const handleResetAllMuteSolo = () => {
    setTracks((prev) => {
      const updated = prev.map((t) => ({ ...t, muted: false, solo: false }));
      tracksRef.current = updated;
      globalAudioEngine.updateTrackRouting(updated);
      return updated;
    });
    setIsMasterMuted(false);
    globalAudioEngine.setMasterMute(false);
  };

  // ==========================================
  // NEW NOTE MANIPULATION ALGORITHMS PER ROW
  // ==========================================

  // 1. Insert Note or Rest at Beat on any selected Track Row
  const handleInsertNoteAtBeat = useCallback((trackId: string, beat: number, midiOverride?: number) => {
    const targetTrack = tracksRef.current.find((t) => t.id === trackId);
    if (!targetTrack) return;

    // Determine pitch
    const defaultMidi = VOICE_RANGES[targetTrack.voiceRole]?.defaultPitch || 60;
    const midi = typeof midiOverride === 'number' && !Number.isNaN(midiOverride) ? midiOverride : defaultMidi;
    const { name, octave } = midiToNoteName(midi);

    const newNoteId = `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newNote: NoteEvent = {
      id: newNoteId,
      midi,
      pitchName: name,
      octave,
      beat,
      duration: selectedDuration,
      isRest: isRestMode,
    };

    // Filter out any note overlapping the exact beat
    const existing = targetTrack.notes.filter((n) => Math.abs(n.beat - beat) > 0.01);
    const updatedNotes = [...existing, newNote].sort((a, b) => a.beat - b.beat);

    const updatedTracks = tracksRef.current.map((t) => (t.id === trackId ? { ...t, notes: updatedNotes } : t));
    pushTracksState(updatedTracks);
    setSelectedTrackId(trackId);
    setSelectedNoteId(newNoteId);

    if (!isRestMode) {
      globalAudioEngine.playPreviewNote(midi, 0.6);
    }
  }, [selectedDuration, isRestMode, pushTracksState]);

  // 2. Insert Note or Rest at Current Playhead Cursor
  const handleInsertAtPlayhead = useCallback((midi: number) => {
    const snappedBeat = Math.round(currentBeat * 2) / 2;
    handleInsertNoteAtBeat(selectedTrackId, snappedBeat, midi);
  }, [currentBeat, selectedTrackId, handleInsertNoteAtBeat]);

  // 3. Modify Currently Selected Note
  const handleModifySelectedNote = useCallback((updates: Partial<NoteEvent>) => {
    if (!selectedNoteId) return;

    const updatedTracks = tracksRef.current.map((track) => {
      if (track.id !== selectedTrackId) return track;

      const updatedNotes = track.notes.map((note) => {
        if (note.id !== selectedNoteId) return note;

        let newMidi = updates.midi !== undefined ? updates.midi : note.midi;
        let newName = note.pitchName;
        let newOctave = note.octave;

        if (updates.midi !== undefined) {
          const parsed = midiToNoteName(newMidi);
          newName = parsed.name;
          newOctave = parsed.octave;
        }

        return {
          ...note,
          ...updates,
          midi: newMidi,
          pitchName: newName,
          octave: newOctave,
        };
      }).sort((a, b) => a.beat - b.beat);

      return { ...track, notes: updatedNotes };
    });

    pushTracksState(updatedTracks);
  }, [selectedTrackId, selectedNoteId, pushTracksState]);

  // 4. Delete Specific Note from a Track Row
  const handleDeleteNote = useCallback((trackId: string, noteId: string) => {
    const updatedTracks = tracksRef.current.map((track) => {
      if (track.id !== trackId) return track;
      return { ...track, notes: track.notes.filter((n) => n.id !== noteId) };
    });

    if (selectedNoteId === noteId) {
      setSelectedNoteId(null);
    }

    pushTracksState(updatedTracks);
  }, [selectedNoteId, pushTracksState]);

  // 5. Delete Currently Selected Note
  const handleDeleteSelectedNote = useCallback(() => {
    if (!selectedNoteId) return;
    handleDeleteNote(selectedTrackId, selectedNoteId);
  }, [selectedTrackId, selectedNoteId, handleDeleteNote]);

  // 6. Cantus Firmus Note Editing Handlers (Compatibility with Staff Drawer)
  const handleAddOrUpdateCfNote = (noteData: { midi: number; beat: number; duration: number }) => {
    if (noteData.beat === -1) {
      setSelectedDuration(noteData.duration);
      return;
    }
    handleInsertNoteAtBeat(cfTrack.id, noteData.beat, noteData.midi);
  };

  const handleDeleteCfNote = (noteId: string) => {
    handleDeleteNote(cfTrack.id, noteId);
  };

  const handleAppendCfNote = (midi: number, duration: number) => {
    let nextBeat = 0;
    if (cfTrack.notes.length > 0) {
      const last = cfTrack.notes[cfTrack.notes.length - 1];
      nextBeat = last.beat + last.duration;
    }
    handleInsertNoteAtBeat(cfTrack.id, nextBeat, midi);
  };

  const handleRemoveLastCfNote = () => {
    if (!cfTrack || cfTrack.notes.length === 0) return;
    const lastNote = cfTrack.notes[cfTrack.notes.length - 1];
    handleDeleteNote(cfTrack.id, lastNote.id);
  };

  // 7. Virtual Keyboard Input into Cantus Firmus
  const handleInsertNoteIntoCfFromKeyboard = useCallback((midi: number, duration: number, isRest: boolean = false) => {
    const currentCf = tracksRef.current.find((t) => t.isCantusFirmus) || tracksRef.current[0];
    if (!currentCf) return;

    let insertBeat = currentBeat;
    if (insertBeat === 0 && currentCf.notes.length > 0) {
      const lastNote = currentCf.notes[currentCf.notes.length - 1];
      insertBeat = lastNote.beat + lastNote.duration;
    }

    const { name, octave } = midiToNoteName(midi);
    const newNoteId = `cf-note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newNote: NoteEvent = {
      id: newNoteId,
      midi,
      pitchName: name,
      octave,
      beat: insertBeat,
      duration,
      isRest,
    };

    const existing = currentCf.notes.filter((n) => Math.abs(n.beat - insertBeat) > 0.01);
    const updatedNotes = [...existing, newNote].sort((a, b) => a.beat - b.beat);

    const updatedTracks = tracksRef.current.map((t) => (t.id === currentCf.id ? { ...t, notes: updatedNotes } : t));
    pushTracksState(updatedTracks);
    setSelectedTrackId(currentCf.id);
    setSelectedNoteId(newNoteId);

    // Step-advance playhead smoothly forward
    setCurrentBeat(insertBeat + duration);
  }, [currentBeat, pushTracksState]);

  const handleRemoveLastNoteFromCfFromKeyboard = useCallback(() => {
    const currentCf = tracksRef.current.find((t) => t.isCantusFirmus) || tracksRef.current[0];
    if (!currentCf || currentCf.notes.length === 0) return;

    const lastNote = currentCf.notes[currentCf.notes.length - 1];
    const updatedNotes = currentCf.notes.slice(0, -1);
    const updatedTracks = tracksRef.current.map((t) => (t.id === currentCf.id ? { ...t, notes: updatedNotes } : t));
    pushTracksState(updatedTracks);
    setCurrentBeat(lastNote.beat);
    setSelectedNoteId(null);
  }, [pushTracksState]);

  const handlePlayCfSolo = useCallback(() => {
    if (!cfTrack) return;
    handlePlayTrack(cfTrack);
  }, [cfTrack, handlePlayTrack]);

  // Generate Counterpoint Lines directly
  const handleGenerateCounterpoint = useCallback(() => {
    if (!cfTrack || cfTrack.notes.length === 0) return;
    setIsGenerating(true);

    setTimeout(() => {
      const newTracks = generateCounterpointTracks(cfTrack, config);
      pushTracksState(newTracks);
      if (isPlaying) {
        startPlaybackAtBeat(currentBeat);
      }
      setIsGenerating(false);
    }, 40);
  }, [cfTrack, config, isPlaying, currentBeat, startPlaybackAtBeat, pushTracksState]);

  // Analyze the given melody, auto-adapt key/mode and generate counterpoint
  const handleAnalyzeAndGenerate = useCallback(() => {
    if (!cfTrack || cfTrack.notes.length === 0) return;
    setIsGenerating(true);

    const analyzedRole =
      melodyAnalysis.recommendedCfRole === 'soprano'
        ? 'soprano'
        : melodyAnalysis.recommendedCfRole === 'bass'
        ? 'bass'
        : 'tenor';
    const newConfig: CounterpointConfig = {
      ...config,
      key: melodyAnalysis.detectedKey,
      mode: melodyAnalysis.detectedMode,
      cfPosition: analyzedRole,
    };
    setConfig(newConfig);

    setTimeout(() => {
      const newTracks = generateCounterpointTracks(cfTrack, newConfig);
      pushTracksState(newTracks);
      if (isPlaying) {
        startPlaybackAtBeat(currentBeat);
      }
      setIsGenerating(false);
    }, 50);
  }, [cfTrack, config, melodyAnalysis, isPlaying, currentBeat, startPlaybackAtBeat, pushTracksState]);

  // Add individual voice line (e.g. Soprano, Alto, Tenor, Bass)
  const handleAddVoiceLine = useCallback((role: VoiceRole) => {
    if (!cfTrack || cfTrack.notes.length === 0) return;
    setIsGenerating(true);

    setTimeout(() => {
      const currentTracks = tracksRef.current;
      const existingVoicesPitches: { [beat: number]: number[] } = {};
      for (const t of currentTracks) {
        for (const n of t.notes) {
          if (!existingVoicesPitches[n.beat]) existingVoicesPitches[n.beat] = [];
          existingVoicesPitches[n.beat].push(n.midi);
        }
      }

      const isAbove = role === 'soprano' || role === 'alto';
      const notes = generateSingleCounterpointLine(
        cfTrack.notes,
        config,
        role,
        isAbove,
        existingVoicesPitches
      );

      const colors: Record<VoiceRole, string> = {
        soprano: '#84CC16', // Lime
        alto: '#10B981',    // Emerald
        tenor: '#06B6D4',   // Cyan
        bass: '#8B5CF6',    // Purple
      };

      const roleLabels: Record<VoiceRole, string> = {
        soprano: 'Soprano',
        alto: 'Alto',
        tenor: 'Tenor',
        bass: 'Bass',
      };

      const countOfRole = currentTracks.filter((t) => t.voiceRole === role && !t.isCantusFirmus).length;
      const newTrack: VoiceTrack = {
        id: `track-${role}-${Date.now()}`,
        trackNumber: currentTracks.length + 1,
        name: `${roleLabels[role]} ${countOfRole > 0 ? `(${countOfRole + 1})` : 'Line'}`,
        voiceRole: role,
        clef: VOICE_RANGES[role].clef,
        color: colors[role],
        isCantusFirmus: false,
        notes,
        volume: 0.82,
        pan: role === 'soprano' ? -0.3 : role === 'bass' ? 0.3 : 0,
        muted: false,
        solo: false,
      };

      pushTracksState([...currentTracks, newTrack]);
      if (isPlaying) {
        startPlaybackAtBeat(currentBeat);
      }
      setIsGenerating(false);
    }, 40);
  }, [cfTrack, config, isPlaying, currentBeat, startPlaybackAtBeat, pushTracksState]);

  // Load Canonical Presets
  const handleLoadPreset = (index: number) => {
    const preset = CANONICAL_PRESETS[index];
    if (!preset) return;

    let beat = 0;
    const notes: NoteEvent[] = preset.notes.map((n, idx) => {
      const b = beat;
      beat += n.duration;
      const { name, octave } = midiToNoteName(n.midi);
      return {
        id: `preset-${index}-${idx}`,
        midi: n.midi,
        pitchName: name,
        octave,
        beat: b,
        duration: n.duration,
      };
    });

    const newConfig: CounterpointConfig = {
      ...config,
      key: preset.key,
      mode: preset.mode,
    };
    setConfig(newConfig);

    const updatedCf: VoiceTrack = {
      id: 'track-cf',
      trackNumber: 1,
      name: `Cantus Firmus (${preset.name.split(' ')[0]})`,
      voiceRole: 'tenor',
      clef: 'bass',
      color: '#EAB308',
      isCantusFirmus: true,
      notes,
      volume: 0.9,
      pan: 0,
      muted: false,
      solo: false,
    };

    const regenerated = generateCounterpointTracks(updatedCf, newConfig);
    pushTracksState(regenerated);
    setCurrentBeat(0);
  };

  // Clean Start: Clear all notes and begin fresh across tracks
  const handleCleanStart = useCallback(() => {
    handleStop();
    setAuditioningTrackId(null);
    setCurrentBeat(0);
    setSelectedNoteId(null);

    // Provide a fresh 4-track template with empty notes, ready for new composition
    const cleanTracks: VoiceTrack[] = [
      {
        id: 'track-cf',
        trackNumber: 1,
        name: 'Cantus Firmus (Theme)',
        voiceRole: 'tenor',
        clef: 'bass',
        color: '#EAB308', // Gold
        isCantusFirmus: true,
        notes: [],
        volume: 0.9,
        pan: 0,
        muted: false,
        solo: false,
      },
      {
        id: 'track-soprano',
        trackNumber: 2,
        name: 'Soprano',
        voiceRole: 'soprano',
        clef: 'treble',
        color: '#84CC16', // Lime
        isCantusFirmus: false,
        notes: [],
        volume: 0.85,
        pan: -0.3,
        muted: false,
        solo: false,
      },
      {
        id: 'track-alto',
        trackNumber: 3,
        name: 'Alto',
        voiceRole: 'alto',
        clef: 'treble',
        color: '#10B981', // Emerald
        isCantusFirmus: false,
        notes: [],
        volume: 0.85,
        pan: 0.3,
        muted: false,
        solo: false,
      },
      {
        id: 'track-bass',
        trackNumber: 4,
        name: 'Bass',
        voiceRole: 'bass',
        clef: 'bass',
        color: '#8B5CF6', // Purple
        isCantusFirmus: false,
        notes: [],
        volume: 0.85,
        pan: 0,
        muted: false,
        solo: false,
      },
    ];

    pushTracksState(cleanTracks);
    setSelectedTrackId('track-cf');
    setIsMasterMuted(false);
    globalAudioEngine.setMasterMute(false);
  }, [handleStop, pushTracksState]);

  // Clear only generated counterpoint lines
  const handleClearGenerated = () => {
    const cfOnly = tracks.filter((t) => t.isCantusFirmus);
    pushTracksState(cfOnly);
    setSelectedNoteId(null);
  };

  // Keyboard Shortcuts: Space (Play/Pause), Ctrl+Z (Undo), Ctrl+Y / Cmd+Shift+Z (Redo), Delete / Backspace (Delete Note), ArrowUp/Down (Pitch Shift)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      // Play / Pause
      if (e.code === 'Space') {
        e.preventDefault();
        if (isPlaying) {
          handlePause();
        } else {
          handlePlay();
        }
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Delete Note
      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedNoteId) {
          e.preventDefault();
          handleDeleteSelectedNote();
        }
        return;
      }

      // Arrow Pitch Shift
      if (selectedNoteInfo && !selectedNoteInfo.note.isRest) {
        if (e.code === 'ArrowUp') {
          e.preventDefault();
          const newMidi = selectedNoteInfo.note.midi + 1;
          const { name, octave } = midiToNoteName(newMidi);
          handleModifySelectedNote({ midi: newMidi, pitchName: name, octave });
          globalAudioEngine.playPreviewNote(newMidi, 0.5);
          return;
        }
        if (e.code === 'ArrowDown') {
          e.preventDefault();
          const newMidi = selectedNoteInfo.note.midi - 1;
          const { name, octave } = midiToNoteName(newMidi);
          handleModifySelectedNote({ midi: newMidi, pitchName: name, octave });
          globalAudioEngine.playPreviewNote(newMidi, 0.5);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPlaying,
    currentBeat,
    totalBeats,
    selectedNoteId,
    selectedNoteInfo,
    handleUndo,
    handleRedo,
    handleDeleteSelectedNote,
    handleModifySelectedNote,
  ]);

  const lastPitchMidi = cfTrack && cfTrack.notes.length > 0 ? cfTrack.notes[cfTrack.notes.length - 1].midi : 62;

  return (
    <div className="min-h-screen bg-[#0a0c12] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30">
      {/* 1. Main DAW Top Transport Bar */}
      <TransportBar
        isPlaying={isPlaying}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        isLooping={isLooping}
        onToggleLoop={() => setIsLooping(!isLooping)}
        tempo={config.tempo}
        onTempoChange={(bpm) => setConfig((c) => ({ ...c, tempo: bpm }))}
        currentBeat={currentBeat}
        totalBeats={totalBeats}
        soundEngine={soundEngine}
        onSoundEngineChange={handleSoundEngineChange}
        onLoadPreset={handleLoadPreset}
        onClear={handleCleanStart}
      />

      {/* 2. DAW Control Ribbon (Species, Styles, Voices, Key, 1-Click Generate, Clean Start) */}
      <DawControlRibbon
        config={config}
        onChangeConfig={setConfig}
        onGenerate={handleGenerateCounterpoint}
        onAnalyzeAndGenerate={handleAnalyzeAndGenerate}
        onAddVoiceLine={handleAddVoiceLine}
        onClearGenerated={handleClearGenerated}
        onCleanStart={handleCleanStart}
        isGenerating={isGenerating}
        hasCfNotes={cfTrack && cfTrack.notes.length > 0}
        melodyAnalysis={melodyAnalysis}
        activeTrackCount={tracks.length}
        showStaffEditor={showStaffEditor}
        onToggleStaffEditor={() => setShowStaffEditor(!showStaffEditor)}
        showTheoryInspector={showTheoryInspector}
        onToggleTheoryInspector={() => setShowTheoryInspector(!showTheoryInspector)}
        showVirtualKeyboard={showVirtualKeyboard}
        onToggleVirtualKeyboard={() => setShowVirtualKeyboard(!showVirtualKeyboard)}
      />

      {/* 3. COMMON DAW MIDI EDIT PALETTE ("common da tab": track selection, note/rest toggle, duration, step input, undo/redo) */}
      <MidiEditPalette
        tracks={tracks}
        activeTrackId={selectedTrackId}
        onSelectActiveTrack={(id) => {
          setSelectedTrackId(id);
          setSelectedNoteId(null);
        }}
        selectedDuration={selectedDuration}
        onSelectDuration={setSelectedDuration}
        isRestMode={isRestMode}
        onToggleRestMode={setIsRestMode}
        selectedNote={selectedNoteInfo}
        onInsertAtPlayhead={handleInsertAtPlayhead}
        onModifySelectedNote={handleModifySelectedNote}
        onDeleteSelectedNote={handleDeleteSelectedNote}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        undoCount={undoStack.length}
        currentBeat={currentBeat}
        onPreviewPitch={handlePreviewPitch}
      />

      {/* 4. Main DAW Workspace: Two-Tier Layout (Upper Arranger + Lower Mixer) */}
      <main className="flex-1 flex flex-col min-h-0 bg-[#090b10] overflow-hidden">
        {/* UPPER VIEW: Multi-Track Arranger & Timeline View */}
        <div className="flex-1 min-h-[220px] max-h-[48vh] flex flex-col">
          <ArrangerTimeline
            tracks={tracks}
            currentBeat={currentBeat}
            totalBeats={totalBeats}
            isPlaying={isPlaying}
            auditioningTrackId={auditioningTrackId}
            harmonicAnalysis={analysis}
            selectedTrackId={selectedTrackId}
            selectedNoteId={selectedNoteId}
            onSelectTrack={(id) => {
              setSelectedTrackId(id);
            }}
            onSelectNote={(trackId, noteId) => {
              setSelectedTrackId(trackId);
              setSelectedNoteId(noteId);
            }}
            onInsertNoteAtBeat={handleInsertNoteAtBeat}
            onDeleteNote={handleDeleteNote}
            onSeekBeat={handleSeekBeat}
            onToggleMute={handleToggleMute}
            onToggleSolo={handleToggleSolo}
            onVolumeChange={handleVolumeChange}
            onPanChange={handlePanChange}
            onPlaySingleTrack={handlePlayTrack}
            onPreviewPitch={handlePreviewPitch}
          />
        </div>

        {/* OPTIONAL SLIDE-OUT DRAWER: Notation / Step Input or Rules Inspector */}
        {(showStaffEditor || showTheoryInspector) && (
          <div className="bg-[#0f121a] border-t border-b border-[#222738] p-3 shadow-xl max-h-72 overflow-y-auto">
            {showStaffEditor && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300 pb-1 border-b border-[#1f2536]">
                  <span className="font-bold text-sky-400">
                    Cantus Firmus Notation & Step Input Editor
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Click staff lines to add/move notes or use touch bar below
                  </span>
                </div>
                <InteractiveStaff
                  tracks={tracks}
                  cfTrack={cfTrack}
                  onAddOrUpdateCfNote={handleAddOrUpdateCfNote}
                  onDeleteCfNote={handleDeleteCfNote}
                  onPreviewPitch={handlePreviewPitch}
                  currentBeat={currentBeat}
                  totalBeats={totalBeats}
                  selectedDuration={selectedDuration}
                />
                <TouchNoteBar
                  onAppendNote={handleAppendCfNote}
                  onRemoveLastNote={handleRemoveLastCfNote}
                  onPreviewPitch={handlePreviewPitch}
                  selectedDuration={selectedDuration}
                  onSelectDuration={setSelectedDuration}
                  lastPitchMidi={lastPitchMidi}
                />
              </div>
            )}

            {showTheoryInspector && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <MelodyAnalysisCard
                  analysis={melodyAnalysis}
                  onApplyAndGenerate={handleAnalyzeAndGenerate}
                  isGenerating={isGenerating}
                  hasNotes={cfTrack.notes.length > 0}
                />
                <HarmonicAnalysis analysis={analysis} tracks={tracks} />
              </div>
            )}
          </div>
        )}

        {/* VIRTUAL PIANO KEYBOARD FOR CANTUS FIRMUS MELODY INPUT */}
        {showVirtualKeyboard && (
          <div className="shrink-0">
            <VirtualKeyboard
              cfTrack={cfTrack}
              onInsertNoteIntoCf={handleInsertNoteIntoCfFromKeyboard}
              onRemoveLastNoteFromCf={handleRemoveLastNoteFromCfFromKeyboard}
              onPlayCfTrack={handlePlayCfSolo}
              isPlayingCf={auditioningTrackId === cfTrack.id}
              selectedDuration={selectedDuration}
              onSelectDuration={setSelectedDuration}
              onPreviewPitch={handlePreviewPitch}
              onClose={() => setShowVirtualKeyboard(false)}
              onUndo={handleUndo}
              canUndo={undoStack.length > 0}
            />
          </div>
        )}

        {/* LOWER VIEW: Streamlined Mixer Console (Volume Faders, Dual LED Meters, Pan, Mute & Solo) */}
        <div className="shrink-0 bg-[#0c0e14]">
          <MixerConsole
            tracks={tracks}
            masterVolume={masterVolume}
            isMasterMuted={isMasterMuted}
            onVolumeChange={handleVolumeChange}
            onPanChange={handlePanChange}
            onToggleMute={handleToggleMute}
            onToggleSolo={handleToggleSolo}
            onMasterVolumeChange={handleMasterVolumeChange}
            onToggleMasterMute={handleToggleMasterMute}
            onResetAllMuteSolo={handleResetAllMuteSolo}
            isPlaying={isPlaying}
          />
        </div>
      </main>

      {/* Mobile Navigation (< 768px) */}
      <div className="block md:hidden">
        <MobileBottomNav
          activeTab={mobileTab}
          onSelectTab={(tab) => {
            setMobileTab(tab);
            if (tab === 'staff') {
              setShowStaffEditor(true);
              setShowTheoryInspector(false);
            } else if (tab === 'theory') {
              setShowStaffEditor(false);
              setShowTheoryInspector(true);
            } else {
              setShowStaffEditor(false);
              setShowTheoryInspector(false);
            }
          }}
          trackCount={tracks.length}
        />
      </div>
    </div>
  );
}
