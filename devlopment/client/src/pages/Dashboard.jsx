import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/axios';
import { Server, FileText, Ticket, ShoppingCart, ExternalLink, Globe } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [whmcsUrl, setWhmcsUrl] = useState(null);
  const [loadingSso, setLoadingSso] = useState(false);

  useEffect(() => { api('/dashboard').then(setData).catch(() => {}); }, []);

  const goToWhmcs = async () => {
    setLoadingSso(true);
    try {
      const res = await api('/whmcs/sso');
      if (res.url) window.open(res.url, '_blank');
      else alert(res.error || 'WHMCS not configured');
    } catch (e) { alert(e.message); }
    setLoadingSso(false);
  };

  if (!data) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  const cards = [
    { icon: Server, label: 'Active Services', count: data.stats.activeServices, color: 'text-primary', bg: 'bg-primary/10', link: '/services' },
    { icon: FileText, label: 'Unpaid Invoices', count: data.stats.unpaidInvoices, color: 'text-danger', bg: 'bg-danger/10', link: '/invoices' },
    { icon: Ticket, label: 'Open Tickets', count: data.stats.openTickets, color: 'text-warning', bg: 'bg-warning/10', link: '/tickets' },
    { icon: ShoppingCart, label: 'Total Orders', count: data.stats.totalOrders, color: 'text-success', bg: 'bg-success/10', link: '/services' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">Dashboard</h1>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(card => (
          <Link key={card.label} to={card.link} className="card hover:bg-card-hover transition-all duration-200 group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.count}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
          </Link>
        ))}
        {data.whmcs_client_id && (
          <button onClick={goToWhmcs} disabled={loadingSso} className="card text-left hover:bg-card-hover transition-all duration-200 group cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                <Globe className="w-5 h-5 text-green-500" />
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-2xl font-bold text-foreground">WHMCS</p>
            <p className="text-xs text-muted-foreground mt-1">{loadingSso ? 'Connecting...' : 'Go to Client Area'}</p>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Services */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Active Services</h3>
            <Link to="/services" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {data.recentServices.length === 0 ? (
            <div className="text-center py-8">
              <Server className="w-8 h-8 text-muted mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No active services yet.</p>
            </div>
          ) : data.recentServices.map(s => (
            <Link key={s.id} to={`/services/${s.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors">
              <div>
                <p className="text-sm font-medium text-foreground">{s.product_name || s.name}</p>
                <p className="text-[11px] text-muted-foreground">₹{s.price}/mo</p>
              </div>
              <span className={`badge ${s.status === 'active' ? 'badge-active' : 'badge-pending'}`}>{s.status}</span>
            </Link>
          ))}
        </div>

        {/* Recent Invoices */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recent Invoices</h3>
            <Link to="/invoices" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {data.recentInvoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-muted mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No invoices yet.</p>
            </div>
          ) : data.recentInvoices.map(inv => (
            <Link key={inv.id} to={`/invoices/${inv.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors">
              <div>
                <p className="text-sm font-medium text-foreground">{inv.invoice_no}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">₹{inv.amount}</p>
                <span className={`badge ${inv.status === 'paid' ? 'badge-paid' : 'badge-unpaid'}`}>{inv.status}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Support Tickets */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Support Tickets</h3>
            <Link to="/tickets" className="text-xs text-primary hover:underline">New ticket</Link>
          </div>
          {data.recentTickets.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="w-8 h-8 text-muted mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No tickets yet.</p>
            </div>
          ) : data.recentTickets.map(t => (
            <Link key={t.id} to={`/tickets/${t.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors">
              <div className="truncate flex-1">
                <p className="text-sm font-medium text-foreground truncate">Ticket #{t.id.slice(0, 6)} - {t.subject}</p>
                <p className="text-[11px] text-muted-foreground">{t.department}</p>
              </div>
              <span className={`badge ${t.status === 'open' ? 'badge-open' : t.status === 'closed' ? 'badge-closed' : 'badge-pending'}`}>{t.status}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
