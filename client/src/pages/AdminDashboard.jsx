import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  CheckCircle, 
  Clock, 
  Music, 
  BookOpen, 
  Layers,
  Search,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export const AdminDashboard = ({ onEditStory, onCreateStory, onReadStory }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all | published | draft
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const fetchStories = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminStories({
        status: filterStatus,
        search: searchQuery
      });
      setStories(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load stories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchStories, 200);
    return () => clearTimeout(timer);
  }, [filterStatus, searchQuery]);

  // Toggle status between draft and published
  const handleToggleStatus = async (id) => {
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      const updated = await api.toggleStoryStatus(id);
      setStories(prev => prev.map(s => (s._id === id || s.id === id) ? updated : s));
    } catch (err) {
      alert('Error updating status: ' + err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Delete story
  const handleDeleteStory = async (id, title) => {
    if (!window.confirm(`Are you sure you wish to delete "${title}"? This cannot be undone.`)) {
      return;
    }
    setActionLoading(prev => ({ ...prev, [id]: true }));
    try {
      await api.deleteStory(id);
      setStories(prev => prev.filter(s => s._id !== id && s.id !== id));
    } catch (err) {
      alert('Error deleting story: ' + err.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  // Compute stats
  const totalCount = stories.length;
  const publishedCount = stories.filter(s => s.status === 'published').length;
  const draftCount = stories.filter(s => s.status === 'draft').length;
  const totalViews = stories.reduce((acc, s) => acc + (s.viewCount || 0), 0);

  return (
    <div className="container" style={{ padding: '40px 20px 80px 20px' }}>
      {/* Header & Quick Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Curator Studio</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Manage published archives, refine drafts, and craft musical storytelling experiences.
          </p>
        </div>

        <button className="glow-btn" onClick={onCreateStory}>
          <Plus size={18} />
          Create New Tale
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '18px', marginBottom: '36px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Stories</span>
            <Layers size={18} color="var(--accent-gold)" />
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '8px' }}>{totalCount}</p>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Live to Readers</span>
            <CheckCircle size={18} color="var(--accent-success)" />
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '8px', color: 'var(--accent-success)' }}>{publishedCount}</p>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Drafts in Progress</span>
            <Clock size={18} color="var(--text-accent)" />
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '8px', color: 'var(--text-accent)' }}>{draftCount}</p>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Reader Views</span>
            <Eye size={18} color="var(--accent-cyan)" />
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 700, marginTop: '8px' }}>{totalViews}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={filterStatus === 'all' ? 'glow-btn' : 'outline-btn'}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            onClick={() => setFilterStatus('all')}
          >
            All Stories
          </button>
          <button 
            className={filterStatus === 'published' ? 'glow-btn' : 'outline-btn'}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            onClick={() => setFilterStatus('published')}
          >
            Published
          </button>
          <button 
            className={filterStatus === 'draft' ? 'glow-btn' : 'outline-btn'}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            onClick={() => setFilterStatus('draft')}
          >
            Drafts
          </button>
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Filter by title..."
            className="form-input"
            style={{ paddingLeft: '36px', padding: '8px 12px 8px 36px', fontSize: '0.85rem' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Stories Table/List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <p>Loading catalog entries...</p>
        </div>
      ) : stories.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <BookOpen size={36} color="var(--text-muted)" style={{ marginBottom: '12px' }} />
          <h3>No stories found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '8px 0 20px 0' }}>
            Start crafting your first story with synchronized music segments.
          </p>
          <button className="glow-btn" onClick={onCreateStory}>
            <Plus size={16} /> Write First Tale
          </button>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '14px 20px' }}>Title & Genre</th>
                  <th style={{ padding: '14px 20px' }}>Status</th>
                  <th style={{ padding: '14px 20px' }}>Music Cues</th>
                  <th style={{ padding: '14px 20px' }}>Lines</th>
                  <th style={{ padding: '14px 20px' }}>Views</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stories.map(story => {
                  const id = story._id || story.id;
                  const musicCount = story.musicSegments ? story.musicSegments.length : 0;
                  const lineCount = story.lines ? story.lines.length : story.content.split('\n').length;
                  const isPublished = story.status === 'published';

                  return (
                    <tr key={id} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.98rem' }}>
                          {story.title}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{story.genre}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• {story.author}</span>
                        </div>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <button
                          onClick={() => handleToggleStatus(id)}
                          disabled={actionLoading[id]}
                          className={isPublished ? 'badge badge-published' : 'badge badge-draft'}
                          style={{ cursor: 'pointer', border: 'none', background: isPublished ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)' }}
                          title="Click to toggle status"
                        >
                          {actionLoading[id] ? 'Updating...' : (isPublished ? '● Published' : '○ Draft')}
                        </button>
                      </td>

                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: musicCount > 0 ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
                          <Music size={14} />
                          {musicCount} {musicCount === 1 ? 'Track' : 'Tracks'}
                        </span>
                      </td>

                      <td style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>
                        {lineCount} lines
                      </td>

                      <td style={{ padding: '16px 20px', color: 'var(--text-muted)' }}>
                        {story.viewCount || 0}
                      </td>

                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          {/* Preview / Read */}
                          <button
                            className="outline-btn"
                            style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                            onClick={() => onReadStory(story)}
                            title="Preview / Read Story"
                          >
                            <Eye size={13} />
                          </button>

                          {/* Edit */}
                          <button
                            className="outline-btn"
                            style={{ padding: '6px 10px', fontSize: '0.78rem', borderColor: 'rgba(212, 175, 55, 0.3)', color: 'var(--accent-gold)' }}
                            onClick={() => onEditStory(story)}
                            title="Open in Writing Pad"
                          >
                            <Edit3 size={13} />
                          </button>

                          {/* Delete */}
                          <button
                            className="outline-btn"
                            style={{ padding: '6px 10px', fontSize: '0.78rem', borderColor: 'rgba(244, 63, 94, 0.3)', color: '#fda4af' }}
                            onClick={() => handleDeleteStory(id, story.title)}
                            disabled={actionLoading[id]}
                            title="Delete Story"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
