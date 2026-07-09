import { useState, useEffect } from 'react';
import { Handshake, Shield } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';
import { apiFetch } from '@/lib/api';

const brandColors: Record<string, { bg: string; text: string; border: string }> = {
  Razorpay: { bg: 'from-blue-600/20 to-blue-500/5', text: 'text-blue-400', border: 'border-blue-500/30' },
  Cashfree: { bg: 'from-purple-600/20 to-purple-500/5', text: 'text-purple-400', border: 'border-purple-500/30' },
  Cloudflare: { bg: 'from-orange-600/20 to-orange-500/5', text: 'text-orange-400', border: 'border-orange-500/30' },
  WHMCS: { bg: 'from-green-600/20 to-green-500/5', text: 'text-green-400', border: 'border-green-500/30' },
};

const Partners = () => {
  const [config, setConfig] = useState<{ enabled: boolean; items: { name: string; logo: string }[] } | null>(null);

  useEffect(() => {
    apiFetch('/site-features').then(r => r.json()).then(d => setConfig(d.partners)).catch(() => {});
  }, []);

  if (!config?.enabled) return null;
  const items = config.items?.length ? config.items : [];

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <ScrollReveal animation="fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-2">
            TRUSTED BY
          </h2>
          <h2 className="text-2xl md:text-3xl font-bold text-center gradient-text-cyan mb-6">
            INDUSTRY LEADERS
          </h2>
        </ScrollReveal>

        <div className="flex flex-wrap justify-center items-center gap-5 max-w-3xl mx-auto">
          {items.map((partner, i) => {
            const colors = brandColors[partner.name] || { bg: 'from-primary/20 to-primary/5', text: 'text-primary', border: 'border-primary/30' };
            return (
              <ScrollReveal key={partner.name} animation="scale-in" delay={i * 80}>
                <div className={`px-6 py-4 rounded-xl border ${colors.border} bg-gradient-to-br ${colors.bg} flex items-center justify-center min-w-[140px] hover:scale-105 transition-all duration-300`}>
                  {partner.logo ? (
                    <img src={partner.logo} alt={partner.name} className="max-h-7 max-w-full opacity-70 hover:opacity-100 transition-all" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Shield className={`w-5 h-5 ${colors.text}`} />
                      <span className={`text-sm font-bold tracking-wide ${colors.text}`}>{partner.name}</span>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        <ScrollReveal animation="fade-up" delay={300}>
          <div className="text-center mt-8">
            <p className="text-xs text-muted-foreground">
              <Handshake className="w-3 h-3 inline mr-1" />
              Partnering with the best to bring you the best hosting experience.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default Partners;