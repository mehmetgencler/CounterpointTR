import React, { useRef, useState } from 'react';
import { NoteEvent, VoiceTrack } from '../types/music.ts';
import { midiToNoteName, NOTE_NAMES } from '../algorithms/counterpoint.ts';

interface InteractiveStaffProps {
  tracks: VoiceTrack[];
  cfTrack: VoiceTrack;
  onAddOrUpdateCfNote: (note: { midi: number; beat: number; duration: number }) => void;
  onDeleteCfNote: (noteId: string) => void;
  onPreviewPitch: (midi: number) => void;
  currentBeat: number;
  totalBeats: number;
  selectedDuration: number;
}

// Convert MIDI note to diatonic scale step (C0 = 0, D0 = 1, E0 = 2, F0 = 3, G0 = 4, A0 = 5, B0 = 6 ...)
function midiToDiatonicStep(midi: number): { step: number; isAccidental: boolean; accidentalType?: '#' | 'b' } {
  const octave = Math.floor(midi / 12) - 1;
  const pc = ((midi % 12) + 12) % 12;

  // Diatonic mapping in C:
  // 0: C, 1: C#, 2: D, 3: D#, 4: E, 5: F, 6: F#, 7: G, 8: G#, 9: A, 10: A#, 11: B
  const diatonicOffset = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
  const isSharp = [false, true, false, true, false, false, true, false, true, false, true, false];

  const step = octave * 7 + diatonicOffset[pc];
  return {
    step,
    isAccidental: isSharp[pc],
    accidentalType: isSharp[pc] ? '#' : undefined,
  };
}

export const InteractiveStaff: React.FC<InteractiveStaffProps> = ({
  tracks,
  cfTrack,
  onAddOrUpdateCfNote,
  onDeleteCfNote,
  onPreviewPitch,
  currentBeat,
  totalBeats,
  selectedDuration,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoveredPitch, setHoveredPitch] = useState<{ midi: number; beat: number; x: number; y: number } | null>(null);

  // Staff Geometry
  const lineSpacing = 13; // Distance between staff lines
  const stepHeight = lineSpacing / 2; // Step height (line to space)
  const beatWidth = 56; // Horizontal pixels per beat
  const startX = 70; // X offset after clefs
  const totalWidth = Math.max(800, startX + Math.max(totalBeats + 4, 16) * beatWidth);

  // Staves vertical positions
  const trebleTopLineY = 75; // F5 is top line of treble staff (step 38)
  const trebleBottomLineY = trebleTopLineY + lineSpacing * 4; // E4 is bottom line (step 30)
  const bassTopLineY = 195; // A3 is top line of bass staff (step 25)
  const bassBottomLineY = bassTopLineY + lineSpacing * 4; // G2 is bottom line (step 17)

  // Calculate Y position for a given MIDI pitch
  const getYForMidi = (midi: number): number => {
    const { step } = midiToDiatonicStep(midi);

    if (midi >= 60) {
      // Treble Clef reference: E4 (step 30) is at trebleBottomLineY
      const stepDiff = step - 30;
      return trebleBottomLineY - stepDiff * stepHeight;
    } else {
      // Bass Clef reference: G2 (step 17) is at bassBottomLineY
      const stepDiff = step - 17;
      return bassBottomLineY - stepDiff * stepHeight;
    }
  };

  // Convert SVG coordinate back to MIDI note and beat on click/tap
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (clickX < startX) return;

    // Calculate clicked beat (snapped to whole or half beat)
    const rawBeat = (clickX - startX) / beatWidth;
    const snappedBeat = Math.max(0, Math.floor(rawBeat / selectedDuration) * selectedDuration);

    // Calculate clicked diatonic step from Y
    let clickedMidi = 62; // Default D4
    if (clickY < 155) {
      // Treble realm: Reference E4 = step 30 at trebleBottomLineY
      const stepDiff = Math.round((trebleBottomLineY - clickY) / stepHeight);
      const targetStep = 30 + stepDiff;
      clickedMidi = diatonicStepToMidi(targetStep);
    } else {
      // Bass realm: Reference G2 = step 17 at bassBottomLineY
      const stepDiff = Math.round((bassBottomLineY - clickY) / stepHeight);
      const targetStep = 17 + stepDiff;
      clickedMidi = diatonicStepToMidi(targetStep);
    }

    onPreviewPitch(clickedMidi);
    onAddOrUpdateCfNote({
      midi: clickedMidi,
      beat: snappedBeat,
      duration: selectedDuration,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (clickX < startX || clickX > totalWidth - 20) {
      setHoveredPitch(null);
      return;
    }

    const rawBeat = (clickX - startX) / beatWidth;
    const snappedBeat = Math.max(0, Math.floor(rawBeat / selectedDuration) * selectedDuration);
    const x = startX + snappedBeat * beatWidth + 18;

    let midi = 62;
    if (clickY < 155) {
      const stepDiff = Math.round((trebleBottomLineY - clickY) / stepHeight);
      midi = diatonicStepToMidi(30 + stepDiff);
    } else {
      const stepDiff = Math.round((bassBottomLineY - clickY) / stepHeight);
      midi = diatonicStepToMidi(17 + stepDiff);
    }

    const y = getYForMidi(midi);
    setHoveredPitch({ midi, beat: snappedBeat, x, y });
  };

  // Convert Diatonic Step to representative Natural MIDI pitch
  function diatonicStepToMidi(step: number): number {
    const octave = Math.floor(step / 7);
    const stepInOctave = ((step % 7) + 7) % 7;
    const naturalPcs = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B
    return (octave + 1) * 12 + naturalPcs[stepInOctave];
  }

  // Generate bar lines (every 4 beats)
  const numMeasures = Math.max(4, Math.ceil(totalBeats / 4) + 1);
  const measureBarLines = [];
  for (let m = 0; m <= numMeasures; m++) {
    const x = startX + m * 4 * beatWidth;
    measureBarLines.push({ measureIndex: m + 1, x });
  }

  // Playhead scrubber position
  const playheadX = startX + currentBeat * beatWidth;

  return (
    <div className="relative w-full overflow-hidden bg-[#0e121a] rounded-2xl border border-[#212a3b] shadow-xl p-2 sm:p-4">
      {/* Staff Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-[#1c2434] text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-100 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shadow-sm shadow-emerald-400/50" />
            Interactive Musical Staff
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Click staff to place Cantus Firmus notes
          </span>
        </div>

        {/* Note duration picker for insertion */}
        <div className="flex items-center gap-1 bg-[#090c12] p-1 rounded-xl border border-[#1c2434]">
          <span className="text-[10px] uppercase text-slate-400 px-1 font-mono">Duration:</span>
          {[
            { dur: 4, label: 'Whole (4b)' },
            { dur: 2, label: 'Half (2b)' },
            { dur: 1, label: 'Quarter (1b)' },
          ].map((d) => (
            <button
              key={d.dur}
              onClick={() => onAddOrUpdateCfNote({ midi: 62, beat: -1, duration: d.dur })} // Triggers duration update in parent
              aria-label={`Select ${d.label} duration`}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                selectedDuration === d.dur
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable Notation Canvas */}
      <div className="overflow-x-auto overflow-y-hidden pb-2 select-none touch-pan-x">
        <svg
          ref={svgRef}
          width={totalWidth}
          height={310}
          onClick={handleSvgClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredPitch(null)}
          className="cursor-crosshair block"
        >
          {/* Background subtle measure shading */}
          {measureBarLines.map((bar, idx) => (
            <g key={`measure-bg-${idx}`}>
              {idx % 2 === 1 && (
                <rect
                  x={bar.x - 4 * beatWidth}
                  y={40}
                  width={4 * beatWidth}
                  height={240}
                  fill="rgba(255, 255, 255, 0.015)"
                />
              )}
              {/* Measure Number text */}
              <text
                x={bar.x + 6}
                y={32}
                fill="#64748b"
                fontSize={11}
                fontFamily="JetBrains Mono, monospace"
                fontWeight={600}
              >
                m.{bar.measureIndex}
              </text>
            </g>
          ))}

          {/* Blank Staff Guide Message */}
          {cfTrack.notes.length === 0 && (
            <g pointerEvents="none">
              <rect
                x={startX + 40}
                y={130}
                width={360}
                height={48}
                rx={12}
                fill="#111622"
                stroke="#2d3748"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.9}
              />
              <text
                x={startX + 220}
                y={150}
                fill="#94a3b8"
                fontSize={12}
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight={600}
                textAnchor="middle"
              >
                ✦ Blank Canvas: Input Your Cantus Firmus
              </text>
              <text
                x={startX + 220}
                y={166}
                fill="#64748b"
                fontSize={10}
                fontFamily="Plus Jakarta Sans, sans-serif"
                textAnchor="middle"
              >
                Click staff lines or tap Touch Melody Keyboard below
              </text>
            </g>
          )}

          {/* Grand Staff Connecting Bracket */}
          <line x1={startX - 18} y1={trebleTopLineY} x2={startX - 18} y2={bassBottomLineY} stroke="#475569" strokeWidth={3} />
          <line x1={startX - 18} y1={trebleTopLineY} x2={startX - 10} y2={trebleTopLineY} stroke="#475569" strokeWidth={2} />
          <line x1={startX - 18} y1={bassBottomLineY} x2={startX - 10} y2={bassBottomLineY} stroke="#475569" strokeWidth={2} />

          {/* Treble Staff Lines (5 lines) */}
          {[0, 1, 2, 3, 4].map((i) => {
            const y = trebleTopLineY + i * lineSpacing;
            return (
              <line
                key={`treble-line-${i}`}
                x1={startX - 15}
                y1={y}
                x2={totalWidth - 10}
                y2={y}
                stroke="#334155"
                strokeWidth={1.2}
              />
            );
          })}

          {/* Bass Staff Lines (5 lines) */}
          {[0, 1, 2, 3, 4].map((i) => {
            const y = bassTopLineY + i * lineSpacing;
            return (
              <line
                key={`bass-line-${i}`}
                x1={startX - 15}
                y1={y}
                x2={totalWidth - 10}
                y2={y}
                stroke="#334155"
                strokeWidth={1.2}
              />
            );
          })}

          {/* Clef Badges & Vector Indicators */}
          {/* Treble Clef Badge */}
          <g transform={`translate(${startX - 58}, ${trebleTopLineY + 6})`} pointerEvents="none">
            <rect x="0" y="0" width="38" height="40" rx="6" fill="#161f30" stroke="#25334d" strokeWidth="1" />
            <text x="19" y="16" fontSize="8" fill="#38bdf8" fontFamily="JetBrains Mono, monospace" fontWeight="700" textAnchor="middle">
              TREBLE
            </text>
            <text x="19" y="32" fontSize="16" fill="#94a3b8" fontFamily="serif" fontWeight="bold" textAnchor="middle">
              G
            </text>
          </g>

          {/* Bass Clef Badge */}
          <g transform={`translate(${startX - 58}, ${bassTopLineY + 6})`} pointerEvents="none">
            <rect x="0" y="0" width="38" height="40" rx="6" fill="#161f30" stroke="#25334d" strokeWidth="1" />
            <text x="19" y="16" fontSize="8" fill="#34d399" fontFamily="JetBrains Mono, monospace" fontWeight="700" textAnchor="middle">
              BASS
            </text>
            <text x="19" y="32" fontSize="16" fill="#94a3b8" fontFamily="serif" fontWeight="bold" textAnchor="middle">
              F
            </text>
          </g>

          {/* Measure Vertical Barlines */}
          {measureBarLines.map((bar, idx) => (
            <g key={`barline-${idx}`}>
              <line
                x1={bar.x}
                y1={trebleTopLineY}
                x2={bar.x}
                y2={trebleBottomLineY}
                stroke="#334155"
                strokeWidth={1.5}
              />
              <line
                x1={bar.x}
                y1={bassTopLineY}
                x2={bar.x}
                y2={bassBottomLineY}
                stroke="#334155"
                strokeWidth={1.5}
              />
            </g>
          ))}

          {/* Render All Voice Tracks */}
          {tracks.map((track) => {
            if (track.muted) return null;

            return (
              <g key={`track-notes-${track.id}`}>
                {track.notes.map((note) => {
                  const x = startX + note.beat * beatWidth + 16;
                  const y = getYForMidi(note.midi);
                  const isCf = track.isCantusFirmus;
                  const noteInfo = midiToNoteName(note.midi);
                  const isUpperVoice = note.midi >= 60;
                  const stemUp = y > (isUpperVoice ? trebleTopLineY + lineSpacing * 2 : bassTopLineY + lineSpacing * 2);

                  // Ledger line check (Middle C = C4 = MIDI 60)
                  const ledgerLines = [];
                  if (note.midi === 60) {
                    // Middle C ledger line
                    ledgerLines.push(trebleBottomLineY + lineSpacing);
                  } else if (note.midi >= 81) {
                    // Above treble top line (A5)
                    ledgerLines.push(trebleTopLineY - lineSpacing);
                  } else if (note.midi <= 40) {
                    // Below bass bottom line (E2)
                    ledgerLines.push(bassBottomLineY + lineSpacing);
                  }

                  return (
                    <g
                      key={`note-${track.id}-${note.id}`}
                      className="cursor-pointer transition-transform hover:opacity-85"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreviewPitch(note.midi);
                        if (isCf) {
                          onDeleteCfNote(note.id);
                        }
                      }}
                    >
                      {/* Render Ledger Lines */}
                      {ledgerLines.map((ly, lidx) => (
                        <line
                          key={`ledger-${note.id}-${lidx}`}
                          x1={x - 12}
                          y1={ly}
                          x2={x + 18}
                          y2={ly}
                          stroke="#64748b"
                          strokeWidth={1.5}
                        />
                      ))}

                      {/* Notehead */}
                      <ellipse
                        cx={x}
                        cy={y}
                        rx={7.5}
                        ry={5.5}
                        transform={`rotate(-20 ${x} ${y})`}
                        fill={isCf ? '#10B981' : track.color}
                        stroke={isCf ? '#047857' : '#1e293b'}
                        strokeWidth={1.2}
                      />

                      {/* Hollow center for whole or half notes */}
                      {note.duration >= 2 && (
                        <ellipse
                          cx={x}
                          cy={y}
                          rx={4.5}
                          ry={2.8}
                          transform={`rotate(-20 ${x} ${y})`}
                          fill="#0e121a"
                        />
                      )}

                      {/* Stem for half and quarter notes */}
                      {note.duration < 4 && (
                        <line
                          x1={stemUp ? x + 6.5 : x - 6.5}
                          y1={y}
                          x2={stemUp ? x + 6.5 : x - 6.5}
                          y2={stemUp ? y - 32 : y + 32}
                          stroke={isCf ? '#10B981' : track.color}
                          strokeWidth={1.8}
                        />
                      )}

                      {/* Pitch label text */}
                      <text
                        x={x}
                        y={stemUp ? y + 16 : y - 10}
                        fontSize={9}
                        fill={isCf ? '#6ee7b7' : '#94a3b8'}
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight={600}
                        textAnchor="middle"
                      >
                        {noteInfo.fullName}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Hover Phantom Note Indicator */}
          {hoveredPitch && (
            <g pointerEvents="none" opacity={0.65}>
              <ellipse
                cx={hoveredPitch.x}
                cy={hoveredPitch.y}
                rx={7.5}
                ry={5.5}
                transform={`rotate(-20 ${hoveredPitch.x} ${hoveredPitch.y})`}
                fill="#38bdf8"
                stroke="#0284c7"
                strokeWidth={1.5}
              />
              <text
                x={hoveredPitch.x}
                y={hoveredPitch.y - 12}
                fontSize={10}
                fill="#38bdf8"
                fontFamily="JetBrains Mono, monospace"
                fontWeight={700}
                textAnchor="middle"
              >
                + {midiToNoteName(hoveredPitch.midi).fullName}
              </text>
            </g>
          )}

          {/* DAW Playhead Scrubber */}
          <g>
            <line
              x1={playheadX}
              y1={25}
              x2={playheadX}
              y2={275}
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="none"
              style={{ filter: 'drop-shadow(0px 0px 4px rgba(56, 189, 248, 0.8))' }}
            />
            {/* Playhead thumb marker */}
            <polygon
              points={`${playheadX - 6},25 ${playheadX + 6},25 ${playheadX},35`}
              fill="#38bdf8"
            />
          </g>
        </svg>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#1c2434] text-[11px] text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Cantus Firmus (Click to delete note)
          </span>
          <span className="flex items-center gap-1.5 hidden sm:inline-flex">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
            Counterpoint Lines
          </span>
        </div>
        <span className="font-mono text-[10px] text-slate-500">
          Double clef SATB span (E2 - G5)
        </span>
      </div>
    </div>
  );
};
