import React from 'react';
import { BookOpen, Clock, Music, ArrowRight, Eye } from 'lucide-react';

export const StoryCard = ({ story, onSelect }) => {
  const musicCount = story.musicSegments ? story.musicSegments.length : 0;

  return (
    <div className="story-card" onClick={() => onSelect(story)}>
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <img 
          src={story.coverImage || 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=1200&q=80'} 
          alt={story.title}
          className="story-card-cover"
          loading="lazy"
        />
        <div className="story-card-overlay" />
        
        {/* Genre tag */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
          <span className="badge badge-gold">
            {story.genre || 'Tale'}
          </span>
          {musicCount > 0 && (
            <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
              <Music size={11} />
              {musicCount} {musicCount === 1 ? 'Track' : 'Tracks'}
            </span>
          )}
        </div>
      </div>

      <div className="story-card-body">
        <h3 className="story-card-title">{story.title}</h3>
        <p className="story-card-summary">{story.summary || 'A tale awaiting your discovery...'}</p>

        <div className="story-card-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={13} />
              {story.readTimeMinutes || 3} min read
            </span>
            {story.viewCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Eye size={13} />
                {story.viewCount}
              </span>
            )}
          </div>

          <span 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '4px', 
              fontWeight: 600, 
              color: 'var(--accent-gold)',
              fontSize: '0.85rem'
            }}
          >
            Read <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </div>
  );
};
