import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { ShoppingCart, Check, ChevronRight, Clock, Shield, Server, HardDrive, Globe, Headphones, Package, Upload, Percent, X } from 'lucide-react';

const iconMap = { Gamepad2: Server, Server, Globe, Headphones };

export default function Order() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [selected, setSelected] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [step, setStep] = useState('browse');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [customData, setCustomData] = useState({});
  const [customFiles, setCustomFiles] = useState({});
  const [uploading, setUploading] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [applying, setApplying] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api('/categories').then(cats => { setCategories(cats); if (cats.length) setActiveCat(cats[0].id); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeCat) api(`/products?category=${activeCat}`).then(setProducts).catch(() => {});
  }, [activeCat]);

  const selectProduct = async (p) => {
    setSelected(p);
    const cfs = JSON.parse(p.custom_fields || '[]');
    const defaults = {};
    cfs.forEach(cf => { defaults[cf.key] = ''; });
    setCustomData(defaults);
    setCustomFiles({});
    setStep('configure');
  };

  const placeOrder = async () => {
    setLoading(true);
    try {
      const res = await api('/order/place', { method: 'POST', body: JSON.stringify({ product_id: selected.id, billing_cycle: billingCycle, custom_data: customData, coupon_code: coupon?.code || undefined }) });
      setResult(res);
      setStep('success');
    } catch (e) { alert(e.message); } finally { setLoading(false); }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplying(true);
    setCouponError('');
    try {
      const basePrice = selected.price * (cycles.find(c => c.key === billingCycle)?.mult || 1);
      const res = await api('/coupon/validate', { method: 'POST', body: JSON.stringify({ code: couponCode, product_id: selected.id, amount: basePrice }) });
      if (res.valid) { setCoupon(res); setCouponError(''); }
      else { setCoupon(null); setCouponError(res.error); }
    } catch { setCouponError('Failed to validate coupon'); } finally { setApplying(false); }
  };

  const removeCoupon = () => { setCoupon(null); setCouponCode(''); setCouponError(''); };

  const handleFileUpload = async (key, file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api('/upload', { method: 'POST', body: formData, headers: {} });
      setCustomFiles(p => ({ ...p, [key]: { id: res.id, name: file.name } }));
      setCustomData(p => ({ ...p, [key]: String(res.id) }));
    } catch (e) { alert('Upload failed: ' + e.message); } finally { setUploading(false); }
  };

  const cycles = [
    { key: 'monthly', label: 'Monthly', mult: 1 },
    { key: 'quarterly', label: 'Quarterly', mult: 3, badge: '-5%' },
    { key: 'semiannually', label: 'Semi-Annually', mult: 6, badge: '-10%' },
    { key: 'annually', label: 'Annually', mult: 12, badge: '-15%' },
  ];

  const getPrice = () => {
    if (!selected) return 0;
    const cycle = cycles.find(c => c.key === billingCycle);
    let total = selected.price * (cycle?.mult || 1);
    if (coupon) total = coupon.type === 'percentage' ? Math.round(total * (100 - coupon.value) / 100 * 100) / 100 : Math.max(0, total - coupon.value);
    return total;
  };

  const catIcons = { 'Game Servers': Server, 'VPS': Server, 'Web Hosting': Globe, 'Discord Bot': Headphones };

  if (step === 'browse') return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">Order Services</h1>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => {
          const CatIcon = catIcons[cat.name] || Package;
          return (
            <button key={cat.id} onClick={() => setActiveCat(cat.id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeCat === cat.id ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary-hover'}`}>
              <CatIcon className="w-4 h-4" /> {cat.name}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(p => {
          const features = JSON.parse(p.features || '[]');
          return (
            <div key={p.id} className="card hover:bg-card-hover transition-all group flex flex-col">
              {p.name.includes('Premium') || p.name.includes('Pro') || p.name.includes('Ultra') || p.name.includes('EPYC') ? (
                <div className="flex items-center justify-between mb-3"><span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">POPULAR</span></div>
              ) : <div className="mb-3" />}
              <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{p.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
              <p className="text-2xl font-bold text-foreground mt-3">₹{p.price}<span className="text-xs text-muted-foreground font-normal">/{p.billing_cycle}</span></p>
              <ul className="mt-4 space-y-2 flex-1">
                {features.slice(0, 4).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
                {features.length > 4 && <li className="text-xs text-primary">+{features.length - 4} more features</li>}
              </ul>
              <button onClick={() => selectProduct(p)} className="btn-primary w-full mt-4 text-sm flex items-center justify-center gap-2">
                <ShoppingCart className="w-3.5 h-3.5" /> Order Now
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (step === 'configure') {
    const customFields = JSON.parse(selected.custom_fields || '[]');

    return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={() => { setStep('browse'); setSelected(null); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back to Products</button>
      <h1 className="text-xl font-bold text-foreground">Configure Order</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card space-y-6">
          <h3 className="text-lg font-bold text-foreground">{selected.name}</h3>
          <p className="text-sm text-muted-foreground">{selected.description}</p>

          <div>
            <label className="text-sm font-medium text-foreground block mb-3">Billing Cycle</label>
            <div className="grid grid-cols-2 gap-3">
              {cycles.map(c => {
                const active = billingCycle === c.key;
                const price = selected.price * c.mult;
                return (
                  <button key={c.key} onClick={() => setBillingCycle(c.key)} className={`p-4 rounded-xl border-2 text-left transition-all ${active ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{c.label}</span>
                      {c.badge && <span className="text-[10px] font-semibold text-success">{c.badge}</span>}
                    </div>
                    <p className="text-lg font-bold text-foreground mt-1">₹{price}</p>
                    <p className="text-[10px] text-muted-foreground">₹{selected.price}/{c.key === 'monthly' ? 'mo' : 'mo × ' + c.mult}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {customFields.length > 0 && (
            <div className="border-t border-border pt-4">
              <label className="text-sm font-medium text-foreground block mb-3">Configuration</label>
              <div className="space-y-4">
                {customFields.map((cf) => (
                  <div key={cf.key}>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {cf.label}
                      {cf.required && <span className="text-danger ml-1">*</span>}
                    </label>
                    {cf.type === 'text' && (
                      <input type="text" value={customData[cf.key] || ''} onChange={e => setCustomData(p => ({ ...p, [cf.key]: e.target.value }))} className="input-field" placeholder={cf.placeholder || ''} required={cf.required} />
                    )}
                    {cf.type === 'number' && (
                      <input type="number" value={customData[cf.key] || ''} onChange={e => setCustomData(p => ({ ...p, [cf.key]: e.target.value }))} className="input-field" placeholder={cf.placeholder || ''} required={cf.required} />
                    )}
                    {cf.type === 'textarea' && (
                      <textarea value={customData[cf.key] || ''} onChange={e => setCustomData(p => ({ ...p, [cf.key]: e.target.value }))} className="input-field" placeholder={cf.placeholder || ''} required={cf.required} />
                    )}
                    {cf.type === 'select' && (
                      <select value={customData[cf.key] || ''} onChange={e => setCustomData(p => ({ ...p, [cf.key]: e.target.value }))} className="input-field" required={cf.required}>
                        <option value="">Select {cf.label}</option>
                        {(cf.options || '').split(',').map(o => <option key={o.trim()} value={o.trim()}>{o.trim()}</option>)}
                      </select>
                    )}
                    {cf.type === 'file' && (
                      <div>
                        <input type="file" id={`file-${cf.key}`} className="hidden" onChange={e => handleFileUpload(cf.key, e.target.files[0])} required={cf.required && !customFiles[cf.key]} />
                        <label htmlFor={`file-${cf.key}`} className="flex items-center gap-3 p-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-secondary/30">
                          <Upload className="w-5 h-5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            {customFiles[cf.key] ? (
                              <p className="text-xs text-foreground truncate">{customFiles[cf.key].name}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">{uploading ? 'Uploading...' : (cf.placeholder || 'Click to upload')}</p>
                            )}
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Features</label>
            <ul className="grid grid-cols-2 gap-2">
              {JSON.parse(selected.features || '[]').map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-success" /> {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card h-fit space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Order Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Product</span><span className="text-foreground font-medium">{selected.name}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Billing</span><span className="text-foreground font-medium">{billingCycle}</span></div>
            {coupon && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Discount ({coupon.code})</span><span className="text-success font-medium">-₹{Math.round((selected.price * (cycles.find(c => c.key === billingCycle)?.mult || 1) - getPrice()) * 100) / 100}</span></div>}
            <div className="border-t border-border pt-2 flex justify-between"><span className="text-foreground font-semibold">Total</span><span className="text-xl font-bold text-primary">₹{getPrice()}</span></div>
          </div>

          {/* Coupon */}
          <div className="border-t border-border pt-3">
            {coupon ? (
              <div className="flex items-center justify-between p-2 bg-success/10 rounded-lg">
                <span className="text-xs text-success font-medium">{coupon.code} applied</span>
                <button onClick={removeCoupon} className="p-1 hover:bg-success/20 rounded"><X className="w-3 h-3 text-success" /></button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input value={couponCode} onChange={e => setCouponCode(e.target.value)} className="input-field text-xs py-1.5 flex-1" placeholder="Coupon code" />
                <button onClick={applyCoupon} disabled={applying || !couponCode.trim()} className="btn-secondary text-xs py-1.5 px-3"><Percent className="w-3 h-3" /></button>
              </div>
            )}
            {couponError && <p className="text-[10px] text-danger mt-1">{couponError}</p>}
          </div>

          <button onClick={placeOrder} disabled={loading || uploading} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
            {loading ? 'Processing...' : <><ShoppingCart className="w-4 h-4" /> Complete Order</>}
          </button>
        </div>
      </div>
    </div>
    );
  }

  if (step === 'success') return (
    <div className="max-w-lg mx-auto mt-12">
      <div className="card text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-success" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Order Placed Successfully!</h1>
        <p className="text-sm text-muted-foreground">Your order has been placed. Please pay the invoice to activate your service.</p>
        <div className="bg-secondary rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Invoice</span><span className="text-foreground font-medium">{result?.invoice_no}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount</span><span className="text-foreground font-bold">₹{result?.amount}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><span className="badge badge-unpaid">Unpaid</span></div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate(`/invoices/${result?.invoice_id}`)} className="btn-primary flex-1 text-sm">Pay Now</button>
          <button onClick={() => navigate('/services')} className="btn-secondary flex-1 text-sm">View Services</button>
        </div>
      </div>
    </div>
  );
}
