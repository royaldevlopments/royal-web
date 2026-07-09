import { useState, useEffect } from 'react';
import { Globe, Bot, Server, Database, MessageCircle, Users } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';
import { apiFetch } from '@/lib/api';

const services = [
  { icon: Globe, name: 'WEB HOSTING' },
  { icon: Bot, name: 'BOT SERVERS' },
  { icon: Server, name: 'VPS SERVERS' },
  { icon: Database, name: 'DEDICATED SERVERS' },
];

const BeyondGaming = () => {
  const [discord, setDiscord] = useState<{ enabled: boolean; invite_url: string; title: string; member_count: string } | null>(null);

  useEffect(() => {
    apiFetch('/site-features').then(r => r.json()).then(d => setDiscord(d.discord)).catch(() => {});
  }, []);

  return (
    <section className="py-12 px-4">
      <div className="container mx-auto text-center">
        <ScrollReveal animation="fade-up">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">
            GO BEYOND GAMING
          </h2>
          
          <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl mx-auto mb-10">
            More than just game servers — <span className="text-primary">VPS, Web, Discord Bots</span> & Dedicated Servers. Unbeatable support, global reach.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {services.map((service, index) => (
            <ScrollReveal key={service.name} animation="scale-in" delay={index * 100}>
              <div className="service-card">
                <div className="icon-circle mx-auto">
                  <service.icon className="w-6 h-6 text-foreground" />
                </div>
                <span className="text-xs font-semibold text-foreground mt-2">
                  {service.name}
                </span>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {discord?.enabled && (
          <ScrollReveal animation="zoom-in">
            <div className="max-w-xl mx-auto relative overflow-hidden rounded-2xl border border-border p-8 md:p-10 text-center"
              style={{ background: 'linear-gradient(135deg, hsl(230 70% 55% / 0.1), hsl(230 70% 45% / 0.05))' }}>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(circle at 50% 0%, hsl(230 70% 55% / 0.15), transparent 60%)' }} />
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-[#5865F2]" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">{discord.title || 'Join Our Community'}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Connect with {discord.member_count || 'thousands of'} other members. Get help, share ideas, and stay updated.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-6">
                  <Users className="w-3.5 h-3.5" />
                  <span>{discord.member_count || '2,847+'} Members Online</span>
                </div>
                <a href={discord.invite_url || '#'} target="_blank" rel="noopener noreferrer">
                  <button className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-300 hover:shadow-[0_0_25px_rgba(88,101,242,0.4)]"
                    style={{ background: '#5865F2' }}>
                    <MessageCircle className="w-4 h-4 inline mr-2" />
                    Join Discord
                  </button>
                </a>
              </div>
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
};

export default BeyondGaming;
