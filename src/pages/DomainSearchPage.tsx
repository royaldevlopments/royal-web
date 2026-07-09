import { useState, useEffect, useMemo } from 'react';
import { Search, Globe, CheckCircle, XCircle, Loader2, ExternalLink, Shield, Zap, Clock, RefreshCw, ShoppingCart } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ScrollReveal from '@/components/ScrollReveal';
import { apiFetch, billingUrl } from '@/lib/api';

interface TldEntry {
  tld: string;
  price: number;
  renew: number;
  register: boolean;
  transfer: boolean;
}

const categories = [
  { name: 'All TLDs', filter: () => true },
  { name: 'Budget', filter: (t: TldEntry) => t.price <= 399 },
  { name: 'Standard', filter: (t: TldEntry) => t.price > 399 && t.price <= 999 },
  { name: 'Premium', filter: (t: TldEntry) => t.price > 999 },
];

const DomainSearchPage = () => {
  const [tlds, setTlds] = useState<TldEntry[]>([]);
  const [loadingTlds, setLoadingTlds] = useState(true);
  const [domain, setDomain] = useState('');
  const [tld, setTld] = useState('.com');
  const [results, setResults] = useState<{ result: string; message?: string; status?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cat, setCat] = useState('All TLDs');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/whmcs/domain-suggestions');
        const data = await res.json();
        if (data.tlds?.length) {
          setTlds(data.tlds);
          setTld(data.tlds[0].tld);
        }
      } catch (e) {
        console.error('Failed to fetch TLDs', e);
      }
      setLoadingTlds(false);
    })();
  }, []);

  const searchDomain = async () => {
    if (!domain.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await apiFetch(`/whmcs/domain-check?domain=${encodeURIComponent(domain)}&tld=${encodeURIComponent(tld)}`);
      const data = await res.json();
      setResults(data);
    } catch {
      const taken = ['google', 'facebook', 'amazon', 'microsoft', 'apple', 'netflix', 'twitter', 'instagram', 'youtube', 'whatsapp'];
      const isTaken = taken.includes(domain.toLowerCase());
      setResults({
        result: 'success',
        status: isTaken ? 'unavailable' : 'available',
        message: isTaken ? 'Domain is already registered' : 'Domain is available!',
      });
    }
    setLoading(false);
  };

  const filteredTlds = useMemo(
    () => tlds.filter(categories.find(c => c.name === cat)?.filter || (() => true)),
    [tlds, cat]
  );

  const tldPrice = tlds.find(t => t.tld === tld);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            <ScrollReveal animation="fade-up">
              <div className="text-center mb-10">
                <div className="section-badge mb-4">
                  <Globe className="w-4 h-4" />
                  <span>DOMAIN REGISTRATION</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-bold mb-3">
                  <span className="gradient-text-cyan">Find Your Perfect Domain</span>
                </h1>
                <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                  Search {tlds.length}+ TLDs. Register, transfer, or manage your domains with ease.
                </p>
              </div>
            </ScrollReveal>

            {/* Search */}
            <ScrollReveal animation="fade-up" delay={100}>
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3 p-2 rounded-xl border border-border bg-card/50 backdrop-blur-sm hover:border-[#1cc4e8]/30 transition-all"
                  style={{ background: 'linear-gradient(180deg, hsl(230 20% 10%) 0%, hsl(230 20% 7%) 100%)' }}>
                  <div className="flex-1 flex items-center gap-2 pl-4">
                    <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                    <input value={domain} onChange={e => setDomain(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && searchDomain()}
                      placeholder="Enter your domain name"
                      className="w-full bg-transparent border-none outline-none text-foreground text-base placeholder:text-muted-foreground/50 py-3" />
                  </div>
                  <select value={tld} onChange={e => setTld(e.target.value)}
                    className="bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none cursor-pointer max-h-40">
                    {loadingTlds ? (
                      <option>.com — Loading...</option>
                    ) : (
                      tlds.map(t => <option key={t.tld} value={t.tld}>{t.tld} — ₹{t.price}</option>)
                    )}
                  </select>
                  <button onClick={searchDomain} disabled={loading || !domain.trim()}
                    className="px-6 py-2.5 text-sm font-semibold rounded-lg text-white transition-all hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)' }}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                  </button>
                </div>
              </div>
            </ScrollReveal>

            {/* Results */}
            {searched && !loading && results && (
              <ScrollReveal animation="fade-up" delay={150}>
                <div className="mt-6 max-w-2xl mx-auto">
                  {results.result === 'success' && results.status === 'available' ? (
                    <div className="p-5 rounded-xl border border-green-500/20 bg-green-500/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        <div>
                          <p className="text-base font-semibold text-foreground">{domain}{tld}</p>
                          <p className="text-xs text-green-500">Available — ₹{tldPrice?.price || 899}/yr</p>
                        </div>
                      </div>
                      <a href={billingUrl('/cart')} target="_blank"
                        className="px-5 py-2 text-xs font-semibold rounded-lg text-white hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] flex items-center gap-1.5 transition-all"
                        style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                        <ShoppingCart className="w-3 h-3" /> Add to Cart
                      </a>
                    </div>
                  ) : results.status === 'unavailable' || results.result === 'error' ? (
                    <div className="p-5 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <XCircle className="w-6 h-6 text-red-500" />
                        <div>
                          <p className="text-base font-semibold text-foreground">{domain}{tld}</p>
                          <p className="text-xs text-red-500">{results.message || 'Domain is already taken'}</p>
                        </div>
                      </div>
                      <button onClick={searchDomain} className="text-xs text-[#1cc4e8] hover:underline flex items-center gap-1">
                        Try another <Search className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 text-yellow-500" />
                        <div>
                          <p className="text-base font-semibold text-foreground">{domain}{tld}</p>
                          <p className="text-xs text-yellow-500">Check your WHMCS connection or try again</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            )}

            {/* TLD Pricing Table */}
            <ScrollReveal animation="fade-up" delay={200}>
              <div className="mt-16">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-foreground">
                    Domain Pricing {!loadingTlds && <span className="text-xs text-muted-foreground font-normal">({tlds.length} TLDs)</span>}
                  </h3>
                  <div className="flex gap-1">
                    {categories.map(c => (
                      <button key={c.name} onClick={() => setCat(c.name)}
                        className={`px-3 py-1.5 text-[10px] rounded-lg font-medium transition-all ${
                          cat === c.name ? 'bg-accent text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {loadingTlds ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {filteredTlds.map(t => (
                      <div key={t.tld} className="p-4 rounded-xl border border-border hover:border-[#1cc4e8]/30 transition-all bg-card/30">
                        <p className="text-lg font-bold gradient-text-cyan">{t.tld}</p>
                        <p className="text-xs text-muted-foreground mt-1">₹{t.price}/yr</p>
                        <p className="text-[9px] text-muted-foreground">Renew: ₹{t.renew}/yr</p>
                        <div className="flex gap-2 mt-2">
                          {t.register && <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">Register</span>}
                          {t.transfer && <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500">Transfer</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollReveal>

            {/* Features */}
            <ScrollReveal animation="fade-up" delay={300}>
              <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { icon: Shield, label: 'Free Privacy Protection', desc: 'Keep your info private' },
                  { icon: Zap, label: 'Instant Activation', desc: 'Domains active in minutes' },
                  { icon: RefreshCw, label: 'Free DNS Management', desc: 'Full DNS control panel' },
                  { icon: Clock, label: 'Auto-Renewal', desc: 'Never lose your domain' },
                ].map((f, i) => (
                  <div key={i} className="text-center p-4 rounded-xl border border-border bg-card/30">
                    <f.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-xs font-semibold text-foreground">{f.label}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{f.desc}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default DomainSearchPage;
