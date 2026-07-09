import { useState, useEffect } from 'react';
import { Cpu, HardDrive, Wifi, MemoryStick } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';
import { apiFetch } from '@/lib/api';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  billing_cycle: string;
  features: string;
  category_name: string;
}

const PricingCalculator = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/products')
      .then(r => r.json())
      .then(data => {
        const gamePlans = data.filter((p: Plan) => p.category_name === 'Game Servers');
        if (gamePlans.length) {
          setPlans(gamePlans);
          setSelected(gamePlans[0].id);
        }
      })
      .catch(() => {});
  }, []);

  if (!plans.length) return null;

  const iconMap: Record<string, typeof Cpu> = { 'CPU': Cpu, 'RAM': MemoryStick, 'Storage': HardDrive, 'Bandwidth': Wifi };

  return (
    <section className="py-12 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan, i) => {
            const features: string[] = (() => { try { return plan.features ? JSON.parse(plan.features.replace(/'/g, '"')) : []; } catch { return []; } })();
            const isSelected = plan.id === selected;
            return (
              <ScrollReveal key={plan.id} animation="fade-up" delay={i * 100}>
                <div
                  onClick={() => setSelected(plan.id)}
                  className={`w-full text-left p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'border-accent shadow-[0_0_20px_hsl(270_70%_60%/0.3)] bg-accent/5'
                      : 'border-border hover:border-accent/50 bg-background'
                  }`}
                >
                  <h3 className="text-lg font-bold text-foreground mb-1">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                  <p className="text-3xl font-bold gradient-text-cyan mb-4">
                    ₹{plan.price}
                    <span className="text-sm text-muted-foreground font-normal">/{plan.billing_cycle}</span>
                  </p>
                  <ul className="space-y-2">
                    {features.map(f => {
                      const iconKey = Object.keys(iconMap).find(k => f.includes(k));
                      const Icon = iconKey ? iconMap[iconKey] : null;
                      return (
                        <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                          {Icon && <Icon className="w-4 h-4 text-accent shrink-0" />}
                          <span>{f}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <div className={`w-full mt-6 py-2.5 rounded-lg font-semibold text-sm text-center transition-all ${
                    isSelected
                      ? 'btn-primary-gradient text-foreground'
                      : 'border border-border text-muted-foreground'
                  }`}>
                    {isSelected ? 'SELECTED' : 'SELECT PLAN'}
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PricingCalculator;
