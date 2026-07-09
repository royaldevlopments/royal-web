import { useState, useEffect } from 'react';
import { api } from '../api/axios';
import { Wallet, Plus, Loader, ShieldCheck, TrendingUp, ArrowDownRight, ArrowUpRight, CreditCard, ChevronLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const amounts = [100, 500, 1000, 2000, 5000];

const methods = [
  { id: 'razorpay', name: 'Razorpay', icon: CreditCard, desc: 'UPI · Cards · Netbanking · Wallet · EMI', color: 'from-indigo-600 to-indigo-500', shadow: 'shadow-indigo-500/25' },
  { id: 'cashfree', name: 'Cashfree', icon: Wallet, desc: 'Cards · UPI · Netbanking · Paylater', color: 'from-blue-600 to-blue-500', shadow: 'shadow-blue-500/25' },
];

export default function PaymentMethods() {
  const { user } = useAuth();
  const [step, setStep] = useState('amount');
  const [amount, setAmount] = useState(500);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [paying, setPaying] = useState(false);
  const [txns, setTxns] = useState([]);
  const [paid, setPaid] = useState(false);
  const [newBalance, setNewBalance] = useState(null);

  useEffect(() => { api('/wallet/transactions').then(setTxns).catch(() => {}); }, []);

  const getAmount = () => {
    if (customAmount) return parseFloat(customAmount);
    return amount;
  };

  const proceedToPayment = () => {
    const amt = getAmount();
    if (!amt || amt < 1) return alert('Enter a valid amount');
    setStep('method');
  };

  const payRazorpay = async () => {
    setPaying(true);
    const amt = getAmount();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    await new Promise(r => { script.onload = r; script.onerror = r; document.body.appendChild(script); });
    if (!window.Razorpay) { alert('Razorpay SDK failed to load'); setPaying(false); return; }
    try {
      const o = await api('/wallet/create-topup', { method: 'POST', body: JSON.stringify({ amount: amt }) });
      if (o.paid) { handleSuccess(amt); return; }
      const rzp = new window.Razorpay({
        key: o.key, amount: o.amount, currency: 'INR', name: 'Royal Devlopments',
        description: 'Wallet Top-Up', image: '/logo/icon.png', order_id: o.order_id,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#6366f1' },
        handler: async (r) => {
          const res = await api('/wallet/verify-topup', { method: 'POST', body: JSON.stringify({ razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature }) });
          if (res.success) { setNewBalance(res.balance); handleSuccess(amt); }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.on('payment.failed', () => setPaying(false));
      rzp.open();
    } catch (e) { alert(e.message); setPaying(false); }
  };

  const handleSuccess = (amt) => {
    setPaid(true);
    setPaying(false);
    api('/wallet/transactions').then(setTxns);
  };

  const processPayment = () => {
    if (!selectedMethod) return;
    if (selectedMethod === 'razorpay') payRazorpay();
    else if (selectedMethod === 'cashfree') payCashfree();
  };

  const payCashfree = async () => {
    setPaying(true);
    try {
      const amt = getAmount();
      const res = await api('/payment/create-cf-order', { method: 'POST', body: JSON.stringify({ invoice_id: 'wallet-' + Date.now(), amount: amt }) });
      if (res.payment_link) { window.location.href = res.payment_link; return; }
      if (res.test_mode) {
        await api('/wallet/manual-topup', { method: 'POST', body: JSON.stringify({ amount: amt, method: 'Cashfree' }) });
        const me = await api('/auth/me');
        setNewBalance(me.balance);
        handleSuccess(amt);
      }
    } catch (e) { alert(e.message); setPaying(false); }
  };

  // ---------- Success Screen ----------
  if (paid) return (
    <div className="max-w-lg mx-auto mt-12">
      <div className="card text-center space-y-6 py-10">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto"><ShieldCheck className="w-8 h-8 text-success" /></div>
        <h1 className="text-xl font-bold text-foreground">Wallet Top-Up Successful!</h1>
        <p className="text-sm text-muted-foreground">₹{getAmount()} has been added to your wallet.</p>
        {newBalance !== null && (
          <div className="bg-secondary rounded-xl p-4"><div className="flex justify-between text-sm"><span className="text-muted-foreground">New Balance</span><span className="text-foreground font-bold">₹{newBalance}</span></div></div>
        )}
        <div className="flex gap-3">
          <button onClick={() => { setPaid(false); setStep('amount'); setCustomAmount(''); setSelectedMethod(null); }} className="btn-primary flex-1 text-sm">Top Up Again</button>
          <button onClick={() => setStep('txns')} className="btn-secondary flex-1 text-sm">View History</button>
        </div>
      </div>
    </div>
  );

  // ---------- Step 1: Enter Amount ----------
  if (step === 'amount') return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Wallet Balance</p>
            <p className="text-3xl font-bold text-foreground">₹{user?.balance || 0}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"><Wallet className="w-7 h-7 text-primary" /></div>
        </div>
      </div>

      <div className="card space-y-5">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2"><Plus className="w-4 h-4 text-primary" /> Add Money</h3>
        <p className="text-xs text-muted-foreground">Select amount to add to your wallet</p>

        <div className="grid grid-cols-5 gap-2">
          {amounts.map(a => (
            <button key={a} onClick={() => { setAmount(a); setCustomAmount(''); }} className={`py-3 rounded-xl text-sm font-semibold border transition-all ${amount === a && !customAmount ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'}`}>
              ₹{a}
            </button>
          ))}
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Custom Amount</label>
          <div className="flex gap-2">
            <span className="flex items-center px-4 bg-secondary rounded-xl text-muted-foreground font-semibold">₹</span>
            <input type="number" value={customAmount} onChange={e => { setCustomAmount(e.target.value); setAmount(0); }} className="input-field flex-1" placeholder="Enter amount" min="1" />
          </div>
        </div>

        <button onClick={proceedToPayment} className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm">
          Continue to Payment <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Recent transactions preview */}
      {txns.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recent Transactions</h3>
            <button onClick={() => setStep('txns')} className="text-xs text-primary hover:underline">View all</button>
          </div>
          {txns.slice(0, 3).map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${t.type === 'credit' ? 'bg-success/10' : 'bg-danger/10'}`}>
                  {t.type === 'credit' ? <ArrowDownRight className="w-4 h-4 text-success" /> : <ArrowUpRight className="w-4 h-4 text-danger" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t.description || t.type}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold ${t.type === 'credit' ? 'text-success' : 'text-danger'}`}>{t.type === 'credit' ? '+' : '-'}₹{t.amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ---------- Step 2: Choose Payment Method ----------
  if (step === 'method') return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => setStep('amount')} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to Amount
      </button>

      <div className="card">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">Choose Payment Method</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Adding ₹{getAmount()} to your wallet</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-xl font-bold text-primary">₹{getAmount()}</p>
          </div>
        </div>

        <div className="space-y-3">
          {methods.map(m => (
            <button key={m.id} onClick={() => setSelectedMethod(m.id)} className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedMethod === m.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center`}>
                    <m.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                  </div>
                </div>
                {selectedMethod === m.id && <CheckCircle className="w-5 h-5 text-primary" />}
              </div>
            </button>
          ))}
        </div>

        <button onClick={processPayment} disabled={!selectedMethod || paying} className={`btn-primary w-full mt-5 py-3 flex items-center justify-center gap-2 text-sm ${!selectedMethod && 'opacity-50 cursor-not-allowed'}`}>
          {paying ? <Loader className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
          {paying ? 'Processing...' : `Pay ₹${getAmount()}`}
        </button>
      </div>
    </div>
  );

  // ---------- Full Transaction History ----------
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button onClick={() => setStep('amount')} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to Wallet
      </button>
      <h1 className="text-lg font-bold text-foreground">Transaction History</h1>
      {txns.length === 0 ? (
        <div className="card text-center py-12">
          <ArrowDownRight className="w-8 h-8 text-muted mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        </div>
      ) : (
        <div className="card divide-y divide-border">
          {txns.map(t => (
            <div key={t.id} className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${t.type === 'credit' ? 'bg-success/10' : 'bg-danger/10'}`}>
                  {t.type === 'credit' ? <ArrowDownRight className="w-4 h-4 text-success" /> : <ArrowUpRight className="w-4 h-4 text-danger" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{t.description || t.type}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                </div>
              </div>
              <span className={`text-sm font-bold ${t.type === 'credit' ? 'text-success' : 'text-danger'}`}>{t.type === 'credit' ? '+' : '-'}₹{t.amount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
