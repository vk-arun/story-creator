import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

const AudioContext = createContext(null);

export const AudioProvider = ({ children }) => {
  const [activeTrack, setActiveTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('reader_sound_muted') === 'true';
  });
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [activeStoryTitle, setActiveStoryTitle] = useState('');
  const [currentLineNumber, setCurrentLineNumber] = useState(1);

  const audioRef = useRef(null);
  const fadeIntervalRef = useRef(null);
  const stagedTrackRef = useRef(null);
  const currentAudioUrlRef = useRef(null);
  const currentTrackIdRef = useRef(null);

  // Initialize audio instance
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';

    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onerror = (e) => {
      console.warn('Audio playback notice (stream buffer):', e);
      setIsPlaying(false);
    };

    audioRef.current = audio;

    // Automatic browser audio unlock on ANY user interaction
    const handleUserInteraction = () => {
      setAudioUnlocked(true);
      if (audioRef.current && stagedTrackRef.current && !isMuted) {
        const targetVol = (stagedTrackRef.current.volume ?? 0.7) * masterVolume;
        audioRef.current.volume = Math.max(0, Math.min(1, targetVol));
        if (audioRef.current.paused && audioRef.current.src) {
          audioRef.current.play().catch(() => {});
        }
      }
      cleanupListeners();
    };

    const cleanupListeners = () => {
      ['scroll', 'wheel', 'touchstart', 'click', 'keydown'].forEach(evt => {
        window.removeEventListener(evt, handleUserInteraction);
      });
    };

    ['scroll', 'wheel', 'touchstart', 'click', 'keydown'].forEach(evt => {
      window.addEventListener(evt, handleUserInteraction, { passive: true, once: true });
    });

    return () => {
      cleanupListeners();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    };
  }, [isMuted, masterVolume]);

  // Sync volume with masterVolume and isMuted
  useEffect(() => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = 0;
      audioRef.current.pause();
    } else {
      const targetVol = activeTrack ? (activeTrack.volume ?? 0.7) * masterVolume : masterVolume;
      audioRef.current.volume = Math.max(0, Math.min(1, targetVol));
      if (audioUnlocked && activeTrack && audioRef.current.paused && audioRef.current.src) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [masterVolume, isMuted, activeTrack, audioUnlocked]);

  // Smooth fade utility
  const fadeVolumeTo = useCallback((targetVolume, durationMs = 250, callback) => {
    if (!audioRef.current) return;
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    const audio = audioRef.current;
    const startVolume = audio.volume;
    const stepTime = 25;
    const totalSteps = Math.max(1, Math.round(durationMs / stepTime));
    const volumeStep = (targetVolume - startVolume) / totalSteps;
    let currentStep = 0;

    fadeIntervalRef.current = setInterval(() => {
      currentStep++;
      const newVol = startVolume + volumeStep * currentStep;
      if (currentStep >= totalSteps) {
        clearInterval(fadeIntervalRef.current);
        fadeIntervalRef.current = null;
        if (audioRef.current) {
          audioRef.current.volume = Math.max(0, Math.min(1, targetVolume));
        }
        if (callback) callback();
      } else {
        if (audioRef.current) {
          audioRef.current.volume = Math.max(0, Math.min(1, newVol));
        }
      }
    }, stepTime);
  }, []);

  // Helper to check if audio.src corresponds to track.audioUrl
  const isAudioUrlMatch = (audioSrc, trackUrl) => {
    if (!audioSrc || !trackUrl) return false;
    if (audioSrc === trackUrl) return true;
    try {
      const fullUrl = new URL(trackUrl, window.location.origin).href;
      return audioSrc === fullUrl || audioSrc.endsWith(trackUrl);
    } catch {
      return audioSrc.endsWith(trackUrl);
    }
  };

  // Play track without glitching or restarting audio buffer on scroll
  const playTrack = useCallback((track, storyTitle = '') => {
    if (!audioRef.current || !track || !track.audioUrl) return;

    stagedTrackRef.current = track;
    if (storyTitle) setActiveStoryTitle(storyTitle);

    const audio = audioRef.current;
    const effectiveVol = (track.volume ?? 0.7) * masterVolume;

    // 1. Immediately cancel any running fade interval from stopTrack or previous transition!
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    // 2. Check if this exact audio URL is already active or loaded in the audio element
    const isSameTrack = 
      currentAudioUrlRef.current === track.audioUrl || 
      isAudioUrlMatch(audio.src, track.audioUrl);

    currentAudioUrlRef.current = track.audioUrl;
    currentTrackIdRef.current = track.id;
    setActiveTrack(track);

    if (isMuted) return;

    if (isSameTrack && audio.src) {
      // Audio stream is ALREADY loaded. DO NOT re-assign audio.src (which resets buffer to 0s)!
      if (audio.paused) {
        audio.play().catch(() => {});
      }
      fadeVolumeTo(effectiveVol, 150);
      return;
    }

    // 3. Different track: if currently playing, cross-fade smoothly
    if (!audio.paused && audio.src) {
      fadeVolumeTo(0, 150, () => {
        if (currentAudioUrlRef.current === track.audioUrl && audioRef.current) {
          audioRef.current.src = track.audioUrl;
          audioRef.current.loop = track.loop !== false;
          audioRef.current.play()
            .then(() => {
              setAudioUnlocked(true);
              fadeVolumeTo(effectiveVol, 250);
            })
            .catch(() => {});
        }
      });
    } else {
      audio.src = track.audioUrl;
      audio.loop = track.loop !== false;
      audio.volume = effectiveVol;
      audio.play()
        .then(() => {
          setAudioUnlocked(true);
        })
        .catch(() => {});
    }
  }, [isMuted, masterVolume, fadeVolumeTo]);

  // Stop track smoothly without abrupt cuts
  const stopTrack = useCallback((smooth = true) => {
    if (!audioRef.current) return;
    if (currentAudioUrlRef.current === null && stagedTrackRef.current === null) {
      return; // Already stopped
    }

    currentAudioUrlRef.current = null;
    currentTrackIdRef.current = null;
    stagedTrackRef.current = null;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    if (smooth && !audioRef.current.paused) {
      fadeVolumeTo(0, 200, () => {
        if (currentAudioUrlRef.current === null && audioRef.current) {
          audioRef.current.pause();
          setActiveTrack(null);
        }
      });
    } else {
      audioRef.current.pause();
      audioRef.current.volume = 0;
      setActiveTrack(null);
    }
  }, [fadeVolumeTo]);

  // Line-synchronized audio detection with strict numeric comparison
  const syncWithLine = useCallback((lineNum, musicSegments = [], storyTitle = '') => {
    setCurrentLineNumber(lineNum);
    if (!musicSegments || musicSegments.length === 0) {
      if (currentAudioUrlRef.current) stopTrack(true);
      return;
    }

    const numericLine = parseInt(lineNum, 10);
    if (isNaN(numericLine)) return;

    const matchingSegment = musicSegments.find(seg => {
      const from = parseInt(seg.fromLine, 10);
      const to = parseInt(seg.toLine, 10);
      return !isNaN(from) && !isNaN(to) && numericLine >= from && numericLine <= to;
    });

    if (matchingSegment) {
      playTrack(matchingSegment, storyTitle);
    } else {
      if (currentAudioUrlRef.current) {
        stopTrack(true);
      }
    }
  }, [playTrack, stopTrack]);

  // Toggle Mute
  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem('reader_sound_muted', next.toString());
      if (next) {
        if (audioRef.current) audioRef.current.pause();
      } else {
        setAudioUnlocked(true);
        if (audioRef.current && stagedTrackRef.current) {
          audioRef.current.volume = (stagedTrackRef.current.volume ?? 0.7) * masterVolume;
          audioRef.current.play().catch(() => {});
        }
      }
      return next;
    });
  };

  const togglePlayPause = () => {
    if (!audioRef.current || !activeTrack) return;
    if (audioRef.current.paused) {
      if (isMuted) setIsMuted(false);
      setAudioUnlocked(true);
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  };

  const setVolumeLevel = (val) => {
    const clamped = Math.max(0, Math.min(1, parseFloat(val)));
    setMasterVolume(clamped);
    if (isMuted && clamped > 0) {
      setIsMuted(false);
      localStorage.setItem('reader_sound_muted', 'false');
    }
  };

  return (
    <AudioContext.Provider value={{
      activeTrack,
      isPlaying,
      isMuted,
      masterVolume,
      audioUnlocked,
      activeStoryTitle,
      currentLineNumber,
      playTrack,
      stopTrack,
      syncWithLine,
      togglePlayPause,
      toggleMute,
      setVolumeLevel
    }}>
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio must be used within an AudioProvider');
  return ctx;
};
