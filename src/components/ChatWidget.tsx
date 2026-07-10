import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const headers = {};
      const res = await apiFetch('/chat/messages', { headers });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      pollRef.current = setInterval(fetchMessages, 5000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isOpen, fetchMessages]);

  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      setUnreadCount(messages.filter(m => !m.is_read && !m.is_admin).length);
    } else {
      setUnreadCount(0);
    }
  }, [messages, isOpen]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function sendMessage() {
    if (!messageText.trim()) return;
    setSending(true);
    setError('');
    try {
      const headers = { 'Content-Type': 'application/json' };
      const res = await apiFetch('/chat/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: name.trim() || 'Guest', email: email.trim() || null, message: messageText.trim() }),
      });
      if (!res.ok) throw new Error('Failed to send');
      const created = await res.json();
      setMessages(prev => [...prev, created]);
      setMessageText('');
    } catch (e) {
      setError(e.message || 'Failed to send');
    } finally { setSending(false); }
  }

  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-4 z-50" style={{ width: '320px' }}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ height: '450px' }}>
            <div className="p-4 flex items-center justify-between shrink-0" style={{ background: '#1cc4e8' }}>
              <div>
                <h3 className="font-semibold text-white text-sm">Live Chat</h3>
                <p className="text-xs text-white/80">We're here to help</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-full hover:bg-white/20">
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ background: '#0a0b1e' }}>
              {loading && messages.length === 0 && <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-gray-500 animate-spin" /></div>}
              {error && messages.length === 0 && <div className="flex items-center justify-center h-full"><p className="text-sm text-red-400">{error}</p></div>}
              {messages.length === 0 && !loading && !error && (
                <div className="flex items-center justify-center h-full"><p className="text-sm text-gray-500">Start a conversation!</p></div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.is_admin ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${msg.is_admin ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                    style={{ background: msg.is_admin ? '#1cc4e8' : '#1a1c2e', color: msg.is_admin ? '#fff' : '#e2e8f0' }}>
                    <p className="text-xs font-medium opacity-80">{msg.is_admin ? 'Support' : msg.name}</p>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{msg.message}</p>
                    <p className="text-[10px] opacity-60 text-right mt-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-gray-800 shrink-0" style={{ background: '#111322' }}>
              <div className="flex gap-2">
                <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)}
                  className="w-full mb-2 px-3 py-1.5 text-sm rounded-lg border border-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1cc4e8]"
                  style={{ background: '#0a0b1e', color: '#e2e8f0' }} />
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Type your message..." value={messageText} onChange={e => setMessageText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-700 focus:outline-none focus:ring-1 focus:ring-[#1cc4e8]"
                  style={{ background: '#0a0b1e', color: '#e2e8f0' }} />
                <button onClick={sendMessage} disabled={sending || !messageText.trim()}
                  className="px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center justify-center" style={{ background: '#1cc4e8', color: '#fff' }}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all"
        style={{ background: '#1cc4e8', boxShadow: '0 0 20px rgba(28, 196, 232, 0.5)' }}>
        {isOpen ? <X className="w-6 h-6 text-white" /> : <MessageCircle className="w-6 h-6 text-white" />}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </>
  );
}
