import { useState, useEffect } from 'react';
import { api } from '../api/axios';
import { Users, Copy, Check, Wallet, TrendingUp, Gift } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Referrals() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState('');

  useEffect(() => { api('/referrals').then(setData).catch(() => {}); }, []);

  const refLink = data ? `${window.location.origin}/devlopment/register?ref=${data.referral_code}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const requestPayout = async () => {
    try {
      const res = await api('/referrals/payout', { method: 'POST' });
      setPayoutMsg(`₹${res.amount} added to wallet!`);
      api('/referrals').then(setData).catch(() => {});
    } catch (e) { setPayoutMsg(e.message); }
    setTimeout(() => setPayoutMsg(''), 3000);
  };

  if (!data) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Affiliate Program</h1>
        <p className="text-sm text-muted-foreground mt-1">Refer friends and earn rewards</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3"><Users className="w-5 h-5 text-primary" /></div>
          <p className="text-2xl font-bold text-foreground">{data.stats.count}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Referrals</p>
        </div>
        <div className="card text-center">
          <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3"><TrendingUp className="w-5 h-5 text-success" /></div>
          <p className="text-2xl font-bold text-foreground">₹{data.stats.earnings}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Earnings</p>
        </div>
        <div className="card text-center">
          <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-3"><Wallet className="w-5 h-5 text-warning" /></div>
          <p className="text-2xl font-bold text-foreground">₹{data.stats.balance}</p>
          <p className="text-xs text-muted-foreground mt-1">Available Balance</p>
        </div>
      </div>

      <div className="card space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Gift className="w-4 h-4 text-primary" /> Your Referral Link</h3>
        <div className="flex gap-2">
          <input readOnly value={refLink} className="input-field flex-1 text-xs" />
          <button onClick={copyLink} className="btn-primary flex items-center gap-1.5">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">Share this link with friends. You earn when they register and purchase!</p>
      </div>

      {payoutMsg && <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success">{payoutMsg}</div>}

      {data.stats.balance >= 100 && (
        <button onClick={requestPayout} className="btn-primary w-full">Request Payout (Min ₹100)</button>
      )}

      <div className="card">
        <h3 className="text-sm font-bold text-foreground mb-4">Referral History</h3>
        {data.list.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No referrals yet. Share your link!</p>
        ) : (
          <div className="space-y-2">
            {data.list.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">{r.referred_name || r.referred_email || 'Unknown'}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`badge ${r.status === 'paid' ? 'badge-paid' : 'badge-pending'}`}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
