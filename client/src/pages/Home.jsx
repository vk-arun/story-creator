import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Sparkles, Music, BookOpen, Volume2, ArrowRight, RefreshCw } from 'lucide-react';
import { StoryCard } from '../components/StoryCard';
import { api } from '../services/api';

const GENRES = ['All', 'Fantasy', 'Sci-Fi', 'Mystery', 'Romance', 'Adventure', 'Horror', 'Philosophy'];

export const Home = ({ onSelectStory, onNavigate }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const retryTimeoutRef = useRef(null);

  const fetchStories = useCallback(async (isManualRetry = false, retryAttempt = 0) => {
    setLoading(true);
    if (isManualRetry) setError(null);

    try {
      const data = await api.getPublicStories({
        genre: selectedGenre,
        search: searchQuery.trim()
      });
      const list = Array.isArray(data) ? data : [];
      setStories(list);
      setError(null);
      setLoading(false);

      // If empty on initial unfiltered load, the server might still be connecting to Atlas.
      // Automatically retry in background up to 2 times without requiring the user to refresh!
      if (list.length === 0 && !searchQuery.trim() && selectedGenre === 'All' && retryAttempt < 2) {
        retryTimeoutRef.current = setTimeout(() => {
          fetchStories(false, retryAttempt + 1);
        }, 1200);
      }
    } catch (err) {
      if (retryAttempt < 2 && !searchQuery.trim() && selectedGenre === 'All') {
        retryTimeoutRef.current = setTimeout(() => {
          fetchStories(false, retryAttempt + 1);
        }, 1200);
      } else {
        setError(err.message || 'Failed to load stories');
        setLoading(false);
      }
    }
  }, [selectedGenre, searchQuery]);

  useEffect(() => {
    // If user is actively typing a search query, debounce by 250ms
    // Otherwise on initial mount or genre pill click, fetch immediately!
    if (searchQuery.trim()) {
      const timer = setTimeout(() => fetchStories(false, 0), 250);
      return () => {
        clearTimeout(timer);
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      };
    } else {
      fetchStories(false, 0);
      return () => {
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      };
    }
  }, [selectedGenre, searchQuery, fetchStories]);

  return (
    <div className="container" style={{ paddingBottom: '80px' }}>
      {/* Hero Banner */}
      <section style={{ textAlign: 'center', padding: '64px 20px 48px 20px' }}>
        <div 
          className="badge badge-gold" 
          style={{ marginBottom: '16px', display: 'inline-flex', padding: '6px 14px' }}
        >
          <Sparkles size={13} />
          The Living Storybook Experience
        </div>

        <h1 style={{ 
          fontSize: 'clamp(2.4rem, 6vw, 4rem)', 
          fontWeight: 800, 
          maxWidth: '850px', 
          margin: '0 auto 20px auto' 
        }}>
          Stories that <span className="gold-gradient-text">breathe</span> through <span style={{ color: 'var(--accent-cyan)' }}>sound</span>.
        </h1>

        <p style={{ 
          fontSize: '1.15rem', 
          color: 'var(--text-secondary)', 
          maxWidth: '640px', 
          margin: '0 auto 36px auto',
          lineHeight: 1.7
        }}>
          Step into crafted tales where ambient scores and musical themes shift in real-time as you read through designated lines.
        </p>

        {/* Feature Pill Highlights */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-gold)' }} />
            Line-by-line audio crossfades
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }} />
            Distraction-free reading canvas
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-purple)' }} />
            Curated soundscapes & admin composer
          </div>
        </div>

        {/* Search Input */}
        <div style={{ maxWidth: '520px', margin: '0 auto', position: 'relative' }}>
          <Search 
            size={18} 
            style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
          />
          <input 
            type="text"
            className="form-input"
            placeholder="Search stories by title or synopsis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '46px', borderRadius: 'var(--radius-full)', background: 'var(--bg-surface)' }}
          />
        </div>
      </section>

      {/* Genre Filter Pills */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {GENRES.map(g => (
          <button
            key={g}
            className={selectedGenre === g ? 'glow-btn' : 'outline-btn'}
            style={{ padding: '7px 18px', fontSize: '0.85rem' }}
            onClick={() => setSelectedGenre(g)}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Stories Catalog */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <div className="audio-visualizer" style={{ marginBottom: '16px' }}>
            <div className="audio-bar" />
            <div className="audio-bar" />
            <div className="audio-bar" />
            <div className="audio-bar" />
          </div>
          <p>Unfolding the archives...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', maxWidth: '500px', margin: '40px auto' }}>
          <p style={{ color: 'var(--accent-danger)', marginBottom: '16px' }}>{error}</p>
          <button 
            className="glow-btn" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            onClick={() => fetchStories(true, 0)}
          >
            <RefreshCw size={14} /> Retry Loading
          </button>
        </div>
      ) : stories.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', maxWidth: '560px', margin: '40px auto' }}>
          <BookOpen size={42} color="var(--accent-gold)" style={{ opacity: 0.7, marginBottom: '16px' }} />
          <h3 style={{ fontSize: '1.4rem', marginBottom: '10px' }}>No stories found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px' }}>
            {searchQuery ? `No matches for "${searchQuery}". Try a different keyword.` : 'Stories are published via the Admin Studio. Click below to refresh or check your published tales.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              className="glow-btn" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              onClick={() => { setSearchQuery(''); setSelectedGenre('All'); fetchStories(true, 0); }}
            >
              <RefreshCw size={14} /> Refresh Stories
            </button>
            <button className="outline-btn" onClick={() => onNavigate('login')}>
              Admin Portal
            </button>
          </div>
        </div>
      ) : (
        <div className="stories-grid">
          {stories.map(story => (
            <StoryCard 
              key={story._id || story.id} 
              story={story} 
              onSelect={onSelectStory} 
            />
          ))}
        </div>
      )}
    </div>
  );
};
