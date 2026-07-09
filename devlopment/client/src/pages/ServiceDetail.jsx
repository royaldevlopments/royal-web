import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/axios';
import { ArrowLeft, ExternalLink, Server, Copy, Check, FileText, Download } from 'lucide-react';

export default function ServiceDetail() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [copied, setCopied] = useState(null);

  useEffect(() => { api(`/services/${id}`).then(setService).catch(() => {}); }, [id]);

  const copy = (text, key) => { navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); };

  if (!service) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;

  const hasUnpaid = service.status === 'pending';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Link to="/services" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Services
      </Link>

      <h1 className="text-xl font-bold text-foreground">{service.product_name || service.name}</h1>

      {hasUnpaid && (
        <div className="p-4 bg-warning/10 border border-warning/20 rounded-xl flex items-center justify-between">
          <p className="text-sm text-warning">You have an outstanding invoice. Click here to view and pay.</p>
          {service.invoices?.[0] && (
            <Link to={`/invoices/${service.invoices[0].id}`} className="btn-secondary text-xs flex items-center gap-1.5">
              View Invoice <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 card space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Product Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              ['Name', service.product_name || service.name],
              ['Price', `₹${service.price}`],
              ['Billing Cycle', service.billing_cycle || 'Every month'],
              ['Expires At', service.expires_at || 'N/A'],
              ['Status', service.status],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Overview */}
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Overview</h3>
          {[
            ['Amount', `₹${service.price}`],
            ['Billing', service.billing_cycle || 'Every month'],
            ['Expires', service.expires_at || 'N/A'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
            </div>
          ))}
          {hasUnpaid && (
            <div className="p-3 bg-danger/10 rounded-lg">
              <p className="text-xs text-danger font-medium">Payment required</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Unpaid invoice exists</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4" />

      {/* Custom Data */}
      {service.custom_data && service.product_custom_fields && (() => {
        const cfs = JSON.parse(service.product_custom_fields || '[]');
        const cd = typeof service.custom_data === 'string' ? JSON.parse(service.custom_data) : service.custom_data;
        const uploads = service.uploads || [];
        if (cfs.length === 0) return null;
        return (
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Configuration</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cfs.map(cf => {
                const val = cd[cf.key];
                if (!val) return null;
                const isFile = cf.type === 'file';
                const fileRecord = isFile ? uploads.find(u => String(u.id) === String(val)) : null;
                return (
                  <div key={cf.key} className="p-3 bg-secondary/50 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{cf.label}</p>
                    {fileRecord ? (
                      <a href={`/uploads/${fileRecord.filename}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline mt-0.5 flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5" /> {fileRecord.original_name}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-foreground mt-0.5">{val}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Delivery Info */}
      {service.delivery && service.product_delivery_fields && (() => {
        const d = typeof service.delivery === 'string' ? JSON.parse(service.delivery) : service.delivery;
        const dfs = JSON.parse(service.product_delivery_fields || '[]');
        const uploads = service.uploads || [];
        if (dfs.length === 0) return null;
        return (
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-success" />
              <h3 className="text-sm font-semibold text-foreground">Server Access</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dfs.map(df => {
                const val = d[df.key];
                if (!val) return null;
                const isFile = df.type === 'file';
                const fileRecord = isFile ? uploads.find(u => String(u.id) === String(val)) : null;
                if (fileRecord) {
                  return (
                    <div key={df.key} className="p-3 bg-secondary/50 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{df.label}</p>
                      <a href={`/uploads/${fileRecord.filename}`} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline mt-0.5 flex items-center gap-1.5">
                        <Download className="w-3.5 h-3.5" /> {fileRecord.original_name}
                      </a>
                    </div>
                  );
                }
                return (
                  <div key={df.key} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{df.label}</p>
                      <p className="text-sm font-mono text-foreground mt-0.5">{val}</p>
                    </div>
                    <button onClick={() => copy(val, df.key)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                      {copied === df.key ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Invoices for this service */}
      {service.invoices?.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Invoices</h3>
          <div className="space-y-2">
            {service.invoices.map(inv => (
              <Link key={inv.id} to={`/invoices/${inv.id}`} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors">
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.invoice_no}</p>
                  <p className="text-[11px] text-muted-foreground">Invoice Date: {new Date(inv.created_at).toLocaleDateString()}</p>
                  <p className="text-[11px] text-muted-foreground">{service.product_name || service.name} ({new Date(inv.created_at).toLocaleDateString()} - ...)</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">₹{inv.amount}</p>
                  <span className={`badge ${inv.status === 'paid' ? 'badge-paid' : 'badge-unpaid'}`}>{inv.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
