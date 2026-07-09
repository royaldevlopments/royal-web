import { useState, useEffect } from 'react';
import { api } from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { Users, Server, FileText, Ticket, DollarSign, TrendingUp, Package, Plus, X, Settings as SettingsIcon, Eye, EyeOff, CheckCircle, Layers, Trash2, Edit3, Upload, TicketCheck, Percent, History, Ban, Mail, Shield, Globe, Layout, ArrowLeft, Send, Paperclip } from 'lucide-react';

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [showProduct, setShowProduct] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', description: '', price: '', category_id: '', billing_cycle: 'monthly', features: '' });
  const [categories, setCategories] = useState([]);
  const [adminProducts, setAdminProducts] = useState([]);
  const [showCategory, setShowCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [settings, setSettings] = useState({ rz_key_id: '', rz_key_secret: '', rz_test_mode: 'true', cf_client_id: '', cf_client_secret: '', cf_test_mode: 'true', whmcs_url: '', whmcs_identifier: '', whmcs_secret: '', turnstile_key: '', turnstile_secret: '', smtp_url: '', smtp_from: '', tax_rate: '', tax_name: 'GST', site_url: '', maintenance_mode: 'false', currency: 'INR', google_client_id: '', google_client_secret: '', discord_client_id: '', discord_client_secret: '' });
  const [showSecret, setShowSecret] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deliverModal, setDeliverModal] = useState(null);
  const [deliverForm, setDeliverForm] = useState({});
  const [deliverFiles, setDeliverFiles] = useState({});
  const [deliverFields, setDeliverFields] = useState([]);
  const [editProduct, setEditProduct] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [deliveryFields, setDeliveryFields] = useState([]);

  useEffect(() => {
    api('/admin/stats').then(setStats).catch(() => {});
    api('/admin/users').then(setUsers).catch(() => {});
    api('/admin/services').then(setServices).catch(() => {});
    api('/admin/invoices').then(setInvoices).catch(() => {});
    api('/admin/tickets').then(setTickets).catch(() => {});
    api('/admin/settings').then(s => {
      setSettings({ rz_key_id: s.rz_key_id || '', rz_key_secret: s.rz_key_secret || '', rz_test_mode: s.rz_test_mode || 'true', cf_client_id: s.cf_client_id || '', cf_client_secret: s.cf_client_secret || '', cf_test_mode: s.cf_test_mode || 'true', whmcs_url: s.whmcs_url || '', whmcs_identifier: s.whmcs_identifier || '', whmcs_secret: s.whmcs_secret || '', turnstile_key: s.turnstile_key || '', turnstile_secret: s.turnstile_secret || '', smtp_url: s.smtp_url || '', smtp_from: s.smtp_from || '', tax_rate: s.tax_rate || '', tax_name: s.tax_name || 'GST', site_url: s.site_url || '', maintenance_mode: s.maintenance_mode || 'false', currency: s.currency || 'INR', google_client_id: s.google_client_id || '', google_client_secret: s.google_client_secret || '', discord_client_id: s.discord_client_id || '', discord_client_secret: s.discord_client_secret || '' });
    }).catch(() => {});
    loadCategories();
    loadProducts();
  }, []);

  const loadCategories = () => api('/admin/categories').then(setCategories).catch(() => {});
  const loadProducts = () => api('/admin/products').then(setAdminProducts).catch(() => {});

  if (user?.role !== 'admin') return <div className="card text-center py-12"><p className="text-sm text-muted-foreground">Admin access required.</p></div>;

  const updateServiceStatus = async (serviceId, status) => {
    try {
      await api('/admin/services/status', { method: 'POST', body: JSON.stringify({ service_id: serviceId, status }) });
      api('/admin/services').then(setServices);
    } catch (e) { alert(e.message); }
  };

  const openDeliver = (service) => {
    const product = adminProducts.find(p => p.id === service.product_id);
    const fields = JSON.parse(product?.delivery_fields || '[]');
    setDeliverFields(fields);
    const defaults = {};
    fields.forEach(f => { defaults[f.key] = ''; });
    setDeliverForm(defaults);
    setDeliverFiles({});
    setDeliverModal(service);
  };

  const deliverService = async (e) => {
    e.preventDefault();
    try {
      await api('/admin/services/deliver', { method: 'POST', body: JSON.stringify({ service_id: deliverModal.id, delivery: deliverForm }) });
      setDeliverModal(null);
      api('/admin/services').then(setServices);
    } catch (e) { alert(e.message); }
  };

  const handleDeliverFileUpload = async (key, file) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api('/upload', { method: 'POST', body: formData, headers: {} });
      setDeliverFiles(p => ({ ...p, [key]: { id: res.id, name: file.name } }));
      setDeliverForm(p => ({ ...p, [key]: res.id }));
    } catch (e) { alert('Upload failed: ' + e.message); }
  };

  const createProduct = async (e) => {
    e.preventDefault();
    try {
      await api('/admin/products', { method: 'POST', body: JSON.stringify({ ...productForm, custom_fields: customFields, delivery_fields: deliveryFields }) });
      setShowProduct(false);
      setEditProduct(null);
      setProductForm({ name: '', description: '', price: '', category_id: '', billing_cycle: 'monthly', features: '' });
      setCustomFields([]);
      setDeliveryFields([]);
      loadProducts();
    } catch (e) { alert(e.message); }
  };

  const editProductSubmit = async (e) => {
    e.preventDefault();
    try {
      await api(`/admin/products/${editProduct.id}`, { method: 'PUT', body: JSON.stringify({ ...productForm, custom_fields: customFields, delivery_fields: deliveryFields }) });
      setShowProduct(false);
      setEditProduct(null);
      setProductForm({ name: '', description: '', price: '', category_id: '', billing_cycle: 'monthly', features: '' });
      setCustomFields([]);
      setDeliveryFields([]);
      loadProducts();
    } catch (e) { alert(e.message); }
  };

  const openEditProduct = (p) => {
    setEditProduct(p);
    setProductForm({ name: p.name, description: p.description || '', price: String(p.price), category_id: p.category_id || '', billing_cycle: p.billing_cycle || 'monthly', features: p.features || '' });
    setCustomFields(JSON.parse(p.custom_fields || '[]'));
    setDeliveryFields(JSON.parse(p.delivery_fields || '[]'));
    setShowProduct(true);
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { key: '', label: '', type: 'text', placeholder: '', required: false, options: '' }]);
  };

  const updateCustomField = (i, field, value) => {
    const updated = [...customFields];
    updated[i] = { ...updated[i], [field]: value };
    setCustomFields(updated);
  };

  const removeCustomField = (i) => {
    setCustomFields(customFields.filter((_, idx) => idx !== i));
  };

  const addDeliveryField = () => {
    setDeliveryFields([...deliveryFields, { key: '', label: '', type: 'text', placeholder: '', required: false, options: '' }]);
  };

  const updateDeliveryField = (i, field, value) => {
    const updated = [...deliveryFields];
    updated[i] = { ...updated[i], [field]: value };
    setDeliveryFields(updated);
  };

  const removeDeliveryField = (i) => {
    setDeliveryFields(deliveryFields.filter((_, idx) => idx !== i));
  };

  const deleteProduct = async (id) => {
    try { await api(`/admin/products/${id}`, { method: 'DELETE' }); loadProducts(); } catch (e) { alert(e.message); }
  };

  const createCategory = async (e) => {
    e.preventDefault();
    try {
      await api('/admin/categories', { method: 'POST', body: JSON.stringify(categoryForm) });
      setShowCategory(false);
      setCategoryForm({ name: '', description: '' });
      loadCategories();
    } catch (e) { alert(e.message); }
  };

  const deleteCategory = async (id) => {
    try { await api(`/admin/categories/${id}`, { method: 'DELETE' }); loadCategories(); loadProducts(); } catch (e) { alert(e.message); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const list = ['rz_key_id','rz_key_secret','rz_test_mode','cf_client_id','cf_client_secret','cf_test_mode','whmcs_url','whmcs_identifier','whmcs_secret','turnstile_key','turnstile_secret','smtp_url','smtp_from','tax_rate','tax_name','site_url','maintenance_mode','currency','google_client_id','google_client_secret','discord_client_id','discord_client_secret'];
      for (const key of list) {
        await api('/admin/settings', { method: 'POST', body: JSON.stringify({ key, value: settings[key] }) });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'services', label: 'Services', icon: Server },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'tickets', label: 'Tickets', icon: Ticket },
    { id: 'coupons', label: 'Coupons', icon: Percent },
    { id: 'cancellations', label: 'Cancellations', icon: Ban },
    { id: 'announcements', label: 'Announcements', icon: TicketCheck },
    { id: 'activity', label: 'Activity', icon: History },
    { id: 'categories', label: 'Categories', icon: Layers },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    { id: 'email_templates', label: 'Email Templates', icon: Mail },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>

      <div className="flex gap-1 bg-secondary rounded-lg p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card"><Users className="w-5 h-5 text-primary mb-2" /><p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p><p className="text-xs text-muted-foreground">Total Users</p></div>
          <div className="card"><DollarSign className="w-5 h-5 text-success mb-2" /><p className="text-2xl font-bold text-foreground">₹{stats.totalRevenue}</p><p className="text-xs text-muted-foreground">Revenue</p></div>
          <div className="card"><Server className="w-5 h-5 text-warning mb-2" /><p className="text-2xl font-bold text-foreground">{stats.pendingServices}</p><p className="text-xs text-muted-foreground">Pending Services</p></div>
          <div className="card"><Ticket className="w-5 h-5 text-danger mb-2" /><p className="text-2xl font-bold text-foreground">{stats.openTickets}</p><p className="text-xs text-muted-foreground">Open Tickets</p></div>
        </div>
      )}

      {tab === 'users' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left p-3">Name</th><th className="text-left p-3">Email</th><th className="text-left p-3">Role</th><th className="text-right p-3">Balance</th><th className="text-right p-3">Joined</th></tr></thead>
            <tbody>{users.map(u => <tr key={u.id} className="border-b border-border last:border-0 hover:bg-secondary/30"><td className="p-3 text-foreground">{u.name || '—'}</td><td className="p-3 text-muted-foreground">{u.email}</td><td className="p-3"><span className="badge badge-active capitalize">{u.role}</span></td><td className="p-3 text-right text-foreground">₹{u.balance}</td><td className="p-3 text-right text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td></tr>)}</tbody>
          </table>
        </div>
      )}

      {tab === 'services' && (
        <div className="space-y-4">
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left p-3">User</th><th className="text-left p-3">Product</th><th className="text-left p-3">Status</th><th className="text-right p-3">Price</th><th className="text-right p-3">Actions</th></tr></thead>
              <tbody>{services.map(s => <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/30"><td className="p-3 text-foreground">{s.user_name}</td><td className="p-3 text-muted-foreground">{s.product_name}</td><td className="p-3"><span className={`badge ${s.status === 'active' ? 'badge-active' : s.status === 'suspended' ? 'badge-suspended' : 'badge-pending'}`}>{s.status}</span></td><td className="p-3 text-right text-foreground">₹{s.price}</td><td className="p-3 text-right flex items-center justify-end gap-2">
                <select value={s.status} onChange={e => updateServiceStatus(s.id, e.target.value)} className="text-xs bg-secondary border border-border rounded-lg p-1 text-foreground">
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button onClick={() => openDeliver(s)} className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-2 py-1 rounded-lg transition-colors whitespace-nowrap">Deliver</button>
              </td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deliver Modal */}
      {deliverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeliverModal(null)}>
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-foreground">Deliver Service</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{deliverModal.product_name || deliverModal.name} — {deliverModal.user_name}</p>
              </div>
              <button onClick={() => setDeliverModal(null)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            {deliverFields.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No delivery fields defined. Add them in the product editor first.</p>
            ) : (
              <form onSubmit={deliverService} className="space-y-4">
                {deliverFields.map((df) => (
                  <div key={df.key}>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {df.label}
                      {df.required && <span className="text-danger ml-1">*</span>}
                    </label>
                    {df.type === 'text' && (
                      <input type="text" value={deliverForm[df.key] || ''} onChange={e => setDeliverForm(p => ({ ...p, [df.key]: e.target.value }))} className="input-field" placeholder={df.placeholder || ''} required={df.required} />
                    )}
                    {df.type === 'number' && (
                      <input type="number" value={deliverForm[df.key] || ''} onChange={e => setDeliverForm(p => ({ ...p, [df.key]: e.target.value }))} className="input-field" placeholder={df.placeholder || ''} required={df.required} />
                    )}
                    {df.type === 'textarea' && (
                      <textarea value={deliverForm[df.key] || ''} onChange={e => setDeliverForm(p => ({ ...p, [df.key]: e.target.value }))} className="input-field" placeholder={df.placeholder || ''} required={df.required} />
                    )}
                    {df.type === 'select' && (
                      <select value={deliverForm[df.key] || ''} onChange={e => setDeliverForm(p => ({ ...p, [df.key]: e.target.value }))} className="input-field" required={df.required}>
                        <option value="">Select {df.label}</option>
                        {(df.options || '').split(',').map(o => <option key={o.trim()} value={o.trim()}>{o.trim()}</option>)}
                      </select>
                    )}
                    {df.type === 'file' && (
                      <div>
                        <input type="file" id={`deliver-file-${df.key}`} className="hidden" onChange={e => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('file', file);
                          api('/upload', { method: 'POST', body: formData, headers: {} }).then(res => {
                            setDeliverFiles(p => ({ ...p, [df.key]: { id: res.id, name: file.name } }));
                            setDeliverForm(p => ({ ...p, [df.key]: res.id }));
                          }).catch(e => alert('Upload failed: ' + e.message));
                        }} />
                        <label htmlFor={`deliver-file-${df.key}`} className="flex items-center gap-3 p-3 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-secondary/30">
                          <Upload className="w-5 h-5 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            {deliverFiles[df.key] ? (
                              <p className="text-xs text-foreground truncate">{deliverFiles[df.key].name}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">{df.placeholder || 'Click to upload file'}</p>
                            )}
                          </div>
                        </label>
                      </div>
                    )}
                  </div>
                ))}
                <button type="submit" className="btn-primary w-full text-sm flex items-center justify-center gap-2">
                  <Server className="w-4 h-4" /> Deliver & Activate
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {tab === 'invoices' && <AdminInvoicesTab api={api} invoices={invoices} setInvoices={setInvoices} />}

      {tab === 'tickets' && <AdminTicketsTab api={api} tickets={tickets} setTickets={setTickets} />}

      {tab === 'coupons' && <CouponsTab api={api} />}
      {tab === 'cancellations' && <CancellationsTab api={api} />}
      {tab === 'announcements' && <AnnouncementsTab api={api} />}
      {tab === 'activity' && <ActivityTab api={api} />}

      {tab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">All Categories</h3>
            <button onClick={() => setShowCategory(p => !p)} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Category</button>
          </div>
          {showCategory && (
            <form onSubmit={createCategory} className="card space-y-4">
              <h3 className="text-sm font-semibold text-foreground">New Category</h3>
              <div><label className="text-xs text-muted-foreground mb-1 block">Name</label><input value={categoryForm.name} onChange={e => setCategoryForm(p => ({ ...p, name: e.target.value }))} className="input-field" required /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Description</label><input value={categoryForm.description} onChange={e => setCategoryForm(p => ({ ...p, description: e.target.value }))} className="input-field" /></div>
              <button type="submit" className="btn-primary text-sm">Create</button>
            </form>
          )}
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left p-3">Name</th><th className="text-left p-3">Description</th><th className="text-right p-3">Actions</th></tr></thead>
              <tbody>{categories.map(c => <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/30"><td className="p-3 text-foreground font-medium">{c.name}</td><td className="p-3 text-muted-foreground">{c.description}</td><td className="p-3 text-right"><button onClick={() => deleteCategory(c.id)} className="p-1.5 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger transition-colors"><Trash2 className="w-4 h-4" /></button></td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">All Products</h3>
            <button onClick={() => { setShowProduct(p => !p); setEditProduct(null); setCustomFields([]); setProductForm({ name: '', description: '', price: '', category_id: '', billing_cycle: 'monthly', features: '' }); }} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Product</button>
          </div>
          {showProduct && (
            <form onSubmit={editProduct ? editProductSubmit : createProduct} className="card space-y-4">
              <h3 className="text-sm font-semibold text-foreground">{editProduct ? 'Edit Product' : 'New Product'}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground mb-1 block">Name</label><input value={productForm.name} onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))} className="input-field" required /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Price (₹)</label><input type="number" value={productForm.price} onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))} className="input-field" required /></div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Description</label><textarea value={productForm.description} onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))} className="input-field" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-muted-foreground mb-1 block">Category</label><select value={productForm.category_id} onChange={e => setProductForm(p => ({ ...p, category_id: e.target.value }))} className="input-field" required><option value="">Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Billing Cycle</label><select value={productForm.billing_cycle} onChange={e => setProductForm(p => ({ ...p, billing_cycle: e.target.value }))} className="input-field"><option>monthly</option><option>quarterly</option><option>yearly</option></select></div>
              </div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Features (JSON array)</label><input value={productForm.features} onChange={e => setProductForm(p => ({ ...p, features: e.target.value }))} className="input-field" placeholder='["Feature 1", "Feature 2"]' /></div>

              {/* Custom Fields */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-foreground">Custom Fields</label>
                  <button type="button" onClick={addCustomField} className="btn-secondary text-xs flex items-center gap-1 py-1 px-3"><Plus className="w-3 h-3" /> Add Field</button>
                </div>
                {customFields.length === 0 && <p className="text-xs text-muted-foreground">No custom fields. Add fields like Domain, RAM, OS, etc.</p>}
                {customFields.map((cf, i) => (
                  <div key={i} className="p-4 bg-secondary/30 rounded-xl mb-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Field #{i + 1}</span>
                      <button type="button" onClick={() => removeCustomField(i)} className="p-1 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="text-[10px] text-muted-foreground mb-1 block">Key</label><input value={cf.key} onChange={e => updateCustomField(i, 'key', e.target.value)} className="input-field text-xs py-1.5 px-2" placeholder="domain_name" /></div>
                      <div><label className="text-[10px] text-muted-foreground mb-1 block">Label</label><input value={cf.label} onChange={e => updateCustomField(i, 'label', e.target.value)} className="input-field text-xs py-1.5 px-2" placeholder="Domain Name" /></div>
                      <div><label className="text-[10px] text-muted-foreground mb-1 block">Type</label><select value={cf.type} onChange={e => updateCustomField(i, 'type', e.target.value)} className="input-field text-xs py-1.5 px-2"><option>text</option><option>textarea</option><option>number</option><option>select</option><option>file</option></select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-[10px] text-muted-foreground mb-1 block">Placeholder</label><input value={cf.placeholder || ''} onChange={e => updateCustomField(i, 'placeholder', e.target.value)} className="input-field text-xs py-1.5 px-2" placeholder="Optional" /></div>
                      <div className="flex items-end gap-3">
                        <label className="flex items-center gap-2 pb-1.5">
                          <input type="checkbox" checked={cf.required || false} onChange={e => updateCustomField(i, 'required', e.target.checked)} className="w-4 h-4 rounded accent-primary" />
                          <span className="text-xs text-muted-foreground">Required</span>
                        </label>
                      </div>
                    </div>
                    {cf.type === 'select' && (
                      <div><label className="text-[10px] text-muted-foreground mb-1 block">Options (comma-separated)</label><input value={cf.options || ''} onChange={e => updateCustomField(i, 'options', e.target.value)} className="input-field text-xs py-1.5 px-2" placeholder="Option 1, Option 2, Option 3" /></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Delivery Fields */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-semibold text-foreground">Delivery Fields</label>
                  <button type="button" onClick={addDeliveryField} className="btn-secondary text-xs flex items-center gap-1 py-1 px-3"><Plus className="w-3 h-3" /> Add Field</button>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">Admin fills these when delivering the service (IP, port, files, etc.)</p>
                {deliveryFields.length === 0 && <p className="text-xs text-muted-foreground">No delivery fields. Add fields like IP Address, Port, Username, File, etc.</p>}
                {deliveryFields.map((df, i) => (
                  <div key={i} className="p-4 bg-secondary/30 rounded-xl mb-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Delivery Field #{i + 1}</span>
                      <button type="button" onClick={() => removeDeliveryField(i)} className="p-1 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><label className="text-[10px] text-muted-foreground mb-1 block">Key</label><input value={df.key} onChange={e => updateDeliveryField(i, 'key', e.target.value)} className="input-field text-xs py-1.5 px-2" placeholder="ip_address" /></div>
                      <div><label className="text-[10px] text-muted-foreground mb-1 block">Label</label><input value={df.label} onChange={e => updateDeliveryField(i, 'label', e.target.value)} className="input-field text-xs py-1.5 px-2" placeholder="IP Address" /></div>
                      <div><label className="text-[10px] text-muted-foreground mb-1 block">Type</label><select value={df.type} onChange={e => updateDeliveryField(i, 'type', e.target.value)} className="input-field text-xs py-1.5 px-2"><option>text</option><option>textarea</option><option>number</option><option>select</option><option>file</option></select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-[10px] text-muted-foreground mb-1 block">Placeholder</label><input value={df.placeholder || ''} onChange={e => updateDeliveryField(i, 'placeholder', e.target.value)} className="input-field text-xs py-1.5 px-2" placeholder="Optional" /></div>
                      <div className="flex items-end gap-3">
                        <label className="flex items-center gap-2 pb-1.5">
                          <input type="checkbox" checked={df.required || false} onChange={e => updateDeliveryField(i, 'required', e.target.checked)} className="w-4 h-4 rounded accent-primary" />
                          <span className="text-xs text-muted-foreground">Required</span>
                        </label>
                      </div>
                    </div>
                    {df.type === 'select' && (
                      <div><label className="text-[10px] text-muted-foreground mb-1 block">Options (comma-separated)</label><input value={df.options || ''} onChange={e => updateDeliveryField(i, 'options', e.target.value)} className="input-field text-xs py-1.5 px-2" placeholder="Option 1, Option 2, Option 3" /></div>
                    )}
                  </div>
                ))}
              </div>

              <button type="submit" className="btn-primary text-sm">{editProduct ? 'Update Product' : 'Create Product'}</button>
            </form>
          )}
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left p-3">Name</th><th className="text-left p-3">Category</th><th className="text-right p-3">Price</th><th className="text-left p-3">Cycle</th><th className="text-left p-3">Order Fields</th><th className="text-left p-3">Deliver Fields</th><th className="text-right p-3">Actions</th></tr></thead>
              <tbody>{adminProducts.map(p => {
                const cfs = JSON.parse(p.custom_fields || '[]');
                const dfs = JSON.parse(p.delivery_fields || '[]');
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="p-3 text-foreground font-medium">{p.name}</td>
                    <td className="p-3 text-muted-foreground">{p.category_name || '—'}</td>
                    <td className="p-3 text-right text-foreground">₹{p.price}</td>
                    <td className="p-3 text-muted-foreground">{p.billing_cycle}</td>
                    <td className="p-3"><span className="text-xs text-muted-foreground">{cfs.length > 0 ? `${cfs.length} fields` : '—'}</span></td>
                    <td className="p-3"><span className="text-xs text-muted-foreground">{dfs.length > 0 ? `${dfs.length} fields` : '—'}</span></td>
                    <td className="p-3 text-right flex items-center justify-end gap-1">
                      <button onClick={() => openEditProduct(p)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => deleteProduct(p.id)} className="p-1.5 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'settings' && <SettingsTab api={api} settings={settings} setSettings={setSettings} showSecret={showSecret} setShowSecret={setShowSecret} saving={saving} saved={saved} saveSettings={saveSettings} />}
      {tab === 'email_templates' && <EmailTemplatesTab api={api} />}
    </div>
  );
}

// ====== Coupons Tab ======
function CouponsTab({ api }) {
  const [coupons, setCoupons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', type: 'percentage', value: '', min_amount: '0', max_uses: '0', product_ids: '', expires_at: '' });
  useEffect(() => { api('/admin/coupons').then(setCoupons).catch(() => {}); }, []);
  const create = async (e) => {
    e.preventDefault();
    try {
      await api('/admin/coupons', { method: 'POST', body: JSON.stringify({ ...form, value: parseFloat(form.value), min_amount: parseFloat(form.min_amount), max_uses: parseInt(form.max_uses), product_ids: form.product_ids ? form.product_ids.split(',').map(s => s.trim()) : [] }) });
      setShowForm(false);
      setForm({ code: '', type: 'percentage', value: '', min_amount: '0', max_uses: '0', product_ids: '', expires_at: '' });
      api('/admin/coupons').then(setCoupons);
    } catch (e) { alert(e.message); }
  };
  const remove = async (id) => { try { await api(`/admin/coupons/${id}`, { method: 'DELETE' }); api('/admin/coupons').then(setCoupons); } catch (e) { alert(e.message); } };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground">Coupons</h3><button onClick={() => setShowForm(p => !p)} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add Coupon</button></div>
      {showForm && (
        <form onSubmit={create} className="card space-y-3">
          <h3 className="text-sm font-semibold text-foreground">New Coupon</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Code</label><input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} className="input-field" placeholder="SAVE20" required /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Type</label><select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="input-field"><option value="percentage">Percentage</option><option value="fixed">Fixed (₹)</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Value</label><input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} className="input-field" placeholder="20" required /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Min Amount (₹)</label><input type="number" value={form.min_amount} onChange={e => setForm(p => ({ ...p, min_amount: e.target.value }))} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground mb-1 block">Max Uses (0 = unlimited)</label><input type="number" value={form.max_uses} onChange={e => setForm(p => ({ ...p, max_uses: e.target.value }))} className="input-field" /></div>
            <div><label className="text-xs text-muted-foreground mb-1 block">Expires At</label><input type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} className="input-field" /></div>
          </div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Apply to Product IDs (comma-separated, leave empty for all)</label><input value={form.product_ids} onChange={e => setForm(p => ({ ...p, product_ids: e.target.value }))} className="input-field" placeholder="Leave empty for all products" /></div>
          <button type="submit" className="btn-primary text-sm">Create Coupon</button>
        </form>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left p-3">Code</th><th className="text-left p-3">Type</th><th className="text-right p-3">Value</th><th className="text-right p-3">Uses</th><th className="text-left p-3">Expires</th><th className="text-left p-3">Status</th><th className="text-right p-3">Actions</th></tr></thead>
          <tbody>{coupons.map(c => <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/30"><td className="p-3 font-mono text-foreground font-medium">{c.code}</td><td className="p-3 text-muted-foreground capitalize">{c.type}</td><td className="p-3 text-right text-foreground">{c.type === 'percentage' ? `${c.value}%` : `₹${c.value}`}</td><td className="p-3 text-right text-muted-foreground">{c.used_count}/{c.max_uses || '∞'}</td><td className="p-3 text-muted-foreground">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}</td><td className="p-3"><span className={`badge ${c.status === 'active' ? 'badge-active' : 'badge-suspended'}`}>{c.status}</span></td><td className="p-3 text-right"><button onClick={() => remove(c.id)} className="p-1.5 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger"><Trash2 className="w-4 h-4" /></button></td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

// ====== Cancellations Tab ======
function CancellationsTab({ api }) {
  const [list, setList] = useState([]);
  useEffect(() => { api('/admin/cancellations').then(setList).catch(() => {}); }, []);
  const handle = async (id, status) => {
    try { await api(`/admin/cancellations/${id}`, { method: 'POST', body: JSON.stringify({ status }) }); api('/admin/cancellations').then(setList); } catch (e) { alert(e.message); }
  };
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left p-3">User</th><th className="text-left p-3">Service</th><th className="text-left p-3">Reason</th><th className="text-left p-3">Type</th><th className="text-left p-3">Status</th><th className="text-right p-3">Date</th><th className="text-right p-3">Actions</th></tr></thead>
        <tbody>{list.map(c => <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/30"><td className="p-3 text-foreground">{c.user_name}</td><td className="p-3 text-muted-foreground">{c.service_name}</td><td className="p-3 text-muted-foreground max-w-[200px] truncate">{c.reason || '—'}</td><td className="p-3 capitalize text-muted-foreground">{c.type}</td><td className="p-3"><span className={`badge ${c.status === 'pending' ? 'badge-pending' : c.status === 'approved' ? 'badge-active' : 'badge-suspended'}`}>{c.status}</span></td><td className="p-3 text-right text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td><td className="p-3 text-right">{c.status === 'pending' && <div className="flex gap-1 justify-end"><button onClick={() => handle(c.id, 'approved')} className="text-xs bg-success/10 text-success px-2 py-1 rounded-lg hover:bg-success/20">Approve</button><button onClick={() => handle(c.id, 'denied')} className="text-xs bg-danger/10 text-danger px-2 py-1 rounded-lg hover:bg-danger/20">Deny</button></div>}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

// ====== Announcements Tab ======
function AnnouncementsTab({ api }) {
  const [list, setList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', status: 'published' });
  useEffect(() => { api('/admin/announcements').then(setList).catch(() => {}); }, []);
  const create = async (e) => {
    e.preventDefault();
    try { await api('/admin/announcements', { method: 'POST', body: JSON.stringify(form) }); setShowForm(false); setForm({ title: '', content: '', status: 'published' }); api('/admin/announcements').then(setList); } catch (e) { alert(e.message); }
  };
  const remove = async (id) => { try { await api(`/admin/announcements/${id}`, { method: 'DELETE' }); api('/admin/announcements').then(setList); } catch (e) { alert(e.message); } };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h3 className="text-sm font-semibold text-foreground">Announcements</h3><button onClick={() => setShowForm(p => !p)} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add</button></div>
      {showForm && (
        <form onSubmit={create} className="card space-y-3">
          <h3 className="text-sm font-semibold text-foreground">New Announcement</h3>
          <div><label className="text-xs text-muted-foreground mb-1 block">Title</label><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input-field" required /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Content (HTML allowed)</label><textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} className="input-field" rows={4} /></div>
          <div><label className="text-xs text-muted-foreground mb-1 block">Status</label><select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="input-field"><option value="published">Published</option><option value="draft">Draft</option></select></div>
          <button type="submit" className="btn-primary text-sm">Create</button>
        </form>
      )}
      <div className="card space-y-3">
        {list.map(a => <div key={a.id} className="p-4 bg-secondary/30 rounded-xl flex items-start justify-between"><div><h4 className="text-sm font-medium text-foreground">{a.title}</h4><p className="text-xs text-muted-foreground mt-1">{a.content}</p><p className="text-[10px] text-muted-foreground mt-2">{new Date(a.created_at).toLocaleDateString()} · <span className={`badge ${a.status === 'published' ? 'badge-active' : 'badge-pending'}`}>{a.status}</span></p></div><button onClick={() => remove(a.id)} className="p-1.5 rounded-lg hover:bg-danger/10 text-muted-foreground hover:text-danger"><Trash2 className="w-4 h-4" /></button></div>)}
        {list.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No announcements yet</p>}
      </div>
    </div>
  );
}

// ====== Activity Log Tab ======
function ActivityTab({ api }) {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  useEffect(() => { api(`/admin/activity-log?page=${page}`).then(d => { setLogs(d.logs); setTotal(d.total); }).catch(() => {}); }, [page]);
  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left p-3">User</th><th className="text-left p-3">Action</th><th className="text-left p-3">Details</th><th className="text-right p-3">Date</th></tr></thead>
          <tbody>{logs.map(l => <tr key={l.id} className="border-b border-border last:border-0 hover:bg-secondary/30"><td className="p-3 text-foreground">{l.user_name || l.user_id || 'System'}</td><td className="p-3"><span className="badge badge-active capitalize">{l.action}</span></td><td className="p-3 text-muted-foreground max-w-[300px] truncate">{l.details || '—'}</td><td className="p-3 text-right text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td></tr>)}</tbody>
        </table>
      </div>
      {total > 50 && <div className="flex justify-center gap-2"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs px-3 py-1">Previous</button><span className="text-xs text-muted-foreground py-1">Page {page} of {Math.ceil(total / 50)}</span><button disabled={page >= Math.ceil(total / 50)} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs px-3 py-1">Next</button></div>}
    </div>
  );
}

// ====== Settings Tab ======
function SettingsTab({ api, settings, setSettings, showSecret, setShowSecret, saving, saved, saveSettings }) {
  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Payment gateway keys DB me save hote hain.</p>
        <button onClick={saveSettings} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
          {saving ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : saved ? <CheckCircle className="w-4 h-4" /> : null}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save All Keys'}
        </button>
      </div>
      <div className="card space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-xs">RZ</div>
          <div><h3 className="text-base font-bold text-foreground">Razorpay</h3><p className="text-xs text-muted-foreground">razorpay.com → Settings → API Keys</p></div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Mode</span>
          <button onClick={() => setSettings(s => ({ ...s, rz_test_mode: s.rz_test_mode === 'true' ? 'false' : 'true' }))} className={`relative w-12 h-6 rounded-full transition-colors ${settings.rz_test_mode === 'true' ? 'bg-success' : 'bg-danger'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.rz_test_mode === 'true' ? 'translate-x-6' : 'translate-x-0.5'}`} />
            <span className={`absolute text-[8px] font-bold ${settings.rz_test_mode === 'true' ? 'left-1.5 text-white' : 'right-1.5 text-white'}`}>{settings.rz_test_mode === 'true' ? 'TEST' : 'LIVE'}</span>
          </button>
        </div>
        <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">Key ID</label><input value={settings.rz_key_id} onChange={e => setSettings(s => ({ ...s, rz_key_id: e.target.value }))} className="input-field" placeholder="rzp_test_xxxxxxxxxxxx" /></div>
        <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">Key Secret</label><div className="relative"><input type={showSecret['rz'] ? 'text' : 'password'} value={settings.rz_key_secret} onChange={e => setSettings(s => ({ ...s, rz_key_secret: e.target.value }))} className="input-field pr-10" placeholder="xxxxxxxxxxxxxxxx" /><button type="button" onClick={() => setShowSecret(s => ({ ...s, rz: !s['rz'] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showSecret['rz'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
      </div>
      <div className="card space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs">CF</div>
          <div><h3 className="text-base font-bold text-foreground">Cashfree</h3><p className="text-xs text-muted-foreground">merchant.cashfree.com → Settings → API Keys</p></div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Mode</span>
          <button onClick={() => setSettings(s => ({ ...s, cf_test_mode: s.cf_test_mode === 'true' ? 'false' : 'true' }))} className={`relative w-12 h-6 rounded-full transition-colors ${settings.cf_test_mode === 'true' ? 'bg-success' : 'bg-danger'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${settings.cf_test_mode === 'true' ? 'translate-x-6' : 'translate-x-0.5'}`} />
            <span className={`absolute text-[8px] font-bold ${settings.cf_test_mode === 'true' ? 'left-1.5 text-white' : 'right-1.5 text-white'}`}>{settings.cf_test_mode === 'true' ? 'TEST' : 'LIVE'}</span>
          </button>
        </div>
        <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">Client ID</label><input value={settings.cf_client_id} onChange={e => setSettings(s => ({ ...s, cf_client_id: e.target.value }))} className="input-field" placeholder="CFxxxxxxxxxxxx" /></div>
        <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">Client Secret</label><div className="relative"><input type={showSecret['cf'] ? 'text' : 'password'} value={settings.cf_client_secret} onChange={e => setSettings(s => ({ ...s, cf_client_secret: e.target.value }))} className="input-field pr-10" placeholder="xxxxxxxxxxxxxxxx" /><button type="button" onClick={() => setShowSecret(s => ({ ...s, cf: !s['cf'] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showSecret['cf'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
      </div>
      <div className="card space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 font-bold text-xs">WH</div>
          <div><h3 className="text-base font-bold text-foreground">WHMCS Integration</h3><p className="text-xs text-muted-foreground">Register hone par user WHMCS mein bhi create hoga</p></div>
        </div>
        <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">WHMCS URL</label><input value={settings.whmcs_url} onChange={e => setSettings(s => ({ ...s, whmcs_url: e.target.value }))} className="input-field" placeholder="https://yourdomain.com/whmcs" /><p className="text-[10px] text-muted-foreground mt-1">Bina /includes/api.php ke</p></div>
        <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">API Identifier</label><input value={settings.whmcs_identifier} onChange={e => setSettings(s => ({ ...s, whmcs_identifier: e.target.value }))} className="input-field" placeholder="xxxxxxxxxxxxxxxx" /></div>
        <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">API Secret</label><div className="relative"><input type={showSecret['whmcs'] ? 'text' : 'password'} value={settings.whmcs_secret} onChange={e => setSettings(s => ({ ...s, whmcs_secret: e.target.value }))} className="input-field pr-10" placeholder="xxxxxxxxxxxxxxxx" /><button type="button" onClick={() => setShowSecret(s => ({ ...s, whmcs: !s['whmcs'] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showSecret['whmcs'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
      </div>
      <div className="card space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold text-xs"><Shield className="w-5 h-5" /></div>
          <div><h3 className="text-base font-bold text-foreground">Cloudflare Turnstile</h3><p className="text-xs text-muted-foreground">Login aur Register forms ke liye captcha</p></div>
        </div>
        <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">Site Key</label><input value={settings.turnstile_key} onChange={e => setSettings(s => ({ ...s, turnstile_key: e.target.value }))} className="input-field" placeholder="0x4AAAAAAA..." /></div>
        <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">Secret Key</label><div className="relative"><input type={showSecret['turnstile'] ? 'text' : 'password'} value={settings.turnstile_secret} onChange={e => setSettings(s => ({ ...s, turnstile_secret: e.target.value }))} className="input-field pr-10" placeholder="0x4AAAAAAA..." /><button type="button" onClick={() => setShowSecret(s => ({ ...s, turnstile: !s['turnstile'] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showSecret['turnstile'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
      </div>
      <div className="card space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs"><Mail className="w-5 h-5" /></div>
          <div><h3 className="text-base font-bold text-foreground">SMTP / Email</h3><p className="text-xs text-muted-foreground">Registration, order, payment — sab par email jayega</p></div>
        </div>
        <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">SMTP URL</label><input value={settings.smtp_url} onChange={e => setSettings(s => ({ ...s, smtp_url: e.target.value }))} className="input-field" placeholder="smtp://user:pass@smtp.example.com:587" /><p className="text-[10px] text-muted-foreground mt-1">Format: smtp://user:pass@host:port</p></div>
        <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">From Email</label><input value={settings.smtp_from} onChange={e => setSettings(s => ({ ...s, smtp_from: e.target.value }))} className="input-field" placeholder="noreply@yourdomain.com" /></div>
      </div>
      <div className="card space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500 font-bold text-xs">₹</div>
          <div><h3 className="text-base font-bold text-foreground">Tax / GST</h3><p className="text-xs text-muted-foreground">Invoice par tax add hoga</p></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">Tax Name</label><input value={settings.tax_name} onChange={e => setSettings(s => ({ ...s, tax_name: e.target.value }))} className="input-field" placeholder="GST" /></div>
          <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">Tax Rate (%)</label><input type="number" value={settings.tax_rate} onChange={e => setSettings(s => ({ ...s, tax_rate: e.target.value }))} className="input-field" placeholder="18" /></div>
        </div>
      </div>
      <div className="card space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500 font-bold text-xs"><Globe className="w-5 h-5" /></div>
          <div><h3 className="text-base font-bold text-foreground">Website Integration</h3><p className="text-xs text-muted-foreground">Main website se billing panel connect karein</p></div>
        </div>
        <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">Main Site URL</label><input value={settings.site_url} onChange={e => setSettings(s => ({ ...s, site_url: e.target.value }))} className="input-field" placeholder="https://yourdomain.com" /><p className="text-[10px] text-muted-foreground mt-1">Yahan se "Visit Website" aur "Back to Home" links kaam karenge</p></div>
      </div>
      <div className="card space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-danger/10 flex items-center justify-center text-danger font-bold text-xs"><Ban className="w-5 h-5" /></div>
          <div><h3 className="text-base font-bold text-foreground">Maintenance Mode</h3><p className="text-xs text-muted-foreground">Billing panel band karo, sirf admin access rahega</p></div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={settings.maintenance_mode === 'true'} onChange={e => setSettings(s => ({ ...s, maintenance_mode: e.target.checked ? 'true' : 'false' }))} className="w-5 h-5 rounded border-border bg-secondary accent-primary" />
          <span className="text-sm text-foreground">Maintenance Mode {settings.maintenance_mode === 'true' ? 'ON' : 'OFF'}</span>
        </label>
      </div>
      <div className="card space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-xs"><Globe className="w-5 h-5" /></div>
          <div><h3 className="text-base font-bold text-foreground">Social Login</h3><p className="text-xs text-muted-foreground">Google aur Discord se login enable karein</p></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">Google Client ID</label><input value={settings.google_client_id} onChange={e => setSettings(s => ({ ...s, google_client_id: e.target.value }))} className="input-field" placeholder="123...apps.googleusercontent.com" /></div>
          <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">Google Client Secret</label><div className="relative"><input type={showSecret['google'] ? 'text' : 'password'} value={settings.google_client_secret} onChange={e => setSettings(s => ({ ...s, google_client_secret: e.target.value }))} className="input-field pr-10" placeholder="GOCSPX-..." /><button type="button" onClick={() => setShowSecret(s => ({ ...s, google: !s['google'] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showSecret['google'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">Discord Client ID</label><input value={settings.discord_client_id} onChange={e => setSettings(s => ({ ...s, discord_client_id: e.target.value }))} className="input-field" placeholder="123456789" /></div>
          <div><label className="text-xs text-muted-foreground mb-1.5 block font-medium">Discord Client Secret</label><div className="relative"><input type={showSecret['discord'] ? 'text' : 'password'} value={settings.discord_client_secret} onChange={e => setSettings(s => ({ ...s, discord_client_secret: e.target.value }))} className="input-field pr-10" placeholder="discord-secret" /><button type="button" onClick={() => setShowSecret(s => ({ ...s, discord: !s['discord'] }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">{showSecret['discord'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
        </div>
      </div>
      <div className="card space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 font-bold text-xs">$</div>
          <div><h3 className="text-base font-bold text-foreground">Currency</h3><p className="text-xs text-muted-foreground">Invoice aur pricing ke liye currency</p></div>
        </div>
        <select value={settings.currency} onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))} className="input-field">
          <option value="INR">INR (₹)</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR (€)</option>
          <option value="GBP">GBP (£)</option>
        </select>
      </div>
      <div className="card space-y-5">
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500 font-bold text-xs"><Layout className="w-5 h-5" /></div>
          <div><h3 className="text-base font-bold text-foreground">Site Features</h3><p className="text-xs text-muted-foreground">Main website features — toggle on/off & edit content</p></div>
        </div>
        <SiteFeaturesEditor api={api} />
      </div>
      <div className="card p-4 text-xs text-muted-foreground space-y-2">
        <p>🔗 <a href="https://dashboard.razorpay.com" target="_blank" rel="noopener" className="text-primary underline">Razorpay Dashboard</a> · <a href="https://merchant.cashfree.com" target="_blank" rel="noopener" className="text-primary underline">Cashfree Dashboard</a></p>
        <p>⚡ Dono mein se koi bhi use kar sakte ho.</p>
      </div>
    </div>
  );
}

// ====== Site Features Editor ======
function SiteFeaturesEditor({ api }) {
  const [features, setFeatures] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api('/admin/settings').then(s => {
      try { setFeatures(s.site_features ? JSON.parse(s.site_features) : null); } catch { setFeatures(null); }
    }).catch(() => {});
  }, []);

  const toggle = (key) => {
    setFeatures(f => ({ ...f, [key]: { ...f[key], enabled: !f[key]?.enabled } }));
  };

  const updateField = (section, field, value) => {
    setFeatures(f => ({ ...f, [section]: { ...f[section], [field]: value } }));
  };

  const updateItem = (section, index, field, value) => {
    setFeatures(f => {
      const items = [...(f[section]?.items || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...f, [section]: { ...f[section], items } };
    });
  };

  const addItem = (section) => {
    setFeatures(f => {
      const items = [...(f[section]?.items || []), { name: '', desc: '' }];
      return { ...f, [section]: { ...f[section], items } };
    });
  };

  const removeItem = (section, index) => {
    setFeatures(f => {
      const items = (f[section]?.items || []).filter((_, i) => i !== index);
      return { ...f, [section]: { ...f[section], items } };
    });
  };

  const saveFeatures = async () => {
    setSaving(true);
    try {
      await api('/admin/settings', { method: 'POST', body: JSON.stringify({ key: 'site_features', value: JSON.stringify(features) }) });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  if (!features) return <p className="text-xs text-muted-foreground">Loading...</p>;

  const sections = [
    { key: 'techstack', label: 'Tech Stack', icon: '🖥️', fields: [
      { key: 'enabled', type: 'toggle' },
      { type: 'items', nameLabel: 'Tech Name', descLabel: 'Description', nameKey: 'name', descKey: 'desc' }
    ]},
    { key: 'discord', label: 'Discord Widget', icon: '💬', fields: [
      { key: 'enabled', type: 'toggle' },
      { key: 'invite_url', type: 'text', label: 'Invite URL' },
      { key: 'title', type: 'text', label: 'Title' },
      { key: 'member_count', type: 'text', label: 'Member Count' }
    ]},
    { key: 'live_chat', label: 'Live Chat', icon: '💭', fields: [
      { key: 'enabled', type: 'toggle' }
    ]},
    { key: 'support_status', label: 'Support Status', icon: '🎧', fields: [
      { key: 'enabled', type: 'toggle' },
      { key: 'response_time', type: 'text', label: 'Response Time (e.g. < 5 min)' },
      { key: 'online_agents', type: 'text', label: 'Online Agents (e.g. 12)' },
      { key: 'satisfaction', type: 'text', label: 'Satisfaction (e.g. 98%)' },
      { key: 'title', type: 'text', label: 'Title' }
    ]},
    { key: 'partners', label: 'Partners', icon: '🤝', fields: [
      { key: 'enabled', type: 'toggle' },
      { type: 'items', nameLabel: 'Partner Name', descLabel: 'Logo URL', nameKey: 'name', descKey: 'logo' }
    ]},
    { key: 'benchmark', label: 'Speed Benchmark', icon: '⚡', fields: [
      { key: 'enabled', type: 'toggle' },
      { key: 'download_speed', type: 'text', label: 'Download Speed' },
      { key: 'upload_speed', type: 'text', label: 'Upload Speed' },
      { key: 'unit', type: 'text', label: 'Unit (e.g. MB/s)' },
      { key: 'server_location', type: 'text', label: 'Server Location' }
    ]},
    { key: 'sla_banner', label: 'SLA Banner', icon: '📋', fields: [
      { key: 'enabled', type: 'toggle' },
      { key: 'percentage', type: 'text', label: 'Percentage (e.g. 99.9)' },
      { key: 'title', type: 'text', label: 'Title' },
      { key: 'description', type: 'text', label: 'Description' }
    ]}
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button onClick={saveFeatures} disabled={saving} className="btn-primary text-xs flex items-center gap-2 px-4 py-1.5">
          {saving ? <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> : saved ? <CheckCircle className="w-3.5 h-3.5" /> : null}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Features'}
        </button>
      </div>
      {sections.map(sec => {
        const data = features[sec.key] || {};
        return (
          <div key={sec.key} className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{sec.icon}</span>
                <span className="text-sm font-semibold text-foreground">{sec.label}</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={data.enabled !== false} onChange={() => toggle(sec.key)} className="sr-only peer" />
                <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
            {sec.fields.filter(f => f.key !== 'enabled').map(f => {
              if (f.type === 'items') {
                const items = data.items || [];
                return (
                  <div key={f.type}>
                    <div className="space-y-2">
                      {items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input value={item[f.nameKey] || ''} onChange={e => updateItem(sec.key, idx, f.nameKey, e.target.value)} className="input-field flex-1 text-xs" placeholder={f.nameLabel} />
                          <input value={item[f.descKey] || ''} onChange={e => updateItem(sec.key, idx, f.descKey, e.target.value)} className="input-field flex-1 text-xs" placeholder={f.descLabel} />
                          <button onClick={() => removeItem(sec.key, idx)} className="text-danger hover:text-danger/80 text-xs p-1">✕</button>
                        </div>
                      ))}
                    </div>
                    <button onClick={() => addItem(sec.key)} className="text-primary text-xs mt-2 hover:underline">+ Add Item</button>
                  </div>
                );
              }
              return (
                <div key={f.key}>
                  <label className="text-[10px] text-muted-foreground mb-1 block">{f.label}</label>
                  <input value={data[f.key] || ''} onChange={e => updateField(sec.key, f.key, e.target.value)} className="input-field text-xs" placeholder={f.label} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ====== Invoices Tab ======
function AdminInvoicesTab({ api, invoices, setInvoices }) {
  const updateStatus = async (id, status) => {
    try {
      await api(`/admin/invoices/${id}/status`, { method: 'POST', body: JSON.stringify({ status }) });
      api('/admin/invoices').then(setInvoices);
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left p-3">Invoice</th><th className="text-left p-3">User</th><th className="text-right p-3">Amount</th><th className="text-left p-3">Status</th><th className="text-right p-3">Date</th><th className="text-right p-3">Actions</th></tr></thead>
        <tbody>{invoices.map(inv => (
          <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
            <td className="p-3 text-foreground">{inv.invoice_no}</td>
            <td className="p-3 text-muted-foreground">{inv.user_name}</td>
            <td className="p-3 text-right text-foreground">₹{inv.amount}</td>
            <td className="p-3">
              <select value={inv.status} onChange={e => updateStatus(inv.id, e.target.value)}
                className="text-xs bg-secondary border border-border rounded-lg p-1 text-foreground">
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </td>
            <td className="p-3 text-right text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</td>
            <td className="p-3 text-right">
              {inv.status === 'unpaid' && (
                <button onClick={() => updateStatus(inv.id, 'paid')}
                  className="text-xs bg-success/10 text-success hover:bg-success/20 px-2 py-1 rounded-lg transition-colors">
                  Mark Paid
                </button>
              )}
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ====== Tickets Tab ======
function AdminTicketsTab({ api, tickets, setTickets }) {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketDetail, setTicketDetail] = useState(null);
  const [reply, setReply] = useState('');

  const openTicket = async (t) => {
    setSelectedTicket(t);
    try {
      const detail = await api(`/tickets/${t.id}`);
      setTicketDetail(detail);
    } catch (e) { alert(e.message); }
  };

  const backToList = () => {
    setSelectedTicket(null);
    setTicketDetail(null);
    setReply('');
  };

  const sendReply = async () => {
    if (!reply.trim()) return;
    try {
      await api(`/tickets/${selectedTicket.id}/reply`, { method: 'POST', body: JSON.stringify({ message: reply }) });
      setReply('');
      const detail = await api(`/tickets/${selectedTicket.id}`);
      setTicketDetail(detail);
      api('/admin/tickets').then(setTickets);
    } catch (e) { alert(e.message); }
  };

  const closeTicket = async () => {
    try {
      await api(`/tickets/${selectedTicket.id}/close`, { method: 'POST' });
      const detail = await api(`/tickets/${selectedTicket.id}`);
      setTicketDetail(detail);
      api('/admin/tickets').then(setTickets);
    } catch (e) { alert(e.message); }
  };

  if (selectedTicket && ticketDetail) {
    return (
      <div className="space-y-4">
        <button onClick={backToList} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Tickets
        </button>
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Ticket #{ticketDetail.id?.slice(0, 6)} — {ticketDetail.subject}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ticketDetail.user_name || 'Unknown'} · {new Date(ticketDetail.created_at).toLocaleDateString()} · <span className="capitalize">{ticketDetail.priority} priority</span> · <span className={`badge ${ticketDetail.status === 'open' || ticketDetail.status === 'awaiting_reply' ? 'badge-open' : 'badge-closed'}`}>{ticketDetail.status}</span>
              </p>
            </div>
          </div>

          <div className="space-y-4 my-4">
            {ticketDetail.replies?.map(r => (
              <div key={r.id} className={`flex gap-3 ${r.is_staff ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${r.is_staff ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                  {r.user_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className={`flex-1 ${r.is_staff ? 'text-right' : ''}`}>
                  <p className="text-xs text-muted-foreground">{r.is_staff ? 'Staff' : r.user_name || 'User'} · {new Date(r.created_at).toLocaleDateString()} {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className={`text-sm mt-1 p-3 rounded-lg inline-block ${r.is_staff ? 'bg-primary/10 text-foreground' : 'bg-secondary text-foreground'}`}>{r.message}</p>
                  {r.attachment && <p className="text-xs text-primary mt-1 flex items-center gap-1"><Paperclip className="w-3 h-3" /> {r.attachment}</p>}
                </div>
              </div>
            ))}
          </div>

          {ticketDetail.status !== 'closed' && (
            <div className="space-y-3 pt-4 border-t border-border">
              <textarea value={reply} onChange={e => setReply(e.target.value)} className="input-field min-h-[80px]" placeholder="Type your reply as staff..." />
              <div className="flex gap-2">
                <button onClick={sendReply} className="btn-primary text-sm flex items-center gap-1.5"><Send className="w-3.5 h-3.5" /> Reply</button>
                <button onClick={closeTicket} className="btn-secondary text-sm">Close Ticket</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left p-3">User</th><th className="text-left p-3">Subject</th><th className="text-left p-3">Status</th><th className="text-left p-3">Priority</th><th className="text-right p-3">Date</th></tr></thead>
        <tbody>{tickets.map(t => (
          <tr key={t.id} onClick={() => openTicket(t)} className="border-b border-border last:border-0 hover:bg-secondary/30 cursor-pointer">
            <td className="p-3 text-foreground">{t.user_name}</td>
            <td className="p-3 text-muted-foreground">{t.subject}</td>
            <td className="p-3"><span className={`badge ${t.status === 'open' || t.status === 'awaiting_reply' ? 'badge-open' : 'badge-closed'}`}>{t.status}</span></td>
            <td className="p-3"><span className="badge badge-open capitalize">{t.priority}</span></td>
            <td className="p-3 text-right text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ====== Email Templates Tab ======
function EmailTemplatesTab({ api }) {
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ subject: '', body: '' });

  useEffect(() => { api('/admin/email-templates').then(setTemplates).catch(() => {}); }, []);

  const edit = (t) => {
    setEditing(t.id);
    setForm({ subject: t.subject, body: t.body });
  };

  const save = async (id) => {
    try {
      await api(`/admin/email-templates/${id}`, { method: 'POST', body: JSON.stringify(form) });
      setEditing(null);
      api('/admin/email-templates').then(setTemplates);
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Email Templates</h3>
      <p className="text-xs text-muted-foreground">Available variables: {`{{site_name}}, {{site_url}}, {{name}}, {{email}}, {{currency}}, {{product_name}}, {{invoice_no}}, {{amount}}, {{due_date}}`}</p>
      {templates.map(t => (
        <div key={t.id} className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-foreground capitalize">{t.key.replace(/_/g, ' ')}</p>
              <p className="text-xs text-muted-foreground">{!editing || editing !== t.id ? t.subject : 'Editing...'}</p>
            </div>
            {editing !== t.id && <button onClick={() => edit(t)} className="btn-secondary text-xs px-3 py-1">Edit</button>}
          </div>
          {editing === t.id && (
            <div className="space-y-3 border-t border-border pt-3">
              <div><label className="text-xs text-muted-foreground mb-1 block">Subject</label><input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className="input-field" /></div>
              <div><label className="text-xs text-muted-foreground mb-1 block">Body (HTML)</label><textarea value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} className="input-field" rows={6} /></div>
              <div className="flex gap-2">
                <button onClick={() => save(t.id)} className="btn-primary text-xs px-4 py-1.5">Save</button>
                <button onClick={() => setEditing(null)} className="btn-secondary text-xs px-4 py-1.5">Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
