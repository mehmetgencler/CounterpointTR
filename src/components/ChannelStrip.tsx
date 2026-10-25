import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceTrack } from '../types/music.ts';
import { globalAudioEngine } from '../audio/AudioEngine.ts';

interface ChannelStripProps {
  track?: VoiceTrack;
  isMaster?: boolean;
  masterVolume?: number;
  isMasterMuted?: boolean;
  onVolumeChange?: (trackId: string, volume: number) => void;
  onPanChange?: (trackId: string, pan: number) => void;
  onToggleMute?: (trackId: string) => void;
  onToggleSolo?: (trackId: string) => void;
  onMasterVolumeChange?: (volume: number) => void;
  onToggleMasterMute?: () => void;
  isPlaying?: boolean;
}

// Convert linear volume (0.0 - 1.5) to decibels
export function volumeToDb(volume: number): number {
  if (volume <= 0.0001) return -Infinity;
  // Unity gain 1.0 = 0 dB; 1.414 ~ +3dB, 2.0 ~ +6dB
  return 20 * Math.log10(volume);
}

// Convert decibels back to linear volume
export function dbToVolume(db: number): number {
  if (db <= -60) return 0;
  return Math.pow(10, db / 20);
}

// Format dB display string
export function formatDb(volume: number, isMuted: boolean): string {
  if (isMuted) return 'MUTE';
  if (volume <= 0.0001) return '-inf';
  const db = volumeToDb(volume);
  if (db >= 0.05) {
    return `+${db.toFixed(1)}`;
  }
  return db.toFixed(1);
}

// Format Pan display string
export function formatPan(pan: number): string {
  if (Math.abs(pan) < 0.03) return 'C';
  const val = Math.round(pan * 100);
  if (val < 0) return `L${Math.abs(val)}`;
  return `R${val}`;
}

export const ChannelStrip: React.FC<ChannelStripProps> = ({
  track,
  isMaster = false,
  masterVolume = 1.0,
  isMasterMuted = false,
  onVolumeChange,
  onPanChange,
  onToggleMute,
  onToggleSolo,
  onMasterVolumeChange,
  onToggleMasterMute,
  isPlaying = false,
}) => {
  const trackId = track?.id || 'master';
  const volume = isMaster ? masterVolume : track?.volume ?? 0.85;
  const pan = isMaster ? 0 : track?.pan ?? 0;
  const isMuted = isMaster ? isMasterMuted : track?.muted ?? false;
  const isSolo = isMaster ? false : track?.solo ?? false;
  const trackColor = isMaster ? '#3b82f6' : track?.color || '#10b981';
  const trackNumber = isMaster ? 'M' : track?.trackNumber || 1;
  const trackName = isMaster ? 'Stereo Out' : track?.name || 'Track';
  const voiceRole = isMaster ? 'Master Bus' : track?.voiceRole ? track.voiceRole.toUpperCase() : 'VOICE';

  // Real-time audio meter levels (0.0 to 1.0)
  const [meterLeft, setMeterLeft] = useState<number>(0);
  const [meterRight, setMeterRight] = useState<number>(0);
  const [peakHoldLeft, setPeakHoldLeft] = useState<number>(0);
  const [peakHoldRight, setPeakHoldRight] = useState<number>(0);
  const [isClipping, setIsClipping] = useState<boolean>(false);

  // Meter polling loop
  useEffect(() => {
    let animId: number;
    let decayTimer: NodeJS.Timeout | null = null;

    const updateMeters = () => {
      let levels = { left: 0, right: 0, peak: 0 };
      if (isMaster) {
        levels = globalAudioEngine.getMasterLevels();
      } else if (track) {
        levels = globalAudioEngine.getTrackLevels(track.id);
      }

      // If muted, force meters to zero
      const targetL = isMuted ? 0 : levels.left;
      const targetR = isMuted ? 0 : levels.right;

      // Smooth envelope decay
      setMeterLeft((prev) => Math.max(targetL, prev * 0.84));
      setMeterRight((prev) => Math.max(targetR, prev * 0.84));

      // Peak hold
      setPeakHoldLeft((prev) => (targetL > prev ? targetL : Math.max(0, prev - 0.015)));
      setPeakHoldRight((prev) => (targetR > prev ? targetR : Math.max(0, prev - 0.015)));

      if (targetL > 0.95 || targetR > 0.95) {
        setIsClipping(true);
        if (decayTimer) clearTimeout(decayTimer);
        decayTimer = setTimeout(() => setIsClipping(false), 800);
      }

      animId = requestAnimationFrame(updateMeters);
    };

    animId = requestAnimationFrame(updateMeters);
    return () => {
      cancelAnimationFrame(animId);
      if (decayTimer) clearTimeout(decayTimer);
    };
  }, [track, isMaster, isMuted, isPlaying]);

  // Fader Dragging Logic
  const faderTrackRef = useRef<HTMLDivElement>(null);
  const isDraggingFader = useRef<boolean>(false);

  // Fader scale: Top is +6dB (volume ~ 2.0), Middle 0dB is ~75% from bottom, Bottom is -inf (volume 0)
  // We map normalized fader position [0 = bottom/silence, 1 = top/+6dB]
  const volumeToFaderRatio = (vol: number): number => {
    if (vol <= 0.0001) return 0;
    const db = volumeToDb(vol);
    if (db <= -48) {
      return ((db + 60) / 12) * 0.15; // 0 to 0.15 for -60dB to -48dB
    }
    if (db <= -24) {
      return 0.15 + ((db + 48) / 24) * 0.25; // 0.15 to 0.40 for -48dB to -24dB
    }
    if (db <= 0) {
      return 0.40 + ((db + 24) / 24) * 0.35; // 0.40 to 0.75 for -24dB to 0dB
    }
    return 0.75 + (db / 6) * 0.25; // 0.75 to 1.0 for 0dB to +6dB
  };

  const faderRatioToVolume = (ratio: number): number => {
    const clamped = Math.max(0, Math.min(1, ratio));
    if (clamped <= 0.01) return 0;
    let db = -60;
    if (clamped <= 0.15) {
      db = -60 + (clamped / 0.15) * 12;
    } else if (clamped <= 0.40) {
      db = -48 + ((clamped - 0.15) / 0.25) * 24;
    } else if (clamped <= 0.75) {
      db = -24 + ((clamped - 0.40) / 0.35) * 24;
    } else {
      db = 0 + ((clamped - 0.75) / 0.25) * 6;
    }
    return dbToVolume(db);
  };

  const updateFaderFromY = useCallback((clientY: number) => {
    if (!faderTrackRef.current) return;
    const rect = faderTrackRef.current.getBoundingClientRect();
    const offsetY = clientY - rect.top;
    const ratio = 1 - offsetY / rect.height;
    const newVol = Math.round(faderRatioToVolume(ratio) * 100) / 100;

    if (isMaster) {
      if (onMasterVolumeChange) onMasterVolumeChange(newVol);
    } else if (track && onVolumeChange) {
      onVolumeChange(track.id, newVol);
    }
  }, [isMaster, track, onVolumeChange, onMasterVolumeChange]);

  const handleFaderMouseDown = (e: React.MouseEvent) => {
    isDraggingFader.current = true;
    updateFaderFromY(e.clientY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingFader.current) {
        updateFaderFromY(moveEvent.clientY);
      }
    };
    const onMouseUp = () => {
      isDraggingFader.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleFaderTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      isDraggingFader.current = true;
      updateFaderFromY(e.touches[0].clientY);

      const onTouchMove = (moveEvent: TouchEvent) => {
        if (isDraggingFader.current && moveEvent.touches.length > 0) {
          updateFaderFromY(moveEvent.touches[0].clientY);
        }
      };
      const onTouchEnd = () => {
        isDraggingFader.current = false;
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
      };

      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    }
  };

  // Reset fader to 0dB on double click
  const handleFaderDoubleClick = () => {
    if (isMaster) {
      if (onMasterVolumeChange) onMasterVolumeChange(1.0);
    } else if (track && onVolumeChange) {
      onVolumeChange(track.id, 1.0);
    }
  };

  // Rotary Pan Dragging Logic
  const isDraggingPan = useRef<boolean>(false);
  const panStartVal = useRef<number>(0);
  const panStartY = useRef<number>(0);

  const handlePanMouseDown = (e: React.MouseEvent) => {
    isDraggingPan.current = true;
    panStartY.current = e.clientY;
    panStartVal.current = pan;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingPan.current) {
        const deltaY = panStartY.current - moveEvent.clientY;
        const deltaPan = deltaY / 80;
        const newPan = Math.max(-1, Math.min(1, Math.round((panStartVal.current + deltaPan) * 100) / 100));
        if (track && onPanChange) {
          onPanChange(track.id, newPan);
        }
      }
    };
    const onMouseUp = () => {
      isDraggingPan.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handlePanDoubleClick = () => {
    if (track && onPanChange) {
      onPanChange(track.id, 0);
    }
  };

  const currentFaderRatio = volumeToFaderRatio(volume);
  // Cap position: 0% at bottom, 100% at top
  const faderThumbBottomPercent = Math.max(0, Math.min(100, currentFaderRatio * 100));

  // LED meter segment count: 18 segments
  const totalMeterSegments = 18;
  const renderMeterBar = (level: number, peakHold: number) => {
    const activeCount = Math.round(level * totalMeterSegments);
    const peakIndex = Math.min(totalMeterSegments - 1, Math.round(peakHold * totalMeterSegments));

    return (
      <div className="flex flex-col-reverse justify-between h-full w-2 bg-[#090b10] p-[1px] rounded-sm gap-[1.5px] border border-[#161a24]">
        {Array.from({ length: totalMeterSegments }).map((_, idx) => {
          const isActive = idx < activeCount;
          const isPeak = idx === peakIndex && peakHold > 0.05;

          // Color zone: bottom 12 green, next 4 amber, top 2 red
          let activeColor = 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.7)]';
          let inactiveColor = 'bg-[#121922]';

          if (idx >= 16) {
            activeColor = 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)]';
            inactiveColor = 'bg-[#261215]';
          } else if (idx >= 12) {
            activeColor = 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)]';
            inactiveColor = 'bg-[#221c10]';
          }

          return (
            <div
              key={idx}
              className={`w-full flex-1 rounded-[0.5px] transition-colors duration-75 ${
                isActive || isPeak ? activeColor : inactiveColor
              }`}
            />
          );
        })}
      </div>
    );
  };

  // Pan knob rotation angle: -135deg (Left) to +135deg (Right)
  const panRotation = pan * 135;

  return (
    <div className={`w-28 sm:w-32 shrink-0 flex flex-col bg-[#16181f] border-r border-[#262936] text-slate-200 select-none shadow-md ${
      isMaster ? 'bg-[#12141a] border-l-2 border-l-[#3b82f6]/40' : ''
    }`}>
      {/* 1. Header: Track Number & Role */}
      <div className="px-2.5 py-2 border-b border-[#252835] bg-[#1a1d26] flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 truncate">
          <span
            className="w-4 h-4 rounded text-[10px] font-mono font-bold flex items-center justify-center text-slate-900 shrink-0"
            style={{ backgroundColor: trackColor }}
          >
            {trackNumber}
          </span>
          <span className="text-[11px] font-semibold text-slate-200 truncate" title={trackName}>
            {trackName}
          </span>
        </div>
        <span className="text-[9px] font-mono uppercase text-slate-400 px-1 py-0.5 rounded bg-[#101218]">
          {voiceRole.slice(0, 4)}
        </span>
      </div>

      {/* 2. Rotary Pan Knob Section */}
      <div className="py-2.5 px-2 flex flex-col items-center justify-center border-b border-[#222532] bg-[#14161e]">
        <div className="text-[9px] uppercase tracking-wider font-mono text-slate-400 mb-1">
          PAN
        </div>
        {!isMaster ? (
          <div
            className="relative w-10 h-10 rounded-full bg-[#1e222d] border border-[#333a4c] shadow-inner flex items-center justify-center cursor-ns-resize hover:border-[#4c5670] transition-colors group"
            onMouseDown={handlePanMouseDown}
            onDoubleClick={handlePanDoubleClick}
            title="Drag vertically to Pan. Double-click to center."
          >
            {/* Illuminated Pan arc indicator */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 40 40">
              <circle
                cx="20"
                cy="20"
                r="16"
                fill="none"
                stroke="#121620"
                strokeWidth="2.5"
              />
              {pan !== 0 && (
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeDasharray="100"
                  strokeDashoffset={pan > 0 ? 100 - pan * 38 : 100}
                  className="transition-all"
                />
              )}
            </svg>

            {/* Dial pointer */}
            <div
              className="w-1.5 h-4 bg-slate-300 rounded-full shadow-sm origin-bottom"
              style={{
                transform: `rotate(${panRotation}deg) translateY(-4px)`,
              }}
            />
            {/* Center tick */}
            <div className="absolute top-1 w-0.5 h-1 bg-slate-500 rounded-full" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#161a22] border border-[#232936] flex items-center justify-center">
            <span className="text-[10px] font-mono text-slate-400">LR</span>
          </div>
        )}

        {/* Numeric Pan readout */}
        <div
          onClick={handlePanDoubleClick}
          className="mt-1 text-[10px] font-mono font-medium text-slate-300 hover:text-emerald-400 cursor-pointer transition-colors"
          title="Double-click to center pan"
        >
          {isMaster ? 'STEREO' : formatPan(pan)}
        </div>
      </div>

      {/* 3. Numeric dB Readout */}
      <div className="py-1.5 px-2 bg-[#0e1017] border-b border-[#202430] flex items-center justify-center">
        <span
          className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded transition-colors ${
            isClipping
              ? 'bg-rose-950/80 text-rose-300 border border-rose-700/80 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
              : isMuted
              ? 'text-amber-400 bg-amber-950/40'
              : 'text-emerald-400 bg-[#141822]'
          }`}
        >
          {formatDb(volume, isMuted)}
          {volume > 0.0001 && !isMuted ? ' dB' : ''}
        </span>
      </div>

      {/* 4. Main Fader + Dual Stereo LED Peak Meters Area */}
      <div className="flex-1 min-h-[220px] max-h-[300px] py-3 px-2 flex items-stretch justify-center gap-1.5 bg-[#151720] relative">
        {/* dB Scale Markings (Left side) */}
        <div className="flex flex-col justify-between items-end text-[8px] font-mono text-slate-400 pr-0.5 select-none py-1">
          <span>+6</span>
          <span>0</span>
          <span>-6</span>
          <span>-12</span>
          <span>-24</span>
          <span>-36</span>
          <span>-inf</span>
        </div>

        {/* Fader Track & Thumb */}
        <div
          ref={faderTrackRef}
          onMouseDown={handleFaderMouseDown}
          onTouchStart={handleFaderTouchStart}
          onDoubleClick={handleFaderDoubleClick}
          className="relative w-8 h-full flex justify-center items-center cursor-pointer group"
          title="Drag vertical fader to adjust volume. Double-click for 0 dB unity."
        >
          {/* Background vertical groove */}
          <div className="w-1.5 h-full bg-[#0a0c12] rounded-full border border-[#222736] shadow-inner relative">
            {/* 0dB unity center tick line */}
            <div className="absolute top-[25%] left-[-4px] right-[-4px] h-[1.5px] bg-slate-500/80 pointer-events-none" />
          </div>

          {/* Realistic Metallic Hardware Fader Handle Knob */}
          <div
            className="absolute left-0 right-0 h-9 rounded-md bg-gradient-to-b from-[#404654] via-[#2a2f3a] to-[#1c2029] border border-[#5a6275] shadow-[0_4px_10px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.3)] flex flex-col items-center justify-center pointer-events-none group-hover:border-[#737c94] transition-[border-color,transform] active:scale-95"
            style={{
              bottom: `calc(${faderThumbBottomPercent}% - 18px)`,
            }}
          >
            {/* Fader grip grooves */}
            <div className="w-5 h-[1.5px] bg-[#11141c] mb-[2px]" />
            {/* Center illuminated hairline mark */}
            <div className="w-6 h-[2px] bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
            <div className="w-5 h-[1.5px] bg-[#11141c] mt-[2px]" />
          </div>
        </div>

        {/* Dual Stereo LED Peak Meters (Right side: L and R) */}
        <div className="flex items-center gap-[2px] h-full py-1">
          {renderMeterBar(meterLeft, peakHoldLeft)}
          {renderMeterBar(meterRight, peakHoldRight)}
        </div>
      </div>

      {/* 5. Tactile Mute and Solo Buttons (Prominent) */}
      <div className="p-2 border-t border-[#232734] bg-[#12141c] grid grid-cols-2 gap-1.5">
        {/* Mute Button */}
        <button
          onClick={() => {
            if (isMaster) {
              if (onToggleMasterMute) onToggleMasterMute();
            } else if (track && onToggleMute) {
              onToggleMute(track.id);
            }
          }}
          aria-label={isMuted ? `Unmute ${trackName}` : `Mute ${trackName}`}
          className={`h-8 rounded font-mono font-bold text-xs transition-all active:scale-95 flex items-center justify-center border ${
            isMuted
              ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.6)] font-black'
              : 'bg-[#1b1f2b] text-slate-300 border-[#2b3245] hover:bg-[#252b3c] hover:text-white'
          }`}
          title="Mute Track (M)"
        >
          M
        </button>

        {/* Solo Button (Disabled for Master) */}
        {!isMaster ? (
          <button
            onClick={() => {
              if (track && onToggleSolo) {
                onToggleSolo(track.id);
              }
            }}
            aria-label={isSolo ? `Unsolo ${trackName}` : `Solo ${trackName}`}
            className={`h-8 rounded font-mono font-bold text-xs transition-all active:scale-95 flex items-center justify-center border ${
              isSolo
                ? 'bg-yellow-400 text-slate-950 border-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.7)] font-black'
                : 'bg-[#1b1f2b] text-slate-300 border-[#2b3245] hover:bg-[#252b3c] hover:text-white'
            }`}
            title="Solo Track (S)"
          >
            S
          </button>
        ) : (
          <div className="h-8 rounded bg-[#101217] border border-[#1d212b] flex items-center justify-center text-[10px] font-mono text-slate-400">
            BUS
          </div>
        )}
      </div>

      {/* 6. Colored Channel Strip Footer (Matching Logic Pro) */}
      <div
        className="px-2 py-1.5 text-center text-[10px] font-bold font-mono text-slate-950 truncate transition-colors shadow-inner"
        style={{ backgroundColor: trackColor }}
        title={`${trackNumber}: ${trackName}`}
      >
        {isMaster ? 'MASTER' : `${trackNumber} ${trackName.split(' ')[0]}`}
      </div>
    </div>
  );
};
