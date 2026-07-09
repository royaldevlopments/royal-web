import { useState, useEffect } from 'react';
import { Headphones, Clock, Zap, Users, CheckCircle } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';
import { apiFetch } from '@/lib/api';

const SupportStatus = () => {
  const [config, setConfig] = useState<{
    enabled: boolean;
    response_time: string;
    online_agents: string;
    satisfaction: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    apiFetch('/site-features').then(r => r.json()).then(d => setConfig(d.support_status)).catch(() => {});
  }, []);

  if (!config?.enabled) return null;

  const rt = config.response_time || '< 5 min';
  const agents = config.online_agents || '12';
  const sat = config.satisfaction || '98%';

  return (
    <section className="py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <ScrollReveal animation="fade-up">
          <div className="relative overflow-hidden rounded-2xl border border-border p-6 md:p-8"
            style={{ background: 'linear-gradient(135deg, hsl(145 70% 40% / 0.08), hsl(195 90% 50% / 0.05))' }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 30% 0%, hsl(145 70% 50% / 0.1), transparent 60%)' }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-semibold text-green-500 tracking-wider">LIVE SUPPORT</span>
              </div>

              <h3 className="text-lg md:text-xl font-bold text-foreground mb-1">
                {config.title || 'We\'re Here to Help'}
              </h3>
              <p className="text-xs text-muted-foreground mb-6">
                Our team is online and ready to assist you.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border border-border/50">
                  <Headphones className="w-4 h-4 text-green-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-foreground">{agents}</p>
                    <p className="text-[9px] text-muted-foreground">Online Agents</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border border-border/50">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-foreground">{rt}</p>
                    <p className="text-[9px] text-muted-foreground">Response Time</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border border-border/50">
                  <Zap className="w-4 h-4 text-yellow-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-foreground">{sat}</p>
                    <p className="text-[9px] text-muted-foreground">Satisfaction</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border border-border/50">
                  <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-foreground">24/7</p>
                    <p className="text-[9px] text-muted-foreground">Availability</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default SupportStatus;
