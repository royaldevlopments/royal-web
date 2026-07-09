import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/axios';
import { Server } from 'lucide-react';

export default function Services() {
  const [services, setServices] = useState([]);

  useEffect(() => { api('/services').then(setServices).catch(() => {}); }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">Services</h1>

      {services.length === 0 ? (
        <div className="card text-center py-12">
          <Server className="w-12 h-12 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No services yet.</p>
          <Link to="/order" className="btn-primary mt-4 inline-flex">Order Now</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map(s => (
            <Link key={s.id} to={`/services/${s.id}`} className="card block hover:bg-card-hover transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{s.product_name || s.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">₹{s.price} / {s.billing_cycle}</p>
                </div>
                <div className="text-right">
                  <span className={`badge ${s.status === 'active' ? 'badge-active' : 'badge-pending'}`}>{s.status}</span>
                  {s.expires_at && <p className="text-[10px] text-muted-foreground mt-1">Expires: {new Date(s.expires_at).toLocaleDateString()}</p>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
