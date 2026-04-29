'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, GraduationCap, LayoutDashboard, 
  Settings, LogOut, Search, Bell, Activity, Sparkles, Lock, MessageSquare, CreditCard, Bot,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const SIDEBAR_COLLAPSED_KEY = 'savra_sidebar_collapsed';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };
  
  // Security Layer Check
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    // Standard frontend static access control layer 
    if (localStorage.getItem('savra_secure_access') === 'granted') {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'savraedu') {
      localStorage.setItem('savra_secure_access', 'granted');
      setIsAuthenticated(true);
    } else {
      setError(true);
    }
  };
  
  const handleSignOut = () => {
     localStorage.removeItem('savra_secure_access');
     setIsAuthenticated(false);
  };

  // Only render nothing during the initial mount phase to prevent ugly flashing
  if (isAuthenticated === null) return <div style={{ height: '100vh', background: 'var(--background)' }} />;

  // Enforce Security Wall globally wrapped around the dashboard routes
  if (isAuthenticated === false) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '3rem', borderRadius: '1.25rem', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', maxWidth: '400px', width: '100%' }}>
          <div style={{ width: '48px', height: '48px', background: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', color: 'var(--primary)' }}>
            <Lock size={24} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Protected Dashboard</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginBottom: '2rem' }}>Please enter the master administrative key to launch the Savra platform metrics globally.</p>
          
          <form onSubmit={handleLogin}>
            <input 
              type="password"
              placeholder="Enter passcode..."
              value={password}
              onChange={(e) => {
                 setPassword(e.target.value);
                 setError(false);
              }}
              style={{ width: '100%', padding: '0.75rem 1rem', border: `1px solid ${error ? 'var(--danger)' : 'var(--card-border)'}`, borderRadius: '0.5rem', marginBottom: error ? '0.5rem' : '1.5rem', outline: 'none' }}
              autoFocus
            />
            {error && <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginBottom: '1.5rem', fontWeight: 500 }}>Incorrect password attempt.</p>}
            
            <button type="submit" style={{ width: '100%', padding: '0.75rem', background: 'var(--foreground)', color: 'var(--background)', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
               Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className={`sidebar${sidebarCollapsed ? ' sidebar--collapsed' : ''}`}>
        <div className="sidebar-header">
          <button
            type="button"
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-expanded={!sidebarCollapsed}
            aria-controls="dashboard-sidebar-nav"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
          {!sidebarCollapsed && (
            <>
              <div className="brand-logo">S</div>
              <div className="brand-name">Savra</div>
            </>
          )}
          {sidebarCollapsed && <div className="brand-logo" title="Savra">S</div>}
        </div>
        
        <nav id="dashboard-sidebar-nav" className="sidebar-nav">
          <div className="nav-label">Main Menu</div>
          <Link href="/" title="Dashboard" className={`nav-item ${pathname === '/' ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            <LayoutDashboard />
            <span>Dashboard</span>
          </Link>
          <Link href="/agent" title="AI Data Agent" className={`nav-item ${pathname === '/agent' ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            <Bot />
            <span>AI Data Agent</span>
          </Link>
          <Link href="/today" title="Today's Pulse" className={`nav-item ${pathname === '/today' ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            <Sparkles />
            <span>Today's Pulse</span>
          </Link>
          <Link href="/retention" title="Retention & Usage" className={`nav-item ${pathname === '/retention' ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            <Activity />
            <span>Retention & Usage</span>
          </Link>
          <Link href="/dau" title="Daily Active Users" className={`nav-item ${pathname === '/dau' ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            <Activity />
            <span>Daily Active Users</span>
          </Link>
          <Link href="/wau" title="Weekly Active Users" className={`nav-item ${pathname === '/wau' ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            <Activity />
            <span>Weekly Active Users</span>
          </Link>
          <Link href="/convertible" title="Convertible Users" className={`nav-item ${pathname === '/convertible' ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            <Sparkles />
            <span>Convertible Users</span>
          </Link>
          <Link href="/feedback" title="Feedback" className={`nav-item ${pathname === '/feedback' ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            <MessageSquare />
            <span>Feedback</span>
          </Link>
          <Link href="/teachers" title="Teachers Directory" className={`nav-item ${pathname === '/teachers' ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            <Users />
            <span>Teachers Directory</span>
          </Link>
          <Link href="/subscriptions" title="Subscriptions" className={`nav-item ${pathname === '/subscriptions' ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            <CreditCard />
            <span>Subscriptions</span>
          </Link>
          <Link href="/schools" title="Schools" className={`nav-item ${pathname === '/schools' ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
            <GraduationCap />
            <span>Schools</span>
          </Link>
          
          <div className="nav-label" style={{ marginTop: '1.5rem' }}>Preferences</div>
          <div className="nav-item" title="Settings">
            <Settings />
            <span>Settings</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div
            className="nav-item"
            role="button"
            tabIndex={0}
            onClick={handleSignOut}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSignOut();
              }
            }}
            title="Sign out"
            style={{ padding: '0.5rem', color: 'var(--danger)', cursor: 'pointer' }}
          >
            <LogOut />
            <span>Sign Out</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div style={{ position: 'relative', width: '300px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '10px', width: '16px', color: 'var(--muted)' }} />
            <input 
              type="text" 
              placeholder="Search anything..." 
              style={{ 
                width: '100%', padding: '0.5rem 1rem 0.5rem 2.5rem', 
                borderRadius: '9999px', border: '1px solid var(--card-border)',
                background: '#f8fafc', fontSize: '0.875rem', outline: 'none'
              }} 
            />
          </div>
          <div className="user-profile">
            <button style={{ background: 'none', border: 'none', position: 'relative', cursor: 'pointer', marginRight: '1rem', color: 'var(--muted)' }}>
              <Bell size={20} />
              <span style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%' }}></span>
            </button>
            <div style={{ textAlign: 'right' }}>
              <div className="user-name">Admin User</div>
              <div className="user-role">Platform Operations</div>
            </div>
            <div className="avatar">A</div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
