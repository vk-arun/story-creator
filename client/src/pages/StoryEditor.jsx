import React, { useState, useEffect, useRef } from 'react';
import { 
  Save, 
  Send, 
  ArrowLeft, 
  Music, 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  Volume2, 
  Sparkles, 
  Image as ImageIcon,
  Check,
  AlertCircle,
  Upload,
  FileAudio,
  Eye
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const PRESET_COVERS = [
  { label: 'Ancient Library', url: 'https://images.unsplash.com/photo-1507842229451-7f01be637b5a?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Deep Space Nebula', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Mystical Castle', url: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Enchanted Forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Foggy Ocean Coast', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80' }
];

export const StoryEditor = ({ initialStory, onSaveSuccess, onPreviewStory, onCancel }) => {
  const isEditing = !!initialStory;
  const { user } = useAuth();

  const [title, setTitle] = useState(initialStory?.title || '');
  const [content, setContent] = useState(initialStory?.content || '');
  const [summary, setSummary] = useState(initialStory?.summary || '');
  const [genre, setGenre] = useState(initialStory?.genre || 'Fantasy');
  const [coverImage, setCoverImage] = useState(
    initialStory?.coverImage || PRESET_COVERS[0].url
  );
  const [author, setAuthor] = useState(initialStory?.author || user?.username || '');
  const [musicSegments, setMusicSegments] = useState(
    initialStory?.musicSegments ? [...initialStory.musicSegments] : []
  );

  // New music segment form state
  const [musicSourceType, setMusicSourceType] = useState('upload'); // 'upload' | 'preset' | 'custom'
  const [presets, setPresets] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedUploadedUrl, setSelectedUploadedUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessName, setUploadSuccessName] = useState('');

  const [segTitle, setSegTitle] = useState('');
  const [fromLine, setFromLine] = useState(1);
  const [toLine, setToLine] = useState(5);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [customAudioUrl, setCustomAudioUrl] = useState('');
  const [segVolume, setSegVolume] = useState(0.7);

  // Previewing audio in editor
  const [previewingAudio, setPreviewingAudio] = useState(null); // url or null
  const previewAudioRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load presets & previously uploaded audio files
  useEffect(() => {
    const loadAudioSources = async () => {
      try {
        const [presetList, uploadList] = await Promise.all([
          api.getAudioPresets(),
          api.getUploadedAudio()
        ]);
        setPresets(presetList);
        setUploadedFiles(uploadList);

        if (uploadList.length > 0) {
          setSelectedUploadedUrl(uploadList[0].audioUrl);
          setSegTitle(uploadList[0].title);
        } else if (presetList.length > 0) {
          setSelectedPresetId(presetList[0].id);
          setSegTitle(presetList[0].title);
        }
      } catch (err) {
        console.warn('Could not load audio resources:', err);
      }
    };
    loadAudioSources();
  }, []);

  // Handle file upload from user's machine
  const handleAudioFileUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSuccessName('');
    setErrorMessage('');

    try {
      const data = await api.uploadAudio(file);
      setUploadSuccessName(file.name);
      setSegTitle(data.title);
      setSelectedUploadedUrl(data.audioUrl);

      // Add to uploaded files list
      setUploadedFiles(prev => [
        {
          filename: data.filename,
          title: data.title,
          audioUrl: data.audioUrl,
          size: data.size
        },
        ...prev.filter(f => f.audioUrl !== data.audioUrl)
      ]);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to upload audio file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Stop preview audio on unmount
  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = '';
      }
    };
  }, []);

  // Compute lines matching reader normalization
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const totalLines = Math.max(1, lines.length);

  // Helper to show text snippet of a line for unambiguous cue setting
  const getLineSnippet = (lineNum) => {
    const idx = parseInt(lineNum, 10) - 1;
    if (idx < 0 || idx >= lines.length) return '(Outside line count)';
    const text = (lines[idx] || '').trim();
    if (!text) return '(Empty blank line)';
    return text.length > 38 ? text.substring(0, 38) + '...' : text;
  };

  // Ensure all segments have strictly parsed numeric bounds
  const getCleanedSegments = () => {
    return musicSegments.map(seg => {
      const start = Math.max(1, parseInt(seg.fromLine, 10) || 1);
      const end = Math.max(start, parseInt(seg.toLine, 10) || start);
      return {
        ...seg,
        fromLine: start,
        toLine: end,
        volume: typeof seg.volume === 'number' ? seg.volume : 0.7
      };
    });
  };

  // Click on a line number in gutter to quickly set From or To line
  const handleGutterClick = (lineNum) => {
    if (!fromLine || fromLine > lineNum) {
      setFromLine(lineNum);
    } else if (lineNum > fromLine) {
      setToLine(lineNum);
    } else {
      setFromLine(lineNum);
    }
  };

  // Synchronize scrolling between gutter and textarea
  const handleTextareaScroll = (e) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Handle preset dropdown change
  const handlePresetChange = (presetId) => {
    setSelectedPresetId(presetId);
    if (presetId === 'custom') {
      setSegTitle('Custom Atmospheric Track');
    } else {
      const found = presets.find(p => p.id === presetId);
      if (found) {
        setSegTitle(found.title);
      }
    }
  };

  // Test-play preview audio
  const handleTogglePreview = (url) => {
    if (!url) return;

    if (previewingAudio === url) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewingAudio(null);
    } else {
      if (!previewAudioRef.current) {
        previewAudioRef.current = new Audio();
      }
      previewAudioRef.current.src = url;
      previewAudioRef.current.volume = segVolume;
      previewAudioRef.current.play()
        .then(() => setPreviewingAudio(url))
        .catch(err => {
          console.warn('Audio preview failed:', err);
          alert('Could not preview this audio file (check URL).');
        });
    }
  };

  // Add music segment
  const handleAddSegment = (e) => {
    e.preventDefault();

    let audioUrl = '';
    if (musicSourceType === 'upload') {
      audioUrl = selectedUploadedUrl;
      if (!audioUrl) {
        alert('Please choose or upload an audio file first.');
        return;
      }
    } else if (musicSourceType === 'preset') {
      const preset = presets.find(p => p.id === selectedPresetId);
      audioUrl = preset ? preset.url : '';
      if (!audioUrl) {
        alert('Please select an ambient preset.');
        return;
      }
    } else {
      audioUrl = customAudioUrl.trim();
      if (!audioUrl) {
        alert('Please enter a valid audio stream or MP3 URL.');
        return;
      }
    }

    const start = Math.max(1, parseInt(fromLine) || 1);
    const end = Math.max(start, parseInt(toLine) || start);

    const newSeg = {
      id: 'seg_' + Date.now().toString(36),
      title: segTitle.trim() || `Atmosphere (Lines ${start}-${end})`,
      audioUrl,
      fromLine: start,
      toLine: end,
      volume: segVolume,
      loop: true
    };

    setMusicSegments(prev => [...prev, newSeg]);

    // Reset form defaults for next segment
    setFromLine(end + 1);
    setToLine(end + 6);
  };

  // Remove music segment
  const handleRemoveSegment = (id) => {
    setMusicSegments(prev => prev.filter(s => s.id !== id));
  };

  // Update existing segment line range or volume
  const handleUpdateSegment = (id, key, value) => {
    setMusicSegments(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, [key]: value };
      }
      return s;
    }));
  };

  // Save story (draft or published)
  const handleSave = async (statusToSet) => {
    if (!title.trim()) {
      setErrorMessage('Please provide a story title.');
      return;
    }
    if (!content.trim()) {
      setErrorMessage('Please write some content in the writing pad.');
      return;
    }

    setErrorMessage('');
    setIsSaving(true);

    const cleanedSegments = getCleanedSegments();

    const isValidUrl = (url) => {
      if (!url || typeof url !== 'string') return false;
      const t = url.trim();
      return t.startsWith('http://') || t.startsWith('https://') || t.startsWith('data:image/') || t.startsWith('/uploads/');
    };

    const safeCoverImage = isValidUrl(coverImage) ? coverImage.trim() : PRESET_COVERS[0].url;

    const payload = {
      title: title.trim(),
      content,
      summary: summary.trim(),
      genre,
      coverImage: safeCoverImage,
      author: author.trim() || user?.username || 'Admin',
      status: statusToSet,
      musicSegments: cleanedSegments
    };

    try {
      let savedStory;
      if (isEditing) {
        const id = initialStory._id || initialStory.id;
        savedStory = await api.updateStory(id, payload);
      } else {
        savedStory = await api.createStory(payload);
      }

      if (statusToSet === 'published') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      onSaveSuccess(savedStory);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save story.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container" style={{ padding: '32px 20px 80px 20px' }}>
      {/* Top Action Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button className="outline-btn" onClick={onCancel} style={{ padding: '6px 12px' }}>
            <ArrowLeft size={16} />
            Back
          </button>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
              {isEditing ? 'Refine Tale & Scores' : 'Compose New Tale'}
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Draft your prose and orchestrate background music across designated line ranges.
            </p>
          </div>
        </div>

        {/* Action Buttons: Preview, Save Draft & Publish */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            type="button"
            className="outline-btn"
            style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: 'var(--accent-cyan)' }}
            onClick={() => {
              if (!content.trim()) {
                alert('Please write some content first to preview.');
                return;
              }
              onPreviewStory?.({
                title: title.trim() || 'Untitled Tale',
                content,
                summary,
                genre,
                coverImage,
                author: author.trim() || 'Curator',
                status: 'draft',
                lines: content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n'),
                musicSegments: getCleanedSegments(),
                readTimeMinutes: Math.max(1, Math.ceil(content.split(/\s+/).length / 180))
              });
            }}
            title="Preview reading experience with line-synced audio on scroll"
          >
            <Eye size={15} />
            Preview Story
          </button>

          <button 
            className="outline-btn"
            disabled={isSaving}
            onClick={() => handleSave('draft')}
          >
            <Save size={15} />
            {isSaving ? 'Saving...' : 'Save as Draft'}
          </button>

          <button 
            className="glow-btn"
            disabled={isSaving}
            onClick={() => handleSave('published')}
          >
            <Send size={15} />
            {isSaving ? 'Publishing...' : 'Publish to Readers'}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div style={{
          background: 'rgba(244, 63, 94, 0.15)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#fda4af',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Editor Main Grid */}
      <div className="editor-layout">
        {/* Left Column: Metadata & Writing Pad */}
        <div>
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
            {/* Title */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '0.95rem', fontWeight: 600 }}>Story Title</label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g. The Chronomancer's Lantern"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ fontSize: '1.25rem', fontFamily: 'var(--font-heading)', fontWeight: 700 }}
              />
            </div>

            {/* Metadata row: Genre, Author, Cover Preset */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label className="form-label">Genre</label>
                <select className="form-select" value={genre} onChange={(e) => setGenre(e.target.value)}>
                  <option value="Fantasy">Fantasy</option>
                  <option value="Sci-Fi">Sci-Fi</option>
                  <option value="Mystery">Mystery</option>
                  <option value="Romance">Romance</option>
                  <option value="Adventure">Adventure</option>
                  <option value="Horror">Horror</option>
                  <option value="Poetry">Poetry</option>
                  <option value="Philosophy">Philosophy</option>
                </select>
              </div>

              <div>
                <label className="form-label">Author / Pen Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={author} 
                  onChange={(e) => setAuthor(e.target.value)} 
                />
              </div>

              <div>
                <label className="form-label">Cover Artwork Presets</label>
                <select 
                  className="form-select" 
                  onChange={(e) => setCoverImage(e.target.value)}
                  value={coverImage}
                >
                  {PRESET_COVERS.map(c => (
                    <option key={c.url} value={c.url}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cover Image URL */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Cover Image URL</label>
                {coverImage && !coverImage.startsWith('http') && !coverImage.startsWith('/uploads') && (
                  <span style={{ color: 'var(--accent-gold)', fontSize: '0.75rem' }}>
                    Tip: Enter a full https:// image URL or pick a preset above
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="url"
                  className="form-input"
                  placeholder="https://images.unsplash.com/..."
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  style={{ flex: 1 }}
                />
                <div 
                  style={{ 
                    width: '60px', 
                    height: '42px', 
                    borderRadius: 'var(--radius-sm)', 
                    overflow: 'hidden', 
                    flexShrink: 0,
                    border: '1px solid var(--border-glass)',
                    background: 'var(--bg-surface-elevated)'
                  }}
                  title="Cover preview"
                >
                  <img 
                    src={coverImage || PRESET_COVERS[0].url} 
                    alt="Cover preview" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => {
                      e.currentTarget.src = PRESET_COVERS[0].url;
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Synopsis / Excerpt */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Brief Synopsis / Card Excerpt</label>
              <textarea 
                className="form-textarea" 
                rows="2"
                placeholder="A compelling glimpse into your story for readers browsing the catalog..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
          </div>

          {/* Writing Pad */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.1rem' }}>Writing Pad</h3>
                <span className="badge badge-gold" style={{ fontSize: '0.7rem' }}>
                  {totalLines} {totalLines === 1 ? 'Line' : 'Lines'}
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Tip: Line numbers on the left correspond to your music cues.
              </span>
            </div>

            <div className="writing-pad-container">
              {/* Line number gutter with synchronized scrolling & click to assign */}
              <div className="gutter" ref={gutterRef}>
                {lines.map((_, idx) => {
                  const lineNum = idx + 1;
                  const matchingSeg = musicSegments.find(s => {
                    const from = parseInt(s.fromLine, 10);
                    const to = parseInt(s.toLine, 10);
                    return !isNaN(from) && !isNaN(to) && lineNum >= from && lineNum <= to;
                  });
                  return (
                    <div 
                      key={idx} 
                      className={`gutter-number ${matchingSeg ? 'has-music' : ''}`}
                      onClick={() => handleGutterClick(lineNum)}
                      title={matchingSeg ? `Line ${lineNum}: "${matchingSeg.title}". Click to select.` : `Line ${lineNum}. Click to set cue.`}
                    >
                      {matchingSeg ? <span style={{ color: 'var(--accent-gold)', marginRight: 2, fontSize: '0.72rem' }}>🎵</span> : null}
                      {lineNum}
                    </div>
                  );
                })}
              </div>

              {/* Story Text Area */}
              <textarea 
                ref={textareaRef}
                className="writing-pad-textarea"
                placeholder="Once upon an age of forgotten stars... (press enter to create new lines)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onScroll={handleTextareaScroll}
                spellCheck="false"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Music & Soundscape Segment Manager */}
        <div>
          {/* Add Music Form */}
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Music size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Add Music to Lines</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Assign ambient audio to a range of lines
                </p>
              </div>
            </div>

            <form onSubmit={handleAddSegment}>
              {/* Line Range: From -> To */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label className="form-label">From Line #</label>
                  <input 
                    type="number" 
                    min="1"
                    className="form-input"
                    placeholder="1"
                    value={fromLine}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFromLine(val === '' ? '' : parseInt(val, 10));
                    }}
                    onBlur={() => {
                      if (fromLine === '' || isNaN(fromLine) || fromLine < 1) {
                        setFromLine(1);
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="form-label">To Line #</label>
                  <input 
                    type="number" 
                    min="1"
                    className="form-input"
                    placeholder="5"
                    value={toLine}
                    onChange={(e) => {
                      const val = e.target.value;
                      setToLine(val === '' ? '' : parseInt(val, 10));
                    }}
                    onBlur={() => {
                      if (toLine === '' || isNaN(toLine) || toLine < 1) {
                        setToLine(fromLine || 1);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Live Snippet Preview for Selected Lines */}
              <div style={{
                marginBottom: '14px',
                padding: '10px 14px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-glass)',
                fontSize: '0.78rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: 'var(--accent-cyan)' }}>
                  <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Line {fromLine || 1} (Start):</span>
                  <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    "{getLineSnippet(fromLine || 1)}"
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-gold)' }}>
                  <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Line {toLine || fromLine || 1} (End):</span>
                  <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    "{getLineSnippet(toLine || fromLine || 1)}"
                  </span>
                </div>
              </div>

              {/* Audio Source Switcher */}
              <div style={{ marginBottom: '14px' }}>
                <label className="form-label">Sound Source</label>
                <div style={{ display: 'flex', gap: '6px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMusicSourceType('upload');
                      if (uploadedFiles.length > 0 && !selectedUploadedUrl) {
                        setSelectedUploadedUrl(uploadedFiles[0].audioUrl);
                        setSegTitle(uploadedFiles[0].title);
                      }
                    }}
                    className={musicSourceType === 'upload' ? 'glow-btn' : 'outline-btn'}
                    style={{ flex: 1, padding: '6px 8px', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    <Upload size={13} />
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMusicSourceType('preset');
                      if (presets.length > 0 && !selectedPresetId) {
                        setSelectedPresetId(presets[0].id);
                        setSegTitle(presets[0].title);
                      }
                    }}
                    className={musicSourceType === 'preset' ? 'glow-btn' : 'outline-btn'}
                    style={{ flex: 1, padding: '6px 8px', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    <Music size={13} />
                    Presets
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMusicSourceType('custom');
                      setSegTitle('Web Soundtrack');
                    }}
                    className={musicSourceType === 'custom' ? 'glow-btn' : 'outline-btn'}
                    style={{ flex: 1, padding: '6px 8px', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)' }}
                  >
                    URL
                  </button>
                </div>
              </div>

              {/* Source 1: Upload Audio File */}
              {musicSourceType === 'upload' && (
                <div style={{ marginBottom: '16px' }}>
                  <input 
                    type="file"
                    ref={fileInputRef}
                    accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.webm,.flac"
                    onChange={handleAudioFileUpload}
                    style={{ display: 'none' }}
                  />

                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed var(--border-accent)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'rgba(212, 175, 55, 0.04)',
                      transition: 'all 0.2s ease',
                      marginBottom: '10px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-gold)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-accent)'}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <Upload size={22} color="var(--accent-gold)" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {isUploading ? 'Uploading audio to studio...' : 'Click to select audio from computer'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Supports MP3, WAV, OGG, M4A, AAC (up to 30MB)
                      </span>
                    </div>
                  </div>

                  {uploadSuccessName && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      fontSize: '0.78rem', 
                      color: 'var(--accent-success)',
                      background: 'rgba(16, 185, 129, 0.1)',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '10px'
                    }}>
                      <Check size={14} />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Ready: {uploadSuccessName}
                      </span>
                    </div>
                  )}

                  {/* Pick from previously uploaded files */}
                  {uploadedFiles.length > 0 && (
                    <div>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Or pick from uploaded library ({uploadedFiles.length})</label>
                      <select 
                        className="form-select"
                        value={selectedUploadedUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedUploadedUrl(val);
                          const found = uploadedFiles.find(f => f.audioUrl === val);
                          if (found) setSegTitle(found.title);
                        }}
                      >
                        {uploadedFiles.map(f => (
                          <option key={f.audioUrl} value={f.audioUrl}>
                            {f.title} ({Math.round(f.size / 1024)} KB)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Source 2: Curated Presets */}
              {musicSourceType === 'preset' && (
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Choose Ambient Soundscape</label>
                  <select 
                    className="form-select"
                    value={selectedPresetId}
                    onChange={(e) => handlePresetChange(e.target.value)}
                  >
                    {presets.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.mood})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Source 3: Custom Audio URL */}
              {musicSourceType === 'custom' && (
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label className="form-label">Audio URL (.mp3 or stream)</label>
                  <input 
                    type="url"
                    className="form-input"
                    placeholder="https://example.com/soundtrack.mp3"
                    value={customAudioUrl}
                    onChange={(e) => setCustomAudioUrl(e.target.value)}
                  />
                </div>
              )}

              {/* Track Title */}
              <div className="form-group" style={{ marginBottom: '14px' }}>
                <label className="form-label">Track Label</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. Forest Shadows"
                  value={segTitle}
                  onChange={(e) => setSegTitle(e.target.value)}
                />
              </div>

              {/* Volume Slider */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <span>Volume</span>
                  <span>{Math.round(segVolume * 100)}%</span>
                </div>
                <input 
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={segVolume}
                  onChange={(e) => setSegVolume(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-cyan)', marginTop: '6px' }}
                />
              </div>

              {/* Preview & Add Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  type="button" 
                  className="outline-btn"
                  style={{ flex: 1, padding: '8px' }}
                  onClick={() => {
                    const activeAudioUrl = 
                      musicSourceType === 'upload' ? selectedUploadedUrl :
                      musicSourceType === 'preset' ? (presets.find(p => p.id === selectedPresetId)?.url || '') :
                      customAudioUrl;
                    handleTogglePreview(activeAudioUrl);
                  }}
                >
                  {previewingAudio ? <Pause size={14} /> : <Play size={14} />}
                  {previewingAudio ? 'Pause' : 'Test Sound'}
                </button>

                <button 
                  type="submit" 
                  className="glow-btn"
                  style={{ flex: 1.5, padding: '8px', background: 'linear-gradient(135deg, #38bdf8, #0284c7)', color: '#fff' }}
                >
                  <Plus size={14} />
                  Add to Story
                </button>
              </div>
            </form>
          </div>

          {/* List of Attached Segments */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Orchestrated Tracks</h3>
              <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                {musicSegments.length} {musicSegments.length === 1 ? 'Track' : 'Tracks'}
              </span>
            </div>

            {musicSegments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Music size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p>No audio assigned yet.</p>
                <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                  Use the form above to pair music with lines 1 to {totalLines}.
                </p>
              </div>
            ) : (
              <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                {musicSegments.map((seg, idx) => (
                  <div key={seg.id || idx} className="music-segment-card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {seg.title}
                        </div>
                        <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', fontSize: '0.7rem', padding: '2px 8px', marginTop: '4px' }}>
                          Lines {seg.fromLine} → {seg.toLine}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                          "{getLineSnippet(seg.fromLine)}" → "{getLineSnippet(seg.toLine)}"
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        {/* Preview play/pause */}
                        <button 
                          onClick={() => handleTogglePreview(seg.audioUrl)}
                          className="outline-btn"
                          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                          title="Preview audio"
                        >
                          {previewingAudio === seg.audioUrl ? <Pause size={12} /> : <Play size={12} />}
                        </button>

                        {/* Delete track */}
                        <button 
                          onClick={() => handleRemoveSegment(seg.id)}
                          className="outline-btn"
                          style={{ padding: '4px 8px', fontSize: '0.72rem', borderColor: 'rgba(244, 63, 94, 0.3)', color: '#fda4af' }}
                          title="Remove soundtrack"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Quick Edit Line Range */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                      <span>From:</span>
                      <input 
                        type="number"
                        min="1"
                        style={{ width: '56px', padding: '3px 6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', borderRadius: '4px', color: '#fff' }}
                        value={seg.fromLine}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateSegment(seg.id, 'fromLine', val === '' ? '' : parseInt(val, 10));
                        }}
                        onBlur={() => {
                          if (seg.fromLine === '' || isNaN(seg.fromLine) || seg.fromLine < 1) {
                            handleUpdateSegment(seg.id, 'fromLine', 1);
                          }
                        }}
                      />
                      <span>To:</span>
                      <input 
                        type="number"
                        min="1"
                        style={{ width: '56px', padding: '3px 6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-glass)', borderRadius: '4px', color: '#fff' }}
                        value={seg.toLine}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateSegment(seg.id, 'toLine', val === '' ? '' : parseInt(val, 10));
                        }}
                        onBlur={() => {
                          if (seg.toLine === '' || isNaN(seg.toLine) || seg.toLine < 1) {
                            handleUpdateSegment(seg.id, 'toLine', seg.fromLine || 1);
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
