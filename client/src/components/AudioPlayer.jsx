import React from 'react';
import { Volume2, VolumeX, Play, Pause, Music, Sparkles } from 'lucide-react';
import { useAudio } from '../context/AudioContext';

export const AudioPlayer = () => {
  const { 
    activeTrack, 
    isPlaying, 
    isMuted, 
    masterVolume, 
    audioUnlocked,
    currentLineNumber,
    unlockAudio,
    togglePlayPause, 
    toggleMute, 
    setVolumeLevel 
  } = useAudio();

  if (!activeTrack) return null;

  return (
    <div className="reader-audio-bar animate-fade-in" id="audio-hud">
      {/* Visualizer & Track Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
        <div 
          className="audio-visualizer" 
          style={{ cursor: 'pointer' }}
          onClick={togglePlayPause}
          title={isPlaying ? 'Pause soundtrack' : 'Play soundtrack'}
        >
          <div className={`audio-bar ${!isPlaying ? 'paused' : ''}`} />
          <div className={`audio-bar ${!isPlaying ? 'paused' : ''}`} />
          <div className={`audio-bar ${!isPlaying ? 'paused' : ''}`} />
          <div className={`audio-bar ${!isPlaying ? 'paused' : ''}`} />
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              fontSize: '0.88rem', 
              fontWeight: 600, 
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {activeTrack.title || 'Atmospheric Soundscape'}
            </span>
            <span className="badge badge-gold" style={{ fontSize: '0.68rem', padding: '2px 7px' }}>
              Lines {activeTrack.fromLine}–{activeTrack.toLine}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <Sparkles size={12} color="var(--accent-gold)" />
            {currentLineNumber ? (
              <span>Reading at Line {currentLineNumber}</span>
            ) : (
              <span>Synchronized ambient score</span>
            )}
          </div>
        </div>
      </div>

      {/* Controls: Play/Pause, Mute & Volume */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={togglePlayPause}
          style={{ 
            width: '34px', 
            height: '34px', 
            borderRadius: '50%', 
            background: isMuted ? 'rgba(255, 255, 255, 0.1)' : 'rgba(212, 175, 55, 0.2)', 
            color: isMuted ? 'var(--text-muted)' : 'var(--accent-gold)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: isMuted ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(212, 175, 55, 0.4)',
            transition: 'all 0.2s'
          }}
          title={isMuted ? 'Unmute & Play' : (isPlaying ? 'Pause' : 'Play')}
        >
          {isPlaying && !isMuted ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button 
            onClick={toggleMute}
            style={{ color: isMuted ? 'var(--text-muted)' : 'var(--text-secondary)', padding: '4px' }}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <input 
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : masterVolume}
            onChange={(e) => setVolumeLevel(e.target.value)}
            style={{
              width: '75px',
              accentColor: 'var(--accent-gold)',
              cursor: 'pointer',
              height: '4px'
            }}
            title="Soundtrack Volume"
          />
        </div>
      </div>
    </div>
  );
};
