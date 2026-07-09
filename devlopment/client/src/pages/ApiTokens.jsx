import { useState, useEffect } from 'react';
import { api } from '../api/axios';
import { Key, Plus, Copy, Check, Trash2, AlertCircle } from 'lucide-react';

export default function ApiTokens() {
  const [tokens, setTokens] = useState([]);
  const [newName, setNewName] = useState('');
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const load = () => api('/tokens').then(setTokens).catch(() => {});

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newName.trim()) return;
    try {
      const res = await api('/tokens', { method: 'POST', body: { name: newName.trim() } });
      setCreated(res);
      setNewName('');
      setCopied(false);
      load();
    } catch (e) { setError(e.message); }
  };

  const remove = async (id) => {
    await api(`/tokens/${id}`, { method: 'DELETE' });
    load();
  };

  const copyToken = () => {
    if (!created) return;
    navigator.clipboard.writeText(created.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">API Tokens</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage personal access tokens for API integration</p>
      </div>

      {created && (
        <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-warning font-bold text-sm"><AlertCircle className="w-4 h-4" /> Token Created</div>
          <p className="text-xs text-muted-foreground">Copy this token now. You won't be able to see it again!</p>
          <div className="flex gap-2">
            <input readOnly value={created.token} className="input-field flex-1 text-xs" />
            <button onClick={copyToken} className="btn-primary flex items-center gap-1.5 text-xs">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <button onClick={() => setCreated(null)} className="text-xs text-primary hover:underline">Dismiss</button>
        </div>
      )}

      {error && <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">{error}</div>}

      <div className="card">
        <h3 className="text-sm font-bold text-foreground mb-3">Create New Token</h3>
        <div className="flex gap-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Token name (e.g. My App)" className="input-field flex-1" />
          <button onClick={create} className="btn-primary flex items-center gap-1.5"><Plus className="w-4 h-4" /> Create</button>
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-bold text-foreground mb-4">Your Tokens</h3>
        {tokens.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No API tokens created yet.</p>
        ) : (
          <div className="space-y-2">
            {tokens.map(t => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">Last used: {t.last_used ? new Date(t.last_used).toLocaleDateString() : 'Never'} · Created: {new Date(t.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <button onClick={() => remove(t.id)} className="p-1.5 hover:bg-danger/10 rounded-lg text-muted-foreground hover:text-danger"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
