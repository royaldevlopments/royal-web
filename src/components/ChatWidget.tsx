import { MessageCircle, X, Send, Bot, User, Trash2, Ticket, ExternalLink } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

const SESSION_KEY = 'ai_chat_session';

function getSessionId() {
  let sid = sessionStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = 'sid_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

const welcomeMessage = {
  role: 'assistant',
  text: `Hello! 👋 Welcome to **Royal Devlopments**! I'm your AI assistant. I can help you with:

• Hosting plans and pricing (Minecraft, Palworld, VPS, etc.)
• Account and billing support
• Server setup and configuration
• Technical troubleshooting

What can I help you with today?`,
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await apiFetch('/chat/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: getSessionId() }),
      });
      if (!res.ok) throw new Error('Failed to get response');
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I encountered an error. Please try again or contact support@royaldevlopments.com' }]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    apiFetch('/chat/ai/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: getSessionId() }),
    }).catch(() => {});
    setMessages([welcomeMessage]);
  }

  function renderMessage(text) {
    const ticketUrl = 'https://royal-web-seven.vercel.app/devlopment/tickets';
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return (
      <>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {parts.map((part, i) => {
            if (part.startsWith('http')) {
              const isTicket = part.includes('/tickets');
              return isTicket ? (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: '#1cc4e8', color: '#fff' }}>
                  <Ticket className="w-3.5 h-3.5" /> Create Ticket <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <a key={i} href={part} target="_blank" rel="noopener noreferrer"
                  className="text-[#1cc4e8] underline hover:brightness-110">
                  {part}
                </a>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </div>
        {text.includes(ticketUrl) && (
          <div className="mt-2 text-[10px] text-gray-500">Need more help? Click the button above to create a ticket.</div>
        )}
      </>
    );
  }

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-4 z-50" style={{ width: '340px' }}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ height: '480px' }}>
            <div className="p-4 flex items-center justify-between shrink-0" style={{ background: 'linear-gradient(135deg, #1cc4e8, #0ea5e9)' }}>
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-semibold text-white text-sm">AI Assistant</h3>
                  <p className="text-[10px] text-white/70">Powered by Royal Devlopments</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={clearChat} className="p-1.5 rounded-full hover:bg-white/20" title="Clear chat">
                  <Trash2 className="w-4 h-4 text-white/80" />
                </button>
                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-full hover:bg-white/20">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ background: '#0a0b1e' }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-[#1cc4e8]/20' : 'bg-gradient-to-br from-[#1cc4e8] to-[#0ea5e9]'}`}>
                    {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-[#1cc4e8]" /> : <Bot className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${msg.role === 'user' ? 'bg-[#1cc4e8] text-white rounded-tr-none' : 'bg-[#1a1c2e] text-[#e2e8f0] rounded-tl-none border border-gray-800/50'}`}>
                    {msg.role === 'user' ? <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</div> : renderMessage(msg.text)}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-[#1cc4e8] to-[#0ea5e9]">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-[#1a1c2e] border border-gray-800/50 rounded-2xl rounded-tl-none px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-[#1cc4e8] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-[#1cc4e8] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-[#1cc4e8] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-gray-800 shrink-0" style={{ background: '#111322' }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask me anything..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1cc4e8] bg-[#0a0b1e] text-gray-200 placeholder-gray-500"
                  style={{ background: '#0a0b1e' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="px-3.5 py-2 rounded-xl disabled:opacity-40 flex items-center justify-center transition-all hover:brightness-110"
                  style={{ background: '#1cc4e8', color: '#fff' }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-gray-600 mt-1.5 text-center">AI assistant may not be accurate. Contact support for critical issues.</p>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all"
        style={{ background: 'linear-gradient(135deg, #1cc4e8, #0ea5e9)', boxShadow: '0 4px 20px rgba(28, 196, 232, 0.4)' }}
      >
        {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
      </button>
    </>
  );
}
