import { useState, useEffect } from 'react';
import { api } from '../api/axios';
import { User, Mail, Phone, MapPin } from 'lucide-react';

export default function Profile() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', city: '', state: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api('/auth/me').then(u => setForm({ name: u.name || '', email: u.email || '', phone: u.phone || '', address: u.address || '', city: u.city || '', state: u.state || '' })).catch(() => window.location.href = '/login');
  }, []);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    try {
      await api('/profile', { method: 'PUT', body: JSON.stringify(form) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">Personal Information</h1>

      <form onSubmit={save} className="card space-y-4">
        {saved && <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success">Profile updated successfully!</div>}

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input value={form.name} onChange={e => update('name', e.target.value)} className="input-field pl-10" />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input value={form.email} disabled className="input-field pl-10 opacity-60" />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input value={form.phone} onChange={e => update('phone', e.target.value)} className="input-field pl-10" />
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input value={form.address} onChange={e => update('address', e.target.value)} className="input-field pl-10" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">City</label>
            <input value={form.city} onChange={e => update('city', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">State</label>
            <input value={form.state} onChange={e => update('state', e.target.value)} className="input-field" />
          </div>
        </div>

        <button type="submit" className="btn-primary">Save Changes</button>
      </form>
    </div>
  );
}
