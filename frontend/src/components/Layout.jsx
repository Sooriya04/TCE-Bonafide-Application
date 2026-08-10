import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/tce_logo.png';

export default function Layout({ children, onLogout, user }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navLinkStyle = (path) => ({
    fontSize: '0.875rem',
    fontWeight: '600',
    color: isActive(path) ? 'var(--accent)' : 'var(--text-muted)',
    textDecoration: 'none',
    borderBottom: isActive(path) ? '2px solid var(--accent)' : '2px solid transparent',
    paddingBottom: '2px',
    transition: 'color 0.15s',
  });

  return (
    <div className={user ? 'logged-in' : 'logged-out'} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {user && (
        <header>
          {/* Logo */}
          <Link to={user.role === 'admin' ? '/admin' : (user.role === 'dev' || user.role === 'developer' ? '/admin/dev' : '/form')} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <img src={logo} alt="TCE" style={{ height: '38px', width: 'auto', display: 'block' }} />
          </Link>

          {/* Desktop Nav */}
          <nav className="header-nav-desktop">
            {user.role === 'admin' ? (
              <Link to="/admin" style={navLinkStyle('/admin')}>Dashboard</Link>
            ) : user.role === 'dev' || user.role === 'developer' ? (
              <Link to="/admin/dev" style={navLinkStyle('/admin/dev')}>Developer Console</Link>
            ) : (
              <>
                <Link to="/form" style={navLinkStyle('/form')}>Apply</Link>
                <Link to="/history" style={navLinkStyle('/history')}>My Requests</Link>
              </>
            )}
          </nav>

          {/* Right side: avatar + sign out */}
          <div className="header-right-desktop">
            <div
              className="avatar"
              title={`${user.name || 'User'} — ${user.email} (${user.role})`}
            >
              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <button className="btn-signout" onClick={onLogout}>
              Sign Out
            </button>
          </div>

          {/* Mobile: avatar + hamburger */}
          <div className="header-mobile-right">
            <div className="avatar" title={user.email}>
              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <button
              className="hamburger"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </header>
      )}

      {/* Mobile dropdown menu */}
      {user && menuOpen && (
        <div className="mobile-menu">
          {user.role === 'admin' ? (
            <Link to="/admin" className="mobile-menu-link" onClick={() => setMenuOpen(false)}>Dashboard</Link>
          ) : user.role === 'dev' || user.role === 'developer' ? (
            <Link to="/admin/dev" className="mobile-menu-link" onClick={() => setMenuOpen(false)}>Developer Console</Link>
          ) : (
            <>
              <Link to="/form" className="mobile-menu-link" onClick={() => setMenuOpen(false)}>Apply for Certificate</Link>
              <Link to="/history" className="mobile-menu-link" onClick={() => setMenuOpen(false)}>My Requests</Link>
            </>
          )}
          <div style={{ borderTop: '1px solid var(--border)', margin: '8px 0' }} />
          <div style={{ padding: '8px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user.email} ({user.role})</div>
          <button
            className="mobile-menu-link"
            style={{ color: 'var(--error)', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}
            onClick={() => { setMenuOpen(false); onLogout(); }}
          >
            Sign Out
          </button>
        </div>
      )}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {children}
      </main>
    </div>
  );
}
