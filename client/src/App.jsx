import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AudioPlayer } from './components/AudioPlayer';
import { Home } from './pages/Home';
import { StoryReader } from './pages/StoryReader';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';
import { StoryEditor } from './pages/StoryEditor';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';

export function App() {
  const [currentView, setCurrentView] = useState('home'); // home | reader | login | dashboard | create | edit
  const [selectedStory, setSelectedStory] = useState(null);
  const [editingStory, setEditingStory] = useState(null);

  const { isAuthenticated, loading } = useAuth();

  // Handle URL hash or direct slug navigation if user visits with #/story/:slug
  useEffect(() => {
    const handleHashChange = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/story/')) {
        const slug = hash.replace('#/story/', '');
        try {
          const story = await api.getPublicStory(slug);
          setSelectedStory(story);
          setCurrentView('reader');
        } catch (err) {
          console.warn('Could not load story from hash:', err);
          window.location.hash = '';
        }
      } else if (hash === '#/login') {
        setCurrentView('login');
      } else if (hash === '#/dashboard' && isAuthenticated) {
        setCurrentView('dashboard');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isAuthenticated]);

  // Navigate handler with hash sync
  const handleNavigate = (view) => {
    setCurrentView(view);
    if (view === 'home') {
      window.location.hash = '';
      setSelectedStory(null);
      setEditingStory(null);
    } else if (view === 'login') {
      window.location.hash = '#/login';
    } else if (view === 'dashboard') {
      window.location.hash = '#/dashboard';
    } else if (view === 'create') {
      setEditingStory(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectStory = (story) => {
    setSelectedStory(story);
    setCurrentView('reader');
    window.location.hash = `#/story/${story.slug || story._id || story.id}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditStory = (story) => {
    setEditingStory(story);
    setCurrentView('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveSuccess = (savedStory) => {
    // Return to dashboard after saving
    handleNavigate('dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Navbar currentView={currentView} onNavigate={handleNavigate} />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {currentView === 'home' && (
          <Home 
            onSelectStory={handleSelectStory}
            onNavigate={handleNavigate}
          />
        )}

        {currentView === 'reader' && selectedStory && (
          <StoryReader 
            story={selectedStory}
            onBack={() => handleNavigate('home')}
          />
        )}

        {currentView === 'login' && (
          <AdminLogin 
            onLoginSuccess={() => handleNavigate('dashboard')}
            onBackToHome={() => handleNavigate('home')}
          />
        )}

        {currentView === 'dashboard' && (
          <AdminDashboard 
            onCreateStory={() => handleNavigate('create')}
            onEditStory={handleEditStory}
            onReadStory={handleSelectStory}
          />
        )}

        {(currentView === 'create' || currentView === 'edit') && (
          <StoryEditor 
            initialStory={editingStory}
            onSaveSuccess={handleSaveSuccess}
            onPreviewStory={(previewStory) => {
              setSelectedStory(previewStory);
              setCurrentView('reader');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onCancel={() => handleNavigate(isAuthenticated ? 'dashboard' : 'home')}
          />
        )}
      </main>

      {/* Floating Audio Player HUD */}
      <AudioPlayer />
    </div>
  );
}
export default App;
