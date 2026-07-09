import { Gift, Users, DollarSign, TrendingUp } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';
import { billingUrl } from '@/lib/api';

const steps = [
  { icon: Gift, title: 'Sign Up Free', desc: 'Create your affiliate account in seconds' },
  { icon: Users, title: 'Share Your Link', desc: 'Share your unique referral link with friends & community' },
  { icon: DollarSign, title: 'They Purchase', desc: 'When they order any service, you earn commission' },
  { icon: TrendingUp, title: 'Get Paid', desc: 'Withdraw your earnings anytime via wallet' },
];

const AffiliateCTA = () => {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <ScrollReveal animation="fade-up">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary mb-4">
              <Gift className="w-3 h-3" /> EARN WITH US
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              AFFILIATE PROGRAM
            </h2>
            <h2 className="text-2xl md:text-3xl font-bold gradient-text-cyan mb-4">
              EARN 20% RECURRING COMMISSION
            </h2>
            <p className="text-muted-foreground text-sm max-w-xl mx-auto">
              Join our affiliate program and earn 20% recurring commission on every sale you refer. No limits, no caps — earn as much as you want!
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 max-w-3xl mx-auto">
          {steps.map((step, i) => (
            <ScrollReveal key={step.title} animation="scale-in" delay={i * 100}>
              <div className="feature-card text-center">
                <div className="icon-circle mx-auto mb-3">
                  <step.icon className="w-5 h-5 text-foreground" />
                </div>
                <h3 className="text-xs font-semibold text-foreground mb-1">{step.title}</h3>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal animation="zoom-in" delay={400}>
          <div className="relative overflow-hidden rounded-2xl border border-border p-8 md:p-12 text-center"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.1))' }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.15), transparent 60%)' }} />
            <div className="relative">
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">Ready to Start Earning?</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-lg mx-auto">
                Sign up now and start earning 20% recurring commission on every referral. Your earnings are credited to your wallet instantly!
              </p>
              <a href={billingUrl('/register')}>
                <button className="btn-primary-gradient px-8 py-3 rounded-lg font-semibold text-foreground">
                  JOIN AFFILIATE PROGRAM
                </button>
              </a>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default AffiliateCTA;