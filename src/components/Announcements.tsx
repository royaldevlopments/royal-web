import { useState, useEffect } from 'react';
import { Megaphone, ChevronDown, Calendar } from 'lucide-react';
import ScrollReveal from '@/components/ScrollReveal';
import { apiFetch } from '@/lib/api';

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    apiFetch('/announcements')
      .then(r => r.json())
      .then(setAnnouncements)
      .catch(() => {});
  }, []);

  if (!announcements.length) return null;

  return (
    <section className="py-6 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex items-center gap-2 mb-4 justify-center">
          <Megaphone className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-semibold text-purple-400 tracking-wider">ANNOUNCEMENTS</span>
        </div>

        <div className="space-y-2">
          {announcements.map((item, i) => (
            <ScrollReveal key={item.id} animation="fade-up" delay={i * 50}>
              <div
                className="rounded-xl border border-border overflow-hidden transition-all duration-300 hover:border-[#1cc4e8]/30 cursor-pointer"
                style={{ background: 'linear-gradient(180deg, hsl(230 20% 10%) 0%, hsl(230 20% 7%) 100%)' }}
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              >
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Megaphone className="w-3 h-3 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Calendar className="w-2.5 h-2.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-muted-foreground shrink-0 transition-transform duration-300 ${expanded === item.id ? 'rotate-180' : ''}`} />
                </div>
                {expanded === item.id && (
                  <div className="px-3 pb-3 pt-0 border-t border-border mt-0">
                    <div className="pl-8 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">{item.content}</div>
                  </div>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}