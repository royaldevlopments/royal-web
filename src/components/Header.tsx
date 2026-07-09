import { useState, useEffect, useRef, Fragment } from 'react';
import { Menu, X, Moon, Sun, ChevronDown, Gamepad2, Server, BookOpen, HelpCircle, User, Package, FileText, Ticket, ShoppingCart, Wallet, ShieldCheck, LogOut } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Link } from 'react-router-dom';
import { apiFetch, billingUrl } from '@/lib/api';

const menuItems = [
  {
    title: 'Game Servers',
    icon: Gamepad2,
    items: [
      { name: 'All Game Servers', desc: 'Browse 80+ Supported Games', link: '/games' },
      { name: 'Minecraft Hosting', desc: 'Premium NVMe SSD Minecraft Servers', link: '/games/minecraft' },
      { name: 'Hytale Hosting', desc: 'Best Hytale Hosting', link: '/games/hytale' },
      { name: 'Palworld Hosting', desc: 'Dedicated Palworld Server Hosting', link: '/games/palworld' },
    ]
  },
  {
    title: 'Services',
    icon: Server,
    categories: [
      {
        label: 'HOSTING',
        items: [
          { name: 'Web Hosting', desc: 'cPanel Hosting with Free Domain', link: '/services/web-hosting' },
          { name: 'Email Hosting', desc: 'Professional Custom Domain Email', link: '/services/email-hosting' },
          { name: 'Discord Bot Hosting', desc: '24/7 Discord Bot Servers', link: '/services/discord-bot' },
          { name: 'Cloud Storage', desc: 'Secure File Storage & Sharing', link: '/services/cloud-storage' },
          { name: 'RDP Plans', desc: 'Windows Remote Desktop Servers', link: '/services/rdp' },
          { name: 'Domain Search', desc: 'Find & Register Your Domain', link: '/services/domains' },
        ]
      },
      {
        label: 'VPS',
        items: [
          { name: 'Intel Platinum VPS', desc: 'Budget VPS in India', link: '/vps/intel-platinum' },
          { name: 'Intel Xeon VPS', desc: 'High Performance Intel Xeon', link: '/vps/intel-xeon' },
          { name: 'AMD Ryzen VPS', desc: 'Premium Performance', link: '/vps/amd-ryzen' },
          { name: 'AMD Epyc VPS', desc: 'Enterprise-grade Performance', link: '/vps/amd-epyc' },
        ]
      }
    ]
  },
  {
    title: 'Learn',
    icon: BookOpen,
    items: [
      { name: 'About Our Company', desc: 'Our Story & Mission', link: '/about' },
      { name: 'Terms of Service', desc: 'Our Terms & Conditions', link: '/terms-of-service' },
      { name: 'Privacy Policy', desc: 'How We Handle Your Data', link: '/privacy-policy' },
      { name: 'Refund Policy', desc: 'Our Refund Policy', link: '/refund-policy' },
    ]
  },
  {
    title: 'Support',
    icon: HelpCircle,
    items: [
      { name: 'Contact Support', desc: 'Get in Touch with Our Team', link: '/contact' },
      { name: 'FAQ & Knowledge Base', desc: 'Answers to Common Questions', link: '/faq' },
      { name: 'Tutorials & Guides', desc: 'Step-by-Step Setup Guides', link: '/tutorials' },
      { name: 'Server Status', desc: 'Check Our System Status', link: '/faq' },
    ]
  },
  {
    title: 'Client Area',
    icon: User,
    items: [
      { name: 'Client area - Devlopments', desc: 'Devlopment management area', link: billingUrl('') },
      { name: 'Client area - Hosting', desc: 'Hosting management area', link: '#whmcs' },
    ]
  }
];

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { name: payload.name || payload.email?.split('@')[0] || 'User', email: payload.email };
  } catch { return null; }
}

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [ssoLoading, setSsoLoading] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const user = decodeToken(token);
      if (user) { setLoggedIn(true); setUserName(user.name); setUserRole(user.role || ''); }
    }
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (accountRef.current && !accountRef.current.contains(e.target)) setAccountOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const goToWhmcs = async () => {
    setSsoLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await apiFetch('/whmcs/sso', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.url) window.open(data.url, '_blank');
    } catch {}
    setSsoLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setLoggedIn(false);
    setUserName('');
    setUserRole('');
    setAccountOpen(false);
    window.location.href = '/';
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const user = decodeToken(token);
      if (user) { setLoggedIn(true); setUserName(user.name); }
    }
  }, []);

  const toggleMenu = (title: string) => {
    setOpenMenus(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark') || 
      !document.documentElement.classList.contains('light');
    setIsDark(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  };

  return (
    <header className="sticky top-0 z-[60] bg-background w-full">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo/icon.png" alt="Royal" className="h-14 w-14 object-contain" />
          <span className="hidden sm:block">
            <span className="text-xl font-bold">
              <span className="text-blue-500">ROYAL</span> <span className="text-white">DEVLOPMENTS</span>
            </span>
            <br />
            <span className="text-[10px] text-blue-400/70 tracking-[3px] font-medium">BUILDING SOLUTIONS POWER FUTURE</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {menuItems.filter(m => m.title !== 'Client Area').map((menu) => (
            <div key={menu.title} className="relative"
              onMouseEnter={() => setDropdownOpen(menu.title)}
              onMouseLeave={() => setDropdownOpen(null)}
            >
              <button className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/50">
                {menu.title}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen === menu.title ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen === menu.title && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-background border border-border rounded-xl shadow-2xl p-2">
                  {menu.items?.map((item) => (
                    <Link key={item.name} to={item.link} className="block px-3 py-2.5 text-sm text-foreground hover:bg-secondary/50 rounded-lg transition-colors group">
                      <p className="font-medium group-hover:text-primary transition-colors">{item.name}</p>
                      {item.desc && <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>}
                    </Link>
                  ))}
                  {menu.categories?.map((cat) => (
                    <div key={cat.label}>
                      <p className="px-3 py-1 text-[10px] text-primary font-semibold tracking-wider mt-1">{cat.label}</p>
                      {cat.items.map((item) => (
                        <Link key={item.name} to={item.link} className="block px-3 py-2.5 text-sm text-foreground hover:bg-secondary/50 rounded-lg transition-colors group">
                          <p className="font-medium group-hover:text-primary transition-colors">{item.name}</p>
                          {item.desc && <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {menuItems.filter(m => m.title === 'Client Area').map((menu) => (
            <div key={menu.title} className="relative" style={{ borderLeft: '1px solid hsl(var(--primary) / 0.4)', paddingLeft: '12px', marginLeft: '4px' }}
              onMouseEnter={() => setDropdownOpen(menu.title)}
              onMouseLeave={() => setDropdownOpen(null)}
            >
              <button className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary/50">
                {menu.title}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen === menu.title ? 'rotate-180' : ''}`} />
              </button>
              {dropdownOpen === menu.title && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-background border border-border rounded-xl shadow-2xl p-2">
                  {menu.items?.map((item) => (
                    menu.title === 'Client Area' && item.name === 'Client area - Hosting' ? (
                      <button key={item.name} onClick={() => { goToWhmcs(); setDropdownOpen(null); }} disabled={ssoLoading} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-foreground hover:bg-secondary/50 rounded-lg transition-colors group text-left">
                        <p className="font-medium group-hover:text-primary transition-colors">{item.name}</p>
                        {item.desc && <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>}
                      </button>
                    ) : (
                      <Link key={item.name} to={item.link} className="block px-3 py-2.5 text-sm text-foreground hover:bg-secondary/50 rounded-lg transition-colors group">
                        <p className="font-medium group-hover:text-primary transition-colors">{item.name}</p>
                        {item.desc && <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>}
                      </Link>
                    )
                  ))}
                </div>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2 ml-4">
            {loggedIn ? (
              <div className="relative" ref={accountRef}>
                <button onClick={() => setAccountOpen(p => !p)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg btn-primary-gradient text-foreground">
                  <User className="w-4 h-4" /> {userName} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
                </button>
                {accountOpen && (
                  <div className="absolute right-0 top-full mt-2 w-40 bg-background border border-border rounded-xl shadow-2xl z-50 p-1.5">
                    <button onClick={handleLogout} className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-danger hover:bg-danger/10 rounded-lg transition-colors text-left">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <a href={billingUrl('')}>
                  <button className="px-4 py-2 text-sm font-medium rounded-lg btn-primary-gradient text-foreground">LOGIN</button>
                </a>
                <a href={billingUrl('/register')}>
                  <button className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">REGISTER</button>
                </a>
              </>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            {isDark ? <Moon className="w-5 h-5 text-muted-foreground" /> : <Sun className="w-5 h-5 text-muted-foreground" />}
          </button>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <Menu className="w-5 h-5 text-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent className="w-[420px] bg-background border-l border-border overflow-y-auto p-0">
              <div className="p-5 border-b border-border flex items-center gap-3">
                <img src="/logo/icon.png" alt="Royal" className="h-10 w-10 object-contain" />
                <div>
                  <div className="text-sm font-bold">
                    <span className="text-[#1cc4e8]">ROYAL</span> <span className="text-foreground">DEVLOPMENTS</span>
                  </div>
                  <div className="text-[8px] text-[#1cc4e8]/70 tracking-[2px] font-medium">BUILDING SOLUTIONS POWER FUTURE</div>
                </div>
              </div>
              <nav className="p-3 space-y-1">
                {menuItems.map((menu, idx) => (
                  <Fragment key={menu.title}>
                    {menu.title === 'Client Area' && <div className="border-t border-border my-2" />}
                    <Collapsible
                      key={menu.title}
                      open={openMenus.includes(menu.title)}
                      onOpenChange={() => toggleMenu(menu.title)}
                    >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-[#1cc4e8]/5 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1cc4e8]/20 to-purple-500/20 flex items-center justify-center group-hover:from-[#1cc4e8]/30 group-hover:to-purple-500/30 transition-all">
                          <menu.icon className="w-4 h-4 text-[#1cc4e8]" />
                        </div>
                        <span className="font-medium text-foreground text-sm">{menu.title}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${openMenus.includes(menu.title) ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 pr-2 py-1 space-y-0.5">
                      {menu.items && menu.items.map((item) => (
                        menu.title === 'Client Area' && item.name === 'Client area - Hosting' ? (
                          <button
                            key={item.name}
                            onClick={() => { goToWhmcs(); setIsOpen(false); }}
                            className="block w-full text-left p-3 rounded-lg hover:bg-[#1cc4e8]/5 transition-colors group border-l-2 border-transparent hover:border-[#1cc4e8] ml-4"
                          >
                            <div className="text-sm font-medium text-foreground group-hover:text-[#1cc4e8] transition-colors">{item.name}</div>
                            {item.desc && <div className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</div>}
                          </button>
                        ) : (
                          <Link
                            key={item.name}
                            to={item.link || '#'}
                            className="block p-3 rounded-lg hover:bg-[#1cc4e8]/5 transition-colors group border-l-2 border-transparent hover:border-[#1cc4e8] ml-4"
                            onClick={() => setIsOpen(false)}
                          >
                            <div className="text-sm font-medium text-foreground group-hover:text-[#1cc4e8] transition-colors">{item.name}</div>
                            {item.desc && <div className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</div>}
                          </Link>
                        )
                      ))}
                      {menu.categories && menu.categories.map((cat) => (
                        <div key={cat.label} className="mb-2 ml-4">
                          <div className="text-[10px] font-semibold text-[#1cc4e8] tracking-wider mt-2 mb-1.5 flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-[#1cc4e8]"></span>
                            {cat.label}
                          </div>
                          {cat.items.map((item) => (
                            <Link
                              key={item.name}
                              to={item.link || '#'}
                              className="block p-2.5 rounded-lg hover:bg-[#1cc4e8]/5 transition-colors group border-l-2 border-transparent hover:border-[#1cc4e8]"
                              onClick={() => setIsOpen(false)}
                            >
                              <div className="text-sm font-medium text-foreground group-hover:text-[#1cc4e8] transition-colors">{item.name}</div>
                              {item.desc && <div className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</div>}
                            </Link>
                          ))}
                        </div>
                      ))}
                    </CollapsibleContent>
                    </Collapsible>
                  </Fragment>
                ))}
              </nav>

              <div className="border-t border-border p-4 space-y-2">
                {loggedIn ? (
                  <>
                    <div className="flex items-center justify-between px-3 mb-2">
                      <span className="text-sm text-muted-foreground">Logged in as <span className="text-foreground font-medium">{userName}</span></span>
                    </div>
                    <button onClick={() => { handleLogout(); setIsOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-danger hover:bg-danger/10 transition-all duration-200">
                      <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center">
                        <LogOut className="w-4 h-4 text-danger" />
                      </div>
                      Logout
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <a href={billingUrl('')} onClick={() => setIsOpen(false)}
                      className="flex-1 relative overflow-hidden flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 hover:shadow-[0_0_25px_rgba(168,85,247,0.4)]"
                      style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)' }}>
                      LOGIN
                    </a>
                    <a href={billingUrl('/register')} onClick={() => setIsOpen(false)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-foreground border border-border hover:bg-secondary/50 transition-all duration-200">
                      REGISTER
                    </a>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
