import { useState, useEffect } from 'react';
import { MessageCircle, Users, ExternalLink } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';
import { apiFetch } from '@/lib/api';

const DiscordWidget = () => {
  const [config, setConfig] = useState<{ enabled: boolean; invite_url: string; title: string; member_count: string } | null>(null);

  useEffect(() => {
    apiFetch('/site-features').then(r => r.json()).then(d => setConfig(d.discord)).catch(() => {});
  }, []);

  if (!config?.enabled) return null;

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <ScrollReveal animation="fade-up">
          <div className="max-w-xl mx-auto relative overflow-hidden rounded-2xl border border-border p-8 md:p-10 text-center"
            style={{ background: 'linear-gradient(135deg, hsl(230 70% 55% / 0.1), hsl(230 70% 45% / 0.05))' }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 50% 0%, hsl(230 70% 55% / 0.15), transparent 60%)' }} />
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-discord/10 flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-[#5865F2]" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">{config.title || 'Join Our Community'}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Connect with {config.member_count || 'thousands of'} other members. Get help, share ideas, and stay updated.
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-6">
                <Users className="w-3.5 h-3.5" />
                <span>{config.member_count || '2,847+'} Members Online</span>
              </div>
              <a href={config.invite_url || '#'} target="_blank" rel="noopener noreferrer">
                <button className="px-8 py-3 rounded-lg font-semibold text-white transition-all duration-300 hover:shadow-[0_0_25px_rgba(88,101,242,0.4)]"
                  style={{ background: '#5865F2' }}>
                  <MessageCircle className="w-4 h-4 inline mr-2" />
                  Join Discord
                </button>
              </a>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default DiscordWidget;