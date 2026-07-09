import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/axios';
import { ArrowLeft, Send, Paperclip } from 'lucide-react';

export default function TicketDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState('');

  useEffect(() => { api(`/tickets/${id}`).then(setTicket).catch(() => {}); }, [id]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    try {
      await api(`/tickets/${id}/reply`, { method: 'POST', body: JSON.stringify({ message: reply }) });
      setReply('');
      api(`/tickets/${id}`).then(setTicket);
    } catch (e) { alert(e.message); }
  };

  const closeTicket = async () => {
    try {
      await api(`/tickets/${id}/close`, { method: 'POST' });
      api(`/tickets/${id}`).then(setTicket);
    } catch (e) { alert(e.message); }
  };

  if (!ticket) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/tickets" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Tickets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages */}
        <div className="lg:col-span-2 card space-y-4">
          <h2 className="text-lg font-bold text-foreground">Ticket #{ticket.id.slice(0, 6)} - {ticket.subject}</h2>

          <div className="space-y-4">
            {ticket.replies?.map(r => (
              <div key={r.id} className={`flex gap-3 ${r.is_staff ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${r.is_staff ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                  {r.user_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className={`flex-1 ${r.is_staff ? 'text-right' : ''}`}>
                  <p className="text-xs text-muted-foreground">{r.user_name || 'You'} · {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-sm text-foreground mt-1 bg-secondary p-3 rounded-lg inline-block">{r.message}</p>
                  {r.attachment && <p className="text-xs text-primary mt-1 flex items-center gap-1"><Paperclip className="w-3 h-3" /> {r.attachment}</p>}
                </div>
              </div>
            ))}
          </div>

          {ticket.status !== 'closed' && (
            <div className="space-y-3 pt-4 border-t border-border">
              <textarea value={reply} onChange={e => setReply(e.target.value)} className="input-field min-h-[80px]" placeholder="Type your reply..." />
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground">Upload Attachments or drag and drop</p>
                <p className="text-[10px] text-muted mt-1">Files up to 10MB</p>
              </div>
              <div className="flex gap-2">
                <button onClick={sendReply} className="btn-primary text-sm flex items-center gap-1.5"><Send className="w-3.5 h-3.5" /> Reply</button>
                <button onClick={closeTicket} className="btn-secondary text-sm">Close Ticket</button>
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="card space-y-4 h-fit">
          <h3 className="text-sm font-semibold text-foreground">Ticket Details</h3>
          {[
            ['Subject', ticket.subject],
            ['Status', ticket.status],
            ['Priority', ticket.priority],
            ['Created', new Date(ticket.created_at).toLocaleDateString()],
            ['Department', ticket.department],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium text-foreground mt-0.5 capitalize">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
