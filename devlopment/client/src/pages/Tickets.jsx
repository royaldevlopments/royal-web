import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { Ticket, Plus } from 'lucide-react';

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', department: 'Support', priority: 'low', service_id: '', message: '' });
  const navigate = useNavigate();

  useEffect(() => { api('/tickets').then(setTickets).catch(() => {}); }, []);

  const createTicket = async (e) => {
    e.preventDefault();
    try {
      const t = await api('/tickets', { method: 'POST', body: JSON.stringify(form) });
      navigate(`/tickets/${t.id}`);
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Tickets</h1>
        <button onClick={() => setShowForm(p => !p)} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Create Ticket
        </button>
      </div>

      {showForm && (
        <form onSubmit={createTicket} className="card space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Create Ticket</h3>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Subject *</label>
            <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className="input-field" placeholder="Subject" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Department *</label>
              <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} className="input-field">
                <option>Support</option>
                <option>Billing</option>
                <option>Technical</option>
                <option>Sales</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Priority *</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="input-field">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Service</label>
            <select value={form.service_id} onChange={e => setForm(p => ({ ...p, service_id: e.target.value }))} className="input-field">
              <option value="">Select Service (optional)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Message</label>
            <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} className="input-field min-h-[100px]" placeholder="Describe your issue..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Attachments</label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <p className="text-xs text-muted-foreground">Upload Attachments or drag and drop</p>
              <p className="text-[10px] text-muted mt-1">Files up to 10MB</p>
            </div>
          </div>
          <button type="submit" className="btn-primary text-sm">Submit Ticket</button>
        </form>
      )}

      {tickets.length === 0 ? (
        <div className="card text-center py-12">
          <Ticket className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No tickets found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <Link key={t.id} to={`/tickets/${t.id}`} className="card block hover:bg-card-hover transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">Ticket #{t.id.slice(0, 6)} - {t.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.department} · {new Date(t.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-open">{t.priority}</span>
                  <span className={`badge ${t.status === 'open' ? 'badge-open' : t.status === 'closed' ? 'badge-closed' : 'badge-pending'}`}>{t.status}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
