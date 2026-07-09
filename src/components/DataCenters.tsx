import { MapPin, Shield, Gauge, Headphones } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';

const locations = [
  { city: 'Mumbai', country: 'India', flag: '🇮🇳', servers: 4 },
  { city: 'Singapore', country: 'Singapore', flag: '🇸🇬', servers: 2 },
  { city: 'Frankfurt', country: 'Germany', flag: '🇩🇪', servers: 3 },
  { city: 'New York', country: 'USA', flag: '🇺🇸', servers: 3 },
  { city: 'London', country: 'UK', flag: '🇬🇧', servers: 2 },
  { city: 'Tokyo', country: 'Japan', flag: '🇯🇵', servers: 2 },
];

const highlights = [
  { icon: MapPin, label: 'Global Locations', value: '6 Regions' },
  { icon: Shield, label: 'DDoS Protection', value: 'Always On' },
  { icon: Gauge, label: 'Low Latency', value: '&lt;20ms' },
  { icon: Headphones, label: 'Local Support', value: '24/7' },
];

const DataCenters = () => {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <ScrollReveal animation="fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-2">
            OUR DATA CENTERS
          </h2>
          <h2 className="text-2xl md:text-3xl font-bold text-center gradient-text-cyan mb-4">
            WORLDWIDE COVERAGE
          </h2>
          <p className="text-muted-foreground text-sm text-center max-w-xl mx-auto mb-10">
            Deploy your servers in 6 strategic locations worldwide for the lowest latency and best performance.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-10">
          {highlights.map((h, i) => (
            <ScrollReveal key={h.label} animation="scale-in" delay={i * 80}>
              <div className="feature-card text-center py-4">
                <h.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <p className="text-lg font-bold gradient-text-cyan">{h.value}</p>
                <p className="text-[10px] text-muted-foreground">{h.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal animation="fade-up" delay={200}>
          <div className="relative rounded-2xl border border-border overflow-hidden p-6 md:p-8">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {locations.map((loc, i) => (
                <ScrollReveal key={loc.city} animation="scale-in" delay={i * 80}>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-lg">
                      {loc.flag}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{loc.city}</p>
                      <p className="text-[10px] text-muted-foreground">{loc.country} · {loc.servers} Servers</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={300}>
          <div className="mt-6 p-4 rounded-xl border border-border bg-secondary/20 text-center">
            <p className="text-xs text-muted-foreground">
              All locations feature <span className="text-primary">10 Gbps uplinks</span>, 
              <span className="text-primary"> enterprise NVMe storage</span>, and 
              <span className="text-primary"> automatic failover</span>.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default DataCenters;