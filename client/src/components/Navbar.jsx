import React from 'react';
import { BookOpen, Feather, Shield, LogOut, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({ currentView, onNavigate }) => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="navbar-wrap">
      <div className="container navbar-container">
        {/* Brand */}
        <div 
          className="nav-brand" 
          style={{ cursor: 'pointer' }}
          onClick={() => onNavigate('home')}
        >
          <div className="nav-brand-icon">
            <BookOpen size={20} />
          </div>
          <div>
            <span className="gold-gradient-text" style={{ fontWeight: 800, fontSize: '1.25rem' }}>
              SYMPHONY
            </span>
            <span style={{ fontSize: '0.85rem', letterSpacing: '0.15em', display: 'block', color: 'var(--text-muted)', lineHeight: 1 }}>
              TALES & SOUNDS
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="nav-links">
          <button 
            className={`nav-link ${currentView === 'home' ? 'active' : ''}`}
            onClick={() => onNavigate('home')}
          >
            <Compass size={16} />
            Explore
          </button>

          {isAuthenticated ? (
            <>
              <button 
                className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`}
                onClick={() => onNavigate('dashboard')}
              >
                <Shield size={16} />
                Dashboard
              </button>
              
              <button 
                className="glow-btn"
                style={{ padding: '7px 16px', fontSize: '0.85rem' }}
                onClick={() => onNavigate('create')}
              >
                <Feather size={15} />
                Write Tale
              </button>

              <button 
                className="outline-btn"
                style={{ padding: '6px 12px', fontSize: '0.82rem', borderColor: 'rgba(244, 63, 94, 0.3)', color: '#fda4af' }}
                onClick={() => {
                  logout();
                  onNavigate('home');
                }}
                title={`Logged in as ${user?.username}`}
              >
                <LogOut size={14} />
                Logout
              </button>
            </>
          ) : (
            <button 
              className="outline-btn"
              style={{ padding: '7px 16px', fontSize: '0.85rem' }}
              onClick={() => onNavigate('login')}
            >
              <Shield size={15} />
              Admin Portal
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};
