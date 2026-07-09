import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/axios';
import { Bell, LogOut, User, Ticket, Moon, Sun, ChevronDown, PanelRightClose, Wallet, Globe, ExternalLink } from 'lucide-react';

export default function Navbar({ sidebarOpen, setSidebarOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notif, setNotif] = useState({ unread: 0, notifications: [] });
  const [showNotif, setShowNotif] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') !== 'light');
  const [siteUrl, setSiteUrl] = useState('');
  const notifRef = useRef();
  const accountRef = useRef();

  useEffect(() => {
    api('/site-url').then(d => setSiteUrl(d.url)).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) api('/notifications').then(setNotif).catch(() => {});
  }, [user]);

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    const isDark = theme !== 'light';
    setDark(isDark);
    document.documentElement.classList.toggle('light', !isDark);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (accountRef.current && !accountRef.current.contains(e.target)) setShowAccount(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleTheme = () => {
    setDark(p => {
      const next = !p;
      document.documentElement.classList.toggle('light', !next);
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <PanelRightClose className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
        <Link to="/dashboard" className="flex items-center gap-3">
          <img src="/logo/icon.png" alt="Royal" className="h-9 w-9 object-contain" />
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-foreground leading-tight">
              <span className="text-[#1cc4e8]">ROYAL</span> <span>DEVLOPMENTS</span>
            </div>
            <div className="text-[8px] text-[#1cc4e8]/70 tracking-[2px] font-medium">BUILDING SOLUTIONS POWER FUTURE</div>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Balance */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-secondary/50 rounded-lg border border-border">
          <Wallet className="w-3.5 h-3.5 text-[#1cc4e8]" />
          <span className="text-sm font-medium text-foreground">₹{user?.balance || 0}</span>
        </div>

        {/* Theme Toggle */}
        <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          {dark ? <Moon className="w-4 h-4 text-muted-foreground" /> : <Sun className="w-4 h-4 text-muted-foreground" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => setShowNotif(p => !p)} className="p-2 rounded-lg hover:bg-secondary transition-colors relative">
            <Bell className="w-4 h-4 text-muted-foreground" />
            {notif.unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />}
          </button>
          {showNotif && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-2xl z-50">
              <div className="p-3 border-b border-border">
                <p className="text-sm font-semibold">Notifications</p>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {notif.notifications.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-4 text-center">No notifications</p>
                ) : notif.notifications.map(n => (
                  <div key={n.id} className={`p-3 border-b border-border last:border-0 ${!n.is_read ? 'bg-primary/5' : ''}`}>
                    <p className="text-xs font-medium">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Account */}
        <div className="relative" ref={accountRef}>
          <button onClick={() => setShowAccount(p => !p)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors">
            <div className="w-7 h-7 rounded-full bg-[#1cc4e8]/20 flex items-center justify-center">
              <span className="text-xs font-bold text-[#1cc4e8]">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            </div>
            <span className="text-sm font-medium hidden sm:block text-foreground">{user?.name || 'User'}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
          {showAccount && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-2xl z-50">
              <div className="p-3 border-b border-border">
                <p className="text-xs font-medium text-foreground">{user?.email}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{user?.role}</p>
              </div>
              <div className="p-1">
                <Link to="/dashboard" onClick={() => setShowAccount(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary rounded-lg transition-colors">
                  <User className="w-3.5 h-3.5" /> Dashboard
                </Link>
                <Link to="/profile" onClick={() => setShowAccount(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary rounded-lg transition-colors">
                  <User className="w-3.5 h-3.5" /> Account
                </Link>
                <Link to="/tickets" onClick={() => setShowAccount(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary rounded-lg transition-colors">
                  <Ticket className="w-3.5 h-3.5" /> Tickets
                </Link>
              </div>
              <div className="border-t border-border p-1">
                <a href={siteUrl || window.location.origin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-secondary rounded-lg transition-colors">
                  <Globe className="w-3.5 h-3.5" /> Visit Website
                </a>
                <button onClick={async () => {
                  try {
                    const res = await api('/whmcs/sso');
                    if (res.url) window.open(res.url, '_blank');
                  } catch {}
                }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-secondary rounded-lg transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> WHMCS Client Area
                </button>
              </div>
              <div className="border-t border-border p-1">
                <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-lg transition-colors">
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
