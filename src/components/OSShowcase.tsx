import { useState, useEffect } from 'react';
import { Monitor } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';
import { apiFetch } from '@/lib/api';

const defaultItems = [
  { name: 'Ubuntu', icon: '🐧' },
  { name: 'Windows Server', icon: '🪟' },
  { name: 'CentOS', icon: '🐧' },
  { name: 'Debian', icon: '🐧' },
  { name: 'Rocky Linux', icon: '🐧' },
  { name: 'AlmaLinux', icon: '🐧' },
];

const OSShowcase = () => {
  const [config, setConfig] = useState<{ enabled: boolean; items: typeof defaultItems } | null>(null);

  useEffect(() => {
    apiFetch('/site-features').then(r => r.json()).then(d => setConfig(d.os_showcase)).catch(() => {});
  }, []);

  if (!config?.enabled) return null;
  const items = config.items?.length ? config.items : defaultItems;

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <ScrollReveal animation="fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-2">
            CHOOSE YOUR
          </h2>
          <h2 className="text-2xl md:text-3xl font-bold text-center gradient-text-cyan mb-4">
            OPERATING SYSTEM
          </h2>
          <p className="text-muted-foreground text-sm text-center max-w-xl mx-auto mb-10">
            Select from a wide range of operating systems for your server. One-click install.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 max-w-3xl mx-auto">
          {items.map((os, i) => (
            <ScrollReveal key={os.name} animation="scale-in" delay={i * 80}>
              <div className="feature-card text-center py-5">
                <span className="text-2xl mb-2 block">{os.icon}</span>
                <span className="text-[11px] font-semibold text-foreground">{os.name}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal animation="fade-up" delay={300}>
          <div className="text-center mt-6">
            <p className="text-[10px] text-muted-foreground">
              <Monitor className="w-3 h-3 inline mr-1" />
              More OS options available on request. Custom ISO support available.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default OSShowcase;