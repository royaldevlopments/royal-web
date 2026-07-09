import { Outlet } from 'react-router-dom';
import Footer from './Footer';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-[60] bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-[#1cc4e8]/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500" />
              <img src="/logo/icon.png" alt="Royal" className="h-12 w-12 object-contain relative" />
            </div>
            <span className="hidden sm:block">
              <span className="text-lg font-bold">
                <span className="text-[#1cc4e8]">ROYAL</span> <span className="text-foreground">DEVLOPMENTS</span>
              </span>
              <br />
              <span className="text-[9px] text-[#1cc4e8]/70 tracking-[3px] font-medium">BUILDING SOLUTIONS POWER FUTURE</span>
            </span>
          </a>
          <nav className="flex items-center gap-4">
            <a href="/" className="text-sm text-muted-foreground hover:text-[#1cc4e8] transition-colors">Home</a>
            <a href="/devlopment/register" className="relative overflow-hidden px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-300 text-white hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)' }}>
              REGISTER
            </a>
          </nav>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#1cc4e8]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        </div>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
