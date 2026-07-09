import { MessageCircle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

const ChatbotButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    apiFetch('/site-features').then(r => r.json()).then(d => setEnabled(d.live_chat?.enabled !== false)).catch(() => setEnabled(true));
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 z-50 w-80 md:w-96 animate-scale-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-accent to-accent/80 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">CodeNest Solution Support</h3>
                  <p className="text-xs text-white/80">We typically reply instantly</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="p-4 h-72 bg-background overflow-y-auto">
              <div className="flex flex-col gap-3">
                {/* Bot Message */}
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-secondary/50 rounded-2xl rounded-tl-none p-3 max-w-[80%]">
                    <p className="text-sm text-foreground">
                      👋 Hey there! Welcome to CodeNest Solution. How can we help you today?
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 ml-10">
                  <a
                    href="https://discord.gg/R8U3wKxwkd"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs rounded-full border border-primary/50 text-primary hover:bg-primary/10 transition-colors"
                  >
                    Join Discord
                  </a>
                  <a
                    href="https://support.codenestsolution.shop"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs rounded-full border border-primary/50 text-primary hover:bg-primary/10 transition-colors"
                  >
                    Submit Ticket
                  </a>
                  <a
                    href="mailto:solutioncodenest@gmail.com"
                    className="px-3 py-1.5 text-xs rounded-full border border-primary/50 text-primary hover:bg-primary/10 transition-colors"
                  >
                    Email Us
                  </a>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border bg-card">
              <a
                href="https://support.codenestsolution.shop"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-xl btn-primary-gradient text-foreground font-medium text-sm flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Start a Conversation
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center group ${
          isOpen 
            ? 'bg-secondary hover:bg-secondary/80' 
            : 'btn-primary-gradient hover:scale-110'
        }`}
        style={{
          boxShadow: isOpen ? 'none' : '0 0 20px hsl(270 70% 60% / 0.5)',
        }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-foreground" />
        ) : (
          <MessageCircle className="w-6 h-6 text-foreground" />
        )}
        
        {/* Pulse Animation when closed */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full animate-ping bg-accent/30" />
        )}
      </button>
    </>
  );
};

export default ChatbotButton;
