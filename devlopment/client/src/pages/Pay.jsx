import { useState } from 'react';
import { api } from '../api/axios';

export default function Pay() {
  const [invId, setInvId] = useState('');
  const [loading, setLoading] = useState(false);
  const payNow = async () => {
    if (!invId) return;
    setLoading(true);
    try {
      await api(`/invoices/${invId}/pay`, { method: 'POST', body: JSON.stringify({ method: 'cashfree' }) });
      alert('Payment successful!');
    } catch (e) { alert(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="max-w-lg mx-auto mt-12 space-y-6">
      <div className="card text-center">
        <h1 className="text-xl font-bold text-foreground">Pay Invoice</h1>
        <input className="input-field mt-4" value={invId} onChange={e => setInvId(e.target.value)} placeholder="Invoice ID" />
        <button onClick={payNow} disabled={loading} className="btn-primary w-full mt-4">{loading ? 'Processing...' : 'Pay Now'}</button>
      </div>
    </div>
  );
}
