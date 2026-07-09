import { useState, useEffect } from 'react';
import { Cpu, HardDrive, MemoryStick, Wifi, Server } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';
import { apiFetch } from '@/lib/api';

const defaultItems = [
  { name: 'AMD EPYC™', desc: 'Enterprise Grade Processors', icon: 'Cpu' },
  { name: 'NVMe SSD', desc: 'Ultra-Fast Storage', icon: 'HardDrive' },
  { name: 'DDR5 RAM', desc: 'High Performance Memory', icon: 'MemoryStick' },
  { name: '10 Gbps', desc: 'Blazing Fast Network', icon: 'Wifi' },
];

const iconMap = { Cpu, HardDrive, MemoryStick, Wifi, Server };

const TechStack = () => {
  const [features, setFeatures] = useState<{ enabled: boolean; items: typeof defaultItems } | null>(null);

  useEffect(() => {
    apiFetch('/site-features').then(r => r.json()).then(d => setFeatures(d.techstack)).catch(() => setFeatures({ enabled: true, items: defaultItems }));
  }, []);

  if (!features?.enabled) return null;
  const items = features.items?.length ? features.items : defaultItems;

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <ScrollReveal animation="fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-2">
            OUR TECHNOLOGY
          </h2>
          <h2 className="text-2xl md:text-3xl font-bold text-center gradient-text-cyan mb-4">
            POWERING YOUR SERVERS
          </h2>
          <p className="text-muted-foreground text-sm text-center max-w-xl mx-auto mb-10">
            We use enterprise-grade hardware to ensure your servers run at peak performance.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {items.map((item, i) => {
            const Icon = iconMap[item.icon as keyof typeof iconMap] || Server;
            return (
              <ScrollReveal key={item.name} animation="scale-in" delay={i * 100}>
                <div className="feature-card text-center">
                  <div className="icon-circle mx-auto mb-3">
                    <Icon className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground mb-1">{item.name}</h3>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TechStack;