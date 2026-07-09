import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/axios';
import { FileText } from 'lucide-react';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => { api('/invoices').then(setInvoices).catch(e => setErr(e.message)); }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">Invoices</h1>

      {err && <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">{err}</div>}

      {invoices.length === 0 && !err ? (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No invoices found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map(inv => (
            <Link key={inv.id} to={`/invoices/${inv.id}`} className="card block hover:bg-card-hover transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{inv.invoice_no}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{inv.service_name}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">₹{inv.amount}</p>
                  <span className={`badge ${inv.status === 'paid' ? 'badge-paid' : 'badge-unpaid'}`}>{inv.status}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
