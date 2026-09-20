import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Volume2, 
  VolumeX, 
  Music, 
  Type, 
  BookOpen,
  Share2,
  Check
} from 'lucide-react';
import { useAudio } from '../context/AudioContext';

export const StoryReader = ({ story, onBack }) => {
  const [theme, setTheme] = useState('midnight'); // midnight | parchment | celestial
  const [fontSize, setFontSize] = useState(1.25); // rem
  const [activeLine, setActiveLine] = useState(1);
  const [copied, setCopied] = useState(false);

  const { 
    activeTrack, 
    isPlaying, 
    isMuted, 
    toggleMute, 
    syncWithLine, 
    stopTrack 
  } = useAudio();

  const lineRefs = useRef([]);
  const activeLineRef = useRef(1);

  // Normalize story content into lines matching editor 1:1
  const rawLines = story.lines && story.lines.length > 0 
    ? story.lines 
    : (story.content || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines = rawLines.map(l => (typeof l === 'string' ? l.replace(/\r/g, '') : ''));

  // Clean up audio on exit
  useEffect(() => {
    return () => {
      stopTrack(true);
    };
  }, [stopTrack]);

  // High-precision focal point scroll detection
  useEffect(() => {
    let ticking = false;

    const checkActiveLine = () => {
      if (!lineRefs.current || lineRefs.current.length === 0) return;

      const total = lines.length;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      // 1. Scrolled to top: guarantee line 1 is active
      if (scrollY < 60) {
        if (activeLineRef.current !== 1) {
          activeLineRef.current = 1;
          setActiveLine(1);
          syncWithLine(1, story.musicSegments || [], story.title);
        }
        return;
      }

      // 2. Scrolled near bottom: guarantee last line is reachable even if focal point can't reach it
      if (scrollY + windowHeight >= docHeight - 70) {
        if (activeLineRef.current !== total) {
          activeLineRef.current = total;
          setActiveLine(total);
          syncWithLine(total, story.musicSegments || [], story.title);
        }
        return;
      }

      // 3. Focal zone reading detection (optimal eye level at 38% of viewport)
      const focalPoint = windowHeight * 0.38;
      let directHitLine = null;
      let closestLine = 1;
      let minDistance = Infinity;

      for (let i = 0; i < lineRefs.current.length; i++) {
        const el = lineRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();

        // If line directly contains the reading focal point:
        if (rect.top <= focalPoint && rect.bottom >= focalPoint) {
          directHitLine = i + 1;
          break;
        }

        const lineMid = (rect.top + rect.bottom) / 2;
        const distance = Math.abs(lineMid - focalPoint);

        if (distance < minDistance) {
          minDistance = distance;
          closestLine = i + 1;
        }
      }

      const selectedLine = directHitLine !== null ? directHitLine : closestLine;

      if (selectedLine !== activeLineRef.current) {
        activeLineRef.current = selectedLine;
        setActiveLine(selectedLine);
        syncWithLine(selectedLine, story.musicSegments || [], story.title);
      }
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          checkActiveLine();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    // Initial check
    checkActiveLine();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [lines.length, story, syncWithLine]);

  // Click directly on a line to focus and play its audio immediately
  const handleLineClick = (lineNum) => {
    activeLineRef.current = lineNum;
    setActiveLine(lineNum);
    syncWithLine(lineNum, story.musicSegments || [], story.title);
  };

  // Check if a line has music attached with strict numeric parsing
  const getLineMusic = (lineNum) => {
    if (!story.musicSegments || !Array.isArray(story.musicSegments)) return null;
    const num = parseInt(lineNum, 10);
    if (isNaN(num)) return null;

    return story.musicSegments.find(seg => {
      const from = parseInt(seg.fromLine, 10);
      const to = parseInt(seg.toLine, 10);
      return !isNaN(from) && !isNaN(to) && num >= from && num <= to;
    });
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`theme-${theme}`} style={{ minHeight: '100vh', transition: 'all 0.3s ease' }}>
      {/* Reader Control Header */}
      <div style={{
        position: 'sticky',
        top: 70,
        zIndex: 30,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-glass)',
        padding: '12px 24px'
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
          <button 
            onClick={onBack} 
            className="outline-btn"
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            <ArrowLeft size={15} />
            All Stories
          </button>

          {/* Reading Customization Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Font Size controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '3px 8px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-glass)' }}>
              <button 
                onClick={() => setFontSize(prev => Math.max(1.0, prev - 0.1))}
                style={{ color: 'var(--text-secondary)', padding: '2px 6px', fontSize: '0.8rem', fontWeight: 'bold' }}
                title="Decrease font size"
              >
                A-
              </button>
              <Type size={13} color="var(--text-muted)" />
              <button 
                onClick={() => setFontSize(prev => Math.min(1.7, prev + 0.1))}
                style={{ color: 'var(--text-secondary)', padding: '2px 6px', fontSize: '0.95rem', fontWeight: 'bold' }}
                title="Increase font size"
              >
                A+
              </button>
            </div>

            {/* Themes Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button 
                onClick={() => setTheme('midnight')}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#0a0d14',
                  border: theme === 'midnight' ? '2px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.2)'
                }}
                title="Midnight Dark Mode"
              />
              <button 
                onClick={() => setTheme('parchment')}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#f5efe6',
                  border: theme === 'parchment' ? '2px solid #b45309' : '1px solid rgba(0,0,0,0.2)'
                }}
                title="Parchment Sepia Mode"
              />
              <button 
                onClick={() => setTheme('celestial')}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#060b19',
                  border: theme === 'celestial' ? '2px solid #38bdf8' : '1px solid rgba(255,255,255,0.2)'
                }}
                title="Celestial Dusk Mode"
              />
            </div>

            {/* Mute All Music / Read in Silence Toggle Button */}
            {story.musicSegments && story.musicSegments.length > 0 && (
              <button
                onClick={toggleMute}
                className={isMuted ? 'outline-btn' : 'glow-btn'}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.82rem',
                  gap: '6px',
                  background: isMuted ? 'rgba(244, 63, 94, 0.1)' : undefined,
                  borderColor: isMuted ? 'rgba(244, 63, 94, 0.35)' : undefined,
                  color: isMuted ? '#fda4af' : undefined
                }}
                title={isMuted ? 'Unmute soundtrack (hear ambient music)' : 'Mute all soundtrack (read in silence)'}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                <span>{isMuted ? 'Muted (Read in Silence)' : 'Soundtrack On'}</span>
              </button>
            )}

            {/* Share link */}
            <button 
              onClick={copyShareLink}
              className="outline-btn"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              title="Share story link"
            >
              {copied ? <Check size={13} color="var(--accent-success)" /> : <Share2 size={13} />}
              {copied ? 'Copied' : 'Share'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Reader Canvas */}
      <div className="reader-container">
        {/* Story Metadata Header */}
        <div className="reader-header">
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
            <span className="badge badge-gold">{story.genre || 'Tale'}</span>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>
              {story.readTimeMinutes || 3} min read
            </span>
          </div>

          <h1 className="reader-title font-heading">{story.title}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontStyle: 'italic' }}>
            Penned by {story.author || 'Anonymous Curator'}
          </p>

          {/* Ambient Soundtrack Status Banner */}
          {story.musicSegments && story.musicSegments.length > 0 && (
            <div 
              className="glass-panel" 
              style={{ 
                marginTop: '28px', 
                padding: '14px 20px', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '14px',
                textAlign: 'left',
                maxWidth: '620px'
              }}
            >
              <div style={{ 
                width: '36px', 
                height: '36px', 
                borderRadius: '50%', 
                background: isMuted ? 'rgba(244, 63, 94, 0.15)' : 'rgba(212, 175, 55, 0.15)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: isMuted ? 'var(--accent-danger)' : 'var(--accent-gold)'
              }}>
                {isMuted ? <VolumeX size={18} /> : <Music size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {isMuted 
                    ? 'Silent Reading Mode (Sound Muted)' 
                    : `${story.musicSegments.length} ambient tracks automatically play as you scroll.`}
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {isMuted 
                    ? 'All background music is silenced. Click unmute whenever you wish to listen.' 
                    : 'Scroll through lines to trigger synchronized ambient soundtrack.'}
                </p>
              </div>

              <button 
                className={isMuted ? 'glow-btn' : 'outline-btn'}
                style={{ padding: '6px 14px', fontSize: '0.8rem', marginLeft: 'auto' }}
                onClick={toggleMute}
              >
                {isMuted ? <Volume2 size={13} /> : <VolumeX size={13} />}
                {isMuted ? 'Enable Sound' : 'Mute Music'}
              </button>
            </div>
          )}
        </div>

        {/* Story Lines Container */}
        <article className="reader-body" style={{ fontSize: `${fontSize}rem` }}>
          {lines.map((lineText, index) => {
            const lineNum = index + 1;
            const segment = getLineMusic(lineNum);
            const isCurrent = lineNum === activeLine;
            const isEmpty = !lineText.trim();

            return (
              <div 
                key={index} 
                ref={el => lineRefs.current[index] = el}
                data-line={lineNum}
                className={`reader-line ${segment ? 'has-music' : ''} ${isCurrent ? 'active-reading' : ''}`}
                onClick={() => handleLineClick(lineNum)}
                style={{ cursor: 'pointer', minHeight: isEmpty ? '1.5em' : undefined }}
                title={segment ? `Line ${lineNum} (Soundtrack: ${segment.title})` : `Line ${lineNum}`}
              >
                <span className="reader-line-num">
                  {segment ? (
                    <span 
                      style={{ 
                        color: isCurrent ? 'var(--accent-gold)' : 'rgba(212, 175, 55, 0.75)',
                        marginRight: '3px',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                      title={`Scored: ${segment.title}`}
                    >
                      🎵
                    </span>
                  ) : null}
                  {lineNum}
                </span>
                {isEmpty ? <span style={{ opacity: 0 }}>&nbsp;</span> : lineText}
              </div>
            );
          })}
        </article>

        {/* Story Footnote & Completed Banner */}
        <div style={{ 
          marginTop: '60px', 
          paddingTop: '32px', 
          borderTop: '1px solid var(--border-glass)', 
          textAlign: 'center' 
        }}>
          <div style={{ width: '40px', height: '2px', background: 'var(--accent-gold)', margin: '0 auto 24px auto' }} />
          <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: '24px' }}>
            ~ Finis ~
          </p>
          <button className="glow-btn" onClick={onBack}>
            <BookOpen size={16} />
            Explore More Tales
          </button>
        </div>
      </div>
    </div>
  );
};
