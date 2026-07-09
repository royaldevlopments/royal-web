import { useState } from 'react';
import { Search, Globe, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';
import { apiFetch, billingUrl } from '@/lib/api';

const popularTlds = ['.com', '.net', '.org', '.in', '.co.in', '.tech', '.io', '.app', '.dev', '.me', '.xyz', '.online', '.store', '.site', '.cloud'];

export default function DomainSearch() {
  const [domain, setDomain] = useState('');
  const [tld, setTld] = useState('.com');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const check = async (d, t) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await apiFetch(`/whmcs/domain-check?domain=${encodeURIComponent(d || domain)}&tld=${encodeURIComponent(t || tld)}`);
      const data = await res.json();
      setResults(data);
    } catch {
      setResults({ result: 'error', message: 'Domain check failed' });
    }
    setLoading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!domain.trim()) return;
    check();
  };

  const quickCheck = (t) => {
    if (!domain.trim()) return;
    check(domain, t);
  };

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-4xl">
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-10">
            <div className="section-badge mb-4">
              <Globe className="w-4 h-4" />
              <span>DOMAIN SEARCH</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="gradient-text-cyan">Find Your Perfect Domain</span>
            </h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Search and register domains for your business, gaming server, or personal website
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={100}>
          <form onSubmit={handleSubmit} className="flex items-center gap-3 p-2 rounded-xl border border-border bg-card/50 backdrop-blur-sm max-w-2xl mx-auto hover:border-[#1cc4e8]/30 transition-all duration-300"
            style={{ background: 'linear-gradient(180deg, hsl(230 20% 10%) 0%, hsl(230 20% 7%) 100%)' }}>
            <div className="flex-1 flex items-center gap-2 pl-4">
              <Search className="w-5 h-5 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="Enter your domain name"
                className="w-full bg-transparent border-none outline-none text-foreground text-base placeholder:text-muted-foreground/50 py-3"
              />
            </div>
            <select
              value={tld}
              onChange={e => setTld(e.target.value)}
              className="bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none cursor-pointer hover:border-[#1cc4e8]/30 transition-colors"
            >
              {popularTlds.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="submit" disabled={loading || !domain.trim()}
              className="relative overflow-hidden px-6 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 text-white whitespace-nowrap hover:shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </button>
          </form>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={150}>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {popularTlds.slice(0, 8).map(t => (
              <button key={t} onClick={() => quickCheck(t)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:text-[#1cc4e8] hover:border-[#1cc4e8]/30 transition-all duration-200">
                {t}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {searched && !loading && results && (
          <ScrollReveal animation="fade-up" delay={200}>
            <div className="mt-8 max-w-2xl mx-auto">
              {results.result === 'success' || results.status === 'available' ? (
                <div className="p-5 rounded-xl border border-green-500/20 bg-green-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="text-base font-semibold text-foreground">{domain}{tld}</p>
                      <p className="text-xs text-green-500">Available for registration!</p>
                    </div>
                  </div>
                  <a href={billingUrl('/register')} target="_blank"
                    className="relative overflow-hidden px-5 py-2 text-xs font-semibold rounded-lg transition-all duration-300 text-white hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] hover:-translate-y-0.5 flex items-center gap-1.5"
                    style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                    Register <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : results.result === 'error' ? (
                <div className="p-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
                  <p className="text-sm text-yellow-500 text-center">{results.message || 'Could not check domain availability. Try again.'}</p>
                </div>
              ) : (
                <div className="p-5 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-red-500" />
                    <div>
                      <p className="text-base font-semibold text-foreground">{domain}{tld}</p>
                      <p className="text-xs text-red-500">Already taken</p>
                    </div>
                  </div>
                  <button onClick={() => check()} className="text-xs text-[#1cc4e8] hover:underline flex items-center gap-1">
                    Try another <Search className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
}