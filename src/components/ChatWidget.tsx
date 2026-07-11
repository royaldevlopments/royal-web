import { MessageCircle, X, Send, Bot, User, Plus, History, Ticket, ExternalLink, ChevronRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

const STORAGE_KEY = 'rd_chat_sessions';
const ACTIVE_KEY = 'rd_chat_active';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const WELCOME_TEXT = `Hello! 👋 Welcome to **Royal Devlopments**! I'm your AI assistant. I can help you with:

• Hosting plans and pricing (Minecraft, Palworld, VPS, etc.)
• Account and billing support
• Server setup and configuration
• Technical troubleshooting

What can I help you with today?`;

function genId() {
  return 's_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const sessions = raw ? JSON.parse(raw) : {};
    const activeId = localStorage.getItem(ACTIVE_KEY);
    return { sessions, activeId };
  } catch {
    return { sessions: {}, activeId: null };
  }
}

function persist(sessions: Record<string, Session>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); } catch {}
}

function persistActive(id: string) {
  try { localStorage.setItem(ACTIVE_KEY, id); } catch {}
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return mins + 'm';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h';
  const days = Math.floor(hrs / 24);
  return days + 'd';
}

function firstLine(text: string) {
  return text.replace(/\*\*/g, '').split('\n')[0].slice(0, 40);
}

function truncate(text: string, len: number) {
  return text.length > len ? text.slice(0, len) + '...' : text;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<Record<string, Session>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { sessions: s } = loadData();
    setSessions(s);
    if (Object.keys(s).length === 0) {
      freshSession();
    } else {
      const active = localStorage.getItem(ACTIVE_KEY);
      if (active && s[active]) {
        setActiveId(active);
      } else {
        const sorted = Object.values(s).sort((a, b) => b.updatedAt - a.updatedAt);
        setActiveId(sorted[0].id);
      }
    }
  }, []);

  useEffect(() => {
    if (Object.keys(sessions).length > 0) persist(sessions);
  }, [sessions]);

  useEffect(() => {
    if (activeId) persistActive(activeId);
  }, [activeId]);

  useEffect(() => {
    if (!isOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!loading) setTimeout(() => inputRef.current?.focus(), 200);
  }, [sessions, activeId, loading, isOpen]);

  // Close history dropdown on outside click
  useEffect(() => {
    if (!showHistory) return;
    function handleClick(e: MouseEvent) {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showHistory]);

  const active = activeId ? sessions[activeId] : null;
  const msgs = active?.messages || [];
  const recentSessions = Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt);

  function freshSession() {
    const id = genId();
    setSessions(prev => ({
      [id]: { id, title: 'New Chat', messages: [], createdAt: Date.now(), updatedAt: Date.now() },
      ...prev,
    }));
    setActiveId(id);
    setShowHistory(false);
  }

  function toggleOpen() {
    if (isOpen) {
      setIsOpen(false);
    } else {
      const { sessions: s } = loadData();
      setSessions(s);
      const active = localStorage.getItem(ACTIVE_KEY);
      if (active && s[active]) {
        setActiveId(active);
      } else {
        freshSession();
      }
      setIsOpen(true);
    }
  }

  function switchSession(id: string) {
    if (!sessions[id]) return;
    setActiveId(id);
    setShowHistory(false);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || !activeId) return;
    setInput('');

    const userMsg: Message = { role: 'user', text };
    const updated = { ...sessions };
    const session = updated[activeId];
    const isFirstMsg = session.messages.length === 0;
    const title = isFirstMsg ? truncate(text.replace(/\*\*/g, ''), 30) : session.title;

    session.messages = [...session.messages, userMsg];
    session.title = title;
    session.updatedAt = Date.now();
    setSessions(updated);
    setLoading(true);

    try {
      const res = await apiFetch('/chat/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: activeId }),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error('HTTP ' + res.status + ': ' + errBody.slice(0, 200));
      }
      const data = await res.json();
      const botMsg: Message = { role: 'assistant', text: data.reply };
      setSessions(prev => {
        const s = { ...prev };
        if (s[activeId]) {
          s[activeId] = { ...s[activeId], messages: [...s[activeId].messages, botMsg], updatedAt: Date.now() };
        }
        return s;
      });
    } catch (e) {
      const errMsg: Message = {
        role: 'assistant',
        text: e instanceof Error ? 'Error: ' + e.message : 'Request failed. Check console.',
      };
      setSessions(prev => {
        const s = { ...prev };
        if (s[activeId]) {
          s[activeId] = { ...s[activeId], messages: [...s[activeId].messages, errMsg], updatedAt: Date.now() };
        }
        return s;
      });
    } finally {
      setLoading(false);
    }
  }

  function renderMessage(text: string, role: string) {
    if (role === 'user') return <div className="text-sm leading-relaxed whitespace-pre-wrap">{text}</div>;

    const ticketUrl = 'https://royal-web-seven.vercel.app/devlopment/tickets';
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return (
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
                className="text-[#1cc4e8] underline hover:brightness-110">{part}</a>
            );
          }
          return <span key={i}>{part}</span>;
        })}
        {text.includes(ticketUrl) && (
          <div className="mt-2 text-[10px] text-gray-500">Need more help? Use the button above to create a ticket.</div>
        )}
      </div>
    );
  }

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-4 z-50" style={{ width: '360px', maxWidth: 'calc(100vw - 2rem)' }}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ height: '520px' }}>
            {/* Header */}
            <div className="p-3 flex items-center justify-between shrink-0" style={{ background: 'linear-gradient(135deg, #1cc4e8, #0ea5e9)' }}>
              <div className="flex items-center gap-2 min-w-0">
                <Bot className="w-5 h-5 text-white shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{active?.title || 'AI Assistant'}</h3>
                  <p className="text-[10px] text-white/70">Powered by Royal Devlopments</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <div className="relative" ref={historyRef}>
                  <button onClick={() => setShowHistory(!showHistory)} className="p-1.5 rounded-full hover:bg-white/20" title="Recent Chats">
                    <History className="w-4 h-4 text-white/80" />
                  </button>
                  {showHistory && (
                    <div className="absolute right-0 top-full mt-1 w-72 rounded-xl border border-gray-700 shadow-2xl overflow-hidden z-50"
                      style={{ background: '#111322' }}>
                      <div className="max-h-72 overflow-y-auto py-1">
                        <button
                          onClick={() => { freshSession(); setShowHistory(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#1cc4e8] font-medium hover:bg-white/5 border-b border-gray-800/60">
                          <Plus className="w-4 h-4" /> New Chat
                        </button>
                        {recentSessions.length === 0 && (
                          <p className="text-xs text-gray-500 text-center py-6">No chats yet</p>
                        )}
                        {recentSessions.map(s => {
                          const isActive = s.id === activeId;
                          const lastMsg = s.messages[s.messages.length - 1];
                          const preview = lastMsg
                            ? (lastMsg.role === 'user' ? 'You: ' : '') + firstLine(lastMsg.text)
                            : 'No messages';
                          return (
                            <button
                              key={s.id}
                              onClick={() => switchSession(s.id)}
                              className={`w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-white/5 ${
                                isActive ? 'bg-[#1cc4e8]/5' : ''
                              }`}
                            >
                              <ChevronRight className={`w-3 h-3 shrink-0 ${isActive ? 'text-[#1cc4e8]' : 'text-gray-600'}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`text-xs font-medium truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                                    {s.title}
                                  </span>
                                  <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(s.updatedAt)}</span>
                                </div>
                                <p className="text-[11px] text-gray-600 truncate">{preview}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={freshSession} className="p-1.5 rounded-full hover:bg-white/20" title="New Chat">
                  <Plus className="w-4 h-4 text-white/80" />
                </button>
                <button onClick={toggleOpen} className="p-1.5 rounded-full hover:bg-white/20" title="Close">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ background: '#0a0b1e' }}>
              {msgs.length === 0 && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-gradient-to-br from-[#1cc4e8] to-[#0ea5e9]">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 bg-[#1a1c2e] text-[#e2e8f0] rounded-tl-none border border-gray-800/50">
                    {renderMessage(WELCOME_TEXT, 'assistant')}
                  </div>
                </div>
              )}

              {msgs.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    msg.role === 'user' ? 'bg-[#1cc4e8]/20' : 'bg-gradient-to-br from-[#1cc4e8] to-[#0ea5e9]'
                  }`}>
                    {msg.role === 'user' ? <User className="w-3.5 h-3.5 text-[#1cc4e8]" /> : <Bot className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-[#1cc4e8] text-white rounded-tr-none'
                      : 'bg-[#1a1c2e] text-[#e2e8f0] rounded-tl-none border border-gray-800/50'
                  }`}>
                    {renderMessage(msg.text, msg.role)}
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

            {/* Input */}
            <div className="p-3 border-t border-gray-800 shrink-0" style={{ background: '#111322' }}>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ask me anything..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1cc4e8] text-gray-200 placeholder-gray-500"
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
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all"
        style={{ background: 'linear-gradient(135deg, #1cc4e8, #0ea5e9)', boxShadow: '0 4px 20px rgba(28, 196, 232, 0.4)' }}
      >
        {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
      </button>
    </>
  );
}
