import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-border py-8 sm:py-10 px-4 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-8">
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">COMPANY</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><a href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About Us</a></li>
              <li><a href="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a></li>
              <li><a href="/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="/terms-of-service" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a></li>
              <li><a href="/refund-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Refund Policy</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">SERVICES</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><a href="/games" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Game Servers</a></li>
              <li><a href="/games/minecraft" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Minecraft</a></li>
              <li><a href="/vps/intel-platinum" className="text-sm text-muted-foreground hover:text-foreground transition-colors">VPS Servers</a></li>
              <li><a href="/services/web-hosting" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Web Hosting</a></li>
              <li><a href="/services/discord-bot" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Discord Bot</a></li>
              <li><a href="/services/rdp" className="text-sm text-muted-foreground hover:text-foreground transition-colors">RDP Plans</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">CUSTOMERS</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><a href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact Us</a></li>
              <li><a href="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Knowledgebase</a></li>
              <li><a href="/tutorials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Tutorials</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground text-sm mb-4">DEVLOPMENTS</h4>
            <ul className="space-y-1.5 sm:space-y-2">
              <li><Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link></li>
              <li><Link to="/order" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Order Now</Link></li>
              <li><Link to="/services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">My Services</Link></li>
              <li><Link to="/invoices" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Invoices</Link></li>
              <li><Link to="/tickets" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Support Tickets</Link></li>
              <li><Link to="/payment-methods" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Wallet</Link></li>
              <li><Link to="/referrals" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Referral Program</Link></li>
              <li><Link to="/api-tokens" className="text-sm text-muted-foreground hover:text-foreground transition-colors">API Tokens</Link></li>
              <li><Link to="/profile" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Personal Info</Link></li>
              <li><Link to="/security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Security</Link></li>
              <li><Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</Link></li>
              <li><Link to="/register" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Create Account</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center mb-8">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo/icon.png" alt="Royal" className="h-12 w-12 object-contain" />
            <span className="text-left">
              <span className="text-lg font-bold block">
                <span className="text-[#1cc4e8]">ROYAL</span> <span className="text-foreground">DEVLOPMENTS</span>
              </span>
              <span className="text-[8px] text-[#1cc4e8]/70 tracking-[2px] font-medium">BUILDING SOLUTIONS POWER FUTURE</span>
            </span>
          </a>
        </div>

        <div className="border-t border-border pt-6">
          <div className="flex items-center justify-center flex-wrap gap-2 sm:gap-4 mb-4">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">₹</span>
            </div>
            <div className="px-3 py-1 bg-muted rounded text-xs text-muted-foreground font-semibold">UPI</div>
            <div className="px-3 py-1 bg-[#1a1f71] rounded text-xs text-white font-semibold">VISA</div>
            <div className="px-3 py-1 bg-muted rounded text-xs text-muted-foreground font-semibold">RuPay</div>
          </div>
          <p className="text-center text-muted-foreground text-xs">
            Copyright 2026 &copy; Royal Devlopments. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
