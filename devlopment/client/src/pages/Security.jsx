import { useState } from 'react';
import { api } from '../api/axios';
import { Shield, Lock, Smartphone, Key } from 'lucide-react';

export default function Security() {
  const [form, setForm] = useState({ current: '', newpass: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newpass !== form.confirm) return setError('Passwords do not match');
    if (form.newpass.length < 6) return setError('Password must be at least 6 characters');
    try {
      await api('/profile/password', { method: 'PUT', body: JSON.stringify({ current: form.current, newpass: form.newpass }) });
      setSuccess(true);
      setForm({ current: '', newpass: '', confirm: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">Security</h1>

      <div className="card">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</h3>
        {error && <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">{error}</div>}
        {success && <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success">Password changed successfully!</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Current Password</label>
            <input type="password" value={form.current} onChange={e => setForm(p => ({ ...p, current: e.target.value }))} className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">New Password</label>
              <input type="password" value={form.newpass} onChange={e => setForm(p => ({ ...p, newpass: e.target.value }))} className="input-field" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Confirm New</label>
              <input type="password" value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} className="input-field" required />
            </div>
          </div>
          <button type="submit" className="btn-primary">Update Password</button>
        </form>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Smartphone className="w-4 h-4" /> Two-Factor Authentication</h3>
        <p className="text-xs text-muted-foreground">Enhance your account security with 2FA.</p>
        <button className="btn-secondary mt-3 text-sm">Enable 2FA</button>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Key className="w-4 h-4" /> API Keys</h3>
        <p className="text-xs text-muted-foreground">Manage your API access tokens.</p>
        <button className="btn-secondary mt-3 text-sm">Generate API Key</button>
      </div>
    </div>
  );
}
