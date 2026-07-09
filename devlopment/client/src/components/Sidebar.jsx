import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, Server, FileText, Ticket, User, Shield, CreditCard, Package, ChevronDown, ChevronLeft, ShieldCheck, ShoppingCart, Wallet, Gift, Key, Globe, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/axios';

export default function Sidebar({ open, setOpen }) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState({});
  const [whmcsUrl, setWhmcsUrl] = useState(null);

  useEffect(() => {
    api('/whmcs/sso').then(res => setWhmcsUrl(res.url)).catch(() => {});
  }, []);

  const toggleExpand = (label) => setExpanded(p => ({ ...p, [label]: !p[label] }));

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: ShoppingCart, label: 'Order', path: '/order' },
    {
      icon: Server, label: 'Services',
      children: [
        { icon: Package, label: 'My Services', path: '/services' },
      ]
    },
    { icon: FileText, label: 'Invoices', path: '/invoices' },
    { icon: Ticket, label: 'Tickets', path: '/tickets' },
    {
      icon: User, label: 'Important',
      children: [
        { icon: User, label: 'Personal Info', path: '/profile' },
        { icon: Shield, label: 'Security', path: '/security' },
        { icon: Wallet, label: 'Wallet', path: '/payment-methods' },
        { icon: Gift, label: 'Referrals', path: '/referrals' },
        { icon: Key, label: 'API Tokens', path: '/api-tokens' },
      ]
    },
  ];

  if (user?.role === 'admin') {
    menuItems.push({ icon: ShieldCheck, label: 'Admin Panel', path: '/admin' });
  }

  const closeMobile = () => { if (window.innerWidth < 1024) setOpen(false); };

  const NavItem = ({ item }) => (
    <NavLink to={item.path} onClick={closeMobile} className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-sidebar-hover hover:text-foreground'}`}>
      <item.icon className="w-4 h-4" />
      {item.label}
    </NavLink>
  );

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-60 bg-sidebar border-r border-border
        flex flex-col
        transition-[transform,width] duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto lg:overflow-hidden lg:transition-[width]
        ${open ? 'lg:w-60' : 'lg:w-0'}
      `}>
        <div className="p-4 flex items-center justify-between border-b border-border shrink-0">
          <Link to="/" onClick={closeMobile} className="flex items-center gap-2">
            <img src="/logo/icon.png" alt="Royal" className="h-8 w-8 object-contain" />
            <h1 className="font-bold text-sm tracking-wider whitespace-nowrap">
              <span className="text-[#1cc4e8]">ROYAL</span> <span className="text-foreground">BILLING</span>
            </h1>
          </Link>
          <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-sidebar-hover transition-colors lg:hidden">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map(item => (
            <div key={item.label}>
              {item.children ? (
                <>
                  <button onClick={() => toggleExpand(item.label)} className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-hover hover:text-foreground transition-colors">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded[item.label] ? 'rotate-180' : ''}`} />
                  </button>
                  {expanded[item.label] && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map(child => <NavItem key={child.path} item={child} />)}
                    </div>
                  )}
                </>
              ) : (
                <NavItem item={item} />
              )}
            </div>
          ))}
        </nav>
      <div className="border-t border-border p-2 space-y-1">
        <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Client Areas</div>
        <a href={whmcsUrl || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-hover hover:text-foreground transition-colors" onClick={e => { if (!whmcsUrl) { e.preventDefault(); api('/whmcs/sso').then(r => r.url && window.open(r.url, '_blank')).catch(() => {}); } }}>
          <Globe className="w-4 h-4" /> Hosting Client Area
          <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
        </a>
        <Link to="/" onClick={closeMobile} className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-primary hover:bg-primary/10 transition-colors">
          <Globe className="w-4 h-4" /> Devlopments Client Area
          <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
        </Link>
      </div>
      <div className="p-3 border-t border-border shrink-0 lg:block hidden">
        <p className="text-[10px] text-muted text-center">Royal Devlopments © 2026</p>
      </div>
    </aside>
    </>
  );
}
