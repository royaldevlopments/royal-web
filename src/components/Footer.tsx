import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch, billingUrl } from '@/lib/api';

const Footer = () => {
  const [sla, setSla] = useState<{ enabled: boolean; percentage: string; title: string; description: string } | null>(null);

  useEffect(() => {
    apiFetch('/site-features').then(r => r.json()).then(d => setSla(d.sla_banner)).catch(() => {});
  }, []);

  return (
    <footer className="border-t border-border pt-8 sm:pt-10 pb-8 sm:pb-10 px-4">
      {/* SLA Bar */}
      {sla?.enabled && (
        <div className="container mx-auto mb-8">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="font-bold gradient-text-cyan text-sm">{sla.percentage || '99.9'}%</span>
              <span className="hidden sm:inline">{sla.title || 'Uptime SLA'}</span>
            </div>
            <span className="w-1 h-1 rounded-full bg-border hidden sm:block" />
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> 24/7 Monitoring</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Auto Failover</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Compensation</span>
          </div>
        </div>
      )}

      <div className="container mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-10">
          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">COMPANY</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><Link to="/about" className="footer-link text-sm">About Us</Link></li>
              <li><Link to="/faq" className="footer-link text-sm">FAQ</Link></li>
              <li><Link to="/" className="footer-link text-sm">Sitemap</Link></li>
              <li><Link to="/privacy-policy" className="footer-link text-sm">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service" className="footer-link text-sm">Terms of Service</Link></li>
              <li><Link to="/refund-policy" className="footer-link text-sm">Refund Policy</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">SERVICES</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><Link to="/games" className="footer-link text-sm">Game Servers</Link></li>
              <li><Link to="/games/minecraft" className="footer-link text-sm">Minecraft</Link></li>
              <li><Link to="/vps/intel-platinum" className="footer-link text-sm">VPS Servers</Link></li>
              <li><Link to="/services/web-hosting" className="footer-link text-sm">Web Hosting</Link></li>
              <li><Link to="/services/domains" className="footer-link text-sm">Domain Search</Link></li>
              <li><Link to="/services/discord-bot" className="footer-link text-sm">Discord Bot</Link></li>
              <li><Link to="/services/rdp" className="footer-link text-sm">RDP Plans</Link></li>
            </ul>
          </div>

          {/* Customers */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">CUSTOMERS</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><a href={billingUrl('/login')} className="footer-link text-sm">My Account</a></li>
              <li><Link to="/faq" className="footer-link text-sm">Knowledgebase</Link></li>
              <li><Link to="/contact" className="footer-link text-sm">Contact Us</Link></li>
              <li><Link to="/tutorials" className="footer-link text-sm">Tutorials</Link></li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">SOCIAL</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><a href="https://discord.gg/R8U3wKxwkd" target="_blank" rel="noopener noreferrer" className="footer-link text-sm">Discord</a></li>
              <li><a href="https://youtube.com/@royaldevlopments" target="_blank" rel="noopener noreferrer" className="footer-link text-sm">YouTube</a></li>
              <li><a href="https://linkedin.com/company/royaldevlopments" target="_blank" rel="noopener noreferrer" className="footer-link text-sm">LinkedIn</a></li>
            </ul>
          </div>
        </div>

        {/* Footer Logo - same as header */}
        <div className="flex flex-col items-center mb-10">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo/icon.png" alt="Royal" className="h-14 w-14 object-contain" />
            <span className="text-left">
              <span className="text-xl font-bold block">
                <span className="text-blue-500">ROYAL</span> <span className="text-foreground">DEVLOPMENTS</span>
              </span>
              <span className="text-[10px] text-blue-400/70 tracking-[3px] font-medium">BUILDING SOLUTIONS POWER FUTURE</span>
            </span>
          </Link>
        </div>

        {/* Divider */}
        <div className="border-t border-border pt-6">
          {/* Payment Icons */}
          <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-4 mb-4">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">₹</span>
            </div>
            <div className="px-3 py-1 bg-muted rounded text-xs text-muted-foreground font-semibold">
              UPI
            </div>
            <div className="px-3 py-1 bg-[#1a1f71] rounded text-xs text-white font-semibold">
              VISA
            </div>
            <div className="px-3 py-1 bg-muted rounded text-xs text-muted-foreground font-semibold">
              RuPay
            </div>
          </div>

          {/* Copyright */}
          <p className="text-center text-muted-foreground text-xs">
            Copyright 2026 © Royal Devlopments. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
