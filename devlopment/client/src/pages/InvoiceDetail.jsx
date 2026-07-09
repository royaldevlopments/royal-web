import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { ArrowLeft, ShieldCheck, Loader, CreditCard, Wallet, FileDown } from 'lucide-react';

function loadScript(src) {
  return new Promise(resolve => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => { api(`/invoices/${id}`).then(setInvoice).catch(() => window.location.href = '/invoices'); }, [id]);

  const payRazorpay = async () => {
    setPaying(true);
    const ok = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
    if (!ok) { alert('Razorpay SDK failed to load'); setPaying(false); return; }
    try {
      const o = await api('/payment/create-order', { method: 'POST', body: JSON.stringify({ invoice_id: id }) });
      if (o.paid) { setPaid(true); return; }
      const rzp = new window.Razorpay({
        key: o.key, amount: o.amount, currency: o.currency, name: 'Royal Devlopments',
        description: o.receipt, image: '/logo/icon.png', order_id: o.order_id,
        prefill: { name: o.name, email: o.email, contact: o.contact },
        theme: { color: '#6366f1' },
        handler: async (r) => {
          const res = await api('/payment/verify', { method: 'POST', body: JSON.stringify({ razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature, invoice_id: id }) });
          if (res.success) setPaid(true);
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.on('payment.failed', () => setPaying(false));
      rzp.open();
    } catch (e) { alert(e.message); setPaying(false); }
  };

  const payCashfree = async () => {
    setPaying(true);
    try {
      const res = await api('/payment/create-cf-order', { method: 'POST', body: JSON.stringify({ invoice_id: id }) });
      if (res.paid) { setPaid(true); return; }
      if (res.payment_link) { window.location.href = res.payment_link; return; }
      if (res.test_mode) { await api('/payment/confirm', { method: 'POST', body: JSON.stringify({ invoice_id: id }) }); setPaid(true); }
    } catch (e) { alert(e.message); }
    setPaying(false);
  };

  const payWallet = async () => {
    setPaying(true);
    try {
      await api(`/pay/${id}`, { method: 'POST', body: JSON.stringify({ method: 'wallet' }) });
      setPaid(true);
    } catch (e) { alert(e.message); setPaying(false); }
  };

  if (!invoice) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  if (paid) return (
    <div className="max-w-lg mx-auto mt-12">
      <div className="card text-center space-y-6 py-10">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto"><ShieldCheck className="w-8 h-8 text-success" /></div>
        <h1 className="text-xl font-bold text-foreground">Payment Successful!</h1>
        <p className="text-sm text-muted-foreground">Your service will be activated shortly.</p>
        <div className="bg-secondary rounded-xl p-4 space-y-2 text-left">
          <div className="flex justify-between"><span className="text-muted-foreground text-sm">Invoice</span><span className="text-foreground font-medium text-sm">{invoice.invoice_no}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground text-sm">Amount Paid</span><span className="text-foreground font-bold">₹{invoice.amount}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground text-sm">Status</span><span className="badge badge-paid">Paid</span></div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/services')} className="btn-primary flex-1">View Services</button>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary flex-1">Dashboard</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/invoices" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices</Link>

      <div className="card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">{invoice.invoice_no}</h1>
              <span className={`badge mt-2 inline-block ${invoice.status === 'paid' ? 'badge-paid' : 'badge-unpaid'}`}>{invoice.status === 'paid' ? 'Paid' : 'Unpaid'}</span>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground">₹{invoice.amount}</p>
              <a href={`${import.meta.env.VITE_API_URL || '/devlopment/api'}/invoices/${id}/pdf`} target="_blank" className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-2 justify-end">
                <FileDown className="w-3.5 h-3.5" /> Download PDF
              </a>
            </div>
          </div>

        <div className="grid grid-cols-2 gap-6">
          <div><p className="text-xs text-muted-foreground">Service</p><p className="text-sm font-medium text-foreground mt-0.5">{invoice.service_name || '—'}</p></div>
          <div><p className="text-xs text-muted-foreground">Bill To</p><p className="text-sm font-medium text-foreground mt-0.5">{invoice.user?.name || invoice.user?.email || '—'}</p></div>
          <div><p className="text-xs text-muted-foreground">Invoice Date</p><p className="text-sm text-foreground mt-0.5">{new Date(invoice.created_at).toLocaleDateString()}</p></div>
          <div><p className="text-xs text-muted-foreground">Due Date</p><p className="text-sm text-foreground mt-0.5">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '—'}</p></div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="flex justify-between p-2 text-sm"><span className="text-muted-foreground">Service Name</span><span className="text-foreground font-medium">{invoice.service_name || '—'}</span></div>
          <div className="flex justify-between p-2 text-sm border-t border-border"><span className="font-semibold text-foreground">Total</span><span className="font-bold text-lg text-primary">₹{invoice.amount}</span></div>
        </div>
      </div>

      {invoice.status === 'unpaid' && (
        <div className="grid grid-cols-3 gap-4">
          {/* Razorpay */}
          <div className="card">
            <div className="flex items-center gap-3 pb-3 border-b border-border mb-4">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-[10px]">RZ</div>
              <div><h3 className="text-sm font-bold text-foreground">Razorpay</h3><p className="text-[10px] text-muted-foreground">UPI · Cards · Netbanking · Wallet · EMI</p></div>
            </div>
            <button onClick={payRazorpay} disabled={paying} className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/25 text-sm">
              {paying ? <Loader className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {paying ? 'Processing...' : `Pay ₹${invoice.amount}`}
            </button>
          </div>

          {/* Cashfree */}
          <div className="card">
            <div className="flex items-center gap-3 pb-3 border-b border-border mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-[10px]">CF</div>
              <div><h3 className="text-sm font-bold text-foreground">Cashfree</h3><p className="text-[10px] text-muted-foreground">Cards · UPI · Netbanking · Paylater</p></div>
            </div>
            <button onClick={payCashfree} disabled={paying} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25 text-sm">
              {paying ? <Loader className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {paying ? 'Redirecting...' : `Pay ₹${invoice.amount}`}
            </button>
          </div>

          {/* Wallet */}
          <div className="card">
            <div className="flex items-center gap-3 pb-3 border-b border-border mb-4">
              <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center text-success font-bold text-[10px]">
                <Wallet className="w-4 h-4" />
              </div>
              <div><h3 className="text-sm font-bold text-foreground">Wallet</h3><p className="text-[10px] text-muted-foreground">Pay using wallet balance</p></div>
            </div>
            <button onClick={payWallet} disabled={paying} className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-500/25 text-sm">
              {paying ? <Loader className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
              {paying ? 'Processing...' : `Pay ₹${invoice.amount}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
