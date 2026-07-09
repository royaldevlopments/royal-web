import { useState, useEffect } from 'react';
import { ShieldCheck, Award } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';
import { apiFetch } from '@/lib/api';

const SLABanner = () => {
  const [config, setConfig] = useState<{
    enabled: boolean;
    percentage: string;
    title: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    apiFetch('/site-features').then(r => r.json()).then(d => setConfig(d.sla_banner)).catch(() => {});
  }, []);

  if (!config?.enabled) return null;

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <ScrollReveal animation="zoom-in">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 p-8 md:p-12 text-center"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--accent) / 0.08))' }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.12), transparent 60%)' }} />
            <div className="relative">
              <div className="flex items-center justify-center gap-3 mb-4">
                <ShieldCheck className="w-10 h-10 text-primary" />
                <span className="text-5xl font-bold gradient-text-cyan">{config.percentage || '99.9'}%</span>
                <Award className="w-10 h-10 text-accent" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">{config.title || 'Uptime SLA Guarantee'}</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-lg mx-auto">
                {config.description || 'We guarantee 99.9% uptime on all our enterprise hosting plans. Your servers stay online, always.'}
              </p>
              <div className="inline-flex items-center gap-4 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success" /> 24/7 Monitoring</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success" /> Automated Failover</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success" /> Compensation Policy</span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default SLABanner;