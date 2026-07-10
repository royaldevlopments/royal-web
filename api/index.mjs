import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import serverless from 'serverless-http';
import db, { ensureSchema } from './lib/db.mjs';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || (() => { console.warn('WARNING: Using default JWT_SECRET. Set JWT_SECRET env var in production.'); return 'royal-billing-secret-2026'; })();

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  if (req.path.startsWith('/devlopment/api')) {
    req.url = req.url.replace('/devlopment/api', '/api');
  }
  next();
});

const rateLimitMap = new Map();
function rateLimit(key, maxRequests = 5, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.reset > windowMs) {
    rateLimitMap.set(key, { count: 1, reset: now });
    return false;
  }
  entry.count++;
  if (entry.count > maxRequests) return true;
  return false;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.reset > 60000) rateLimitMap.delete(key);
  }
}, 30000);

function mailTransport() {
  return null;
}

async function sendMail({ to, subject, html }) {
  console.log(`[MAIL] To: ${to}, Subject: ${subject}`);
  // Email sending disabled - configure SMTP in production
}

function logActivity(userId, adminId, action, details) {
  db.prepare('INSERT INTO activity_log (id, user_id, admin_id, action, details) VALUES ($1, $2, $3, $4, $5)').run(uuidv4(), userId, adminId, action, details || '');
}

function renderTemplate(key, vars) {
  const row = db.prepare('SELECT subject, body FROM email_templates WHERE key = $1').get(key);
  if (!row) return null;
  const settings = {};
  db.prepare('SELECT key, value FROM settings').all().forEach(r => settings[r.key] = r.value);
  const allVars = { site_name: 'Royal Billing', site_url: settings.site_url || '', currency: settings.currency || 'INR', ...vars };
  let subject = row.subject;
  let body = row.body;
  for (const [k, v] of Object.entries(allVars)) {
    subject = subject.replaceAll(`{{${k}}}`, v);
    body = body.replaceAll(`{{${k}}}`, v);
  }
  return { subject, body };
}

async function verifyTurnstile(token) {
  const secret = db.prepare("SELECT value FROM settings WHERE key = $1").get('turnstile_secret');
  if (!secret || !secret.value) return true;
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: secret.value, response: token })
    });
    const data = await res.json();
    return data.success === true;
  } catch { return false; }
}

function generateReferralCode() {
  return 'ROYAL' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function calcTax(amount) {
  const rate = db.prepare("SELECT value FROM settings WHERE key = $1").get('tax_rate');
  const name = db.prepare("SELECT value FROM settings WHERE key = $1").get('tax_name');
  if (!rate || !rate.value || parseFloat(rate.value) <= 0) return { rate: 0, name: '', amount: 0 };
  return { rate: parseFloat(rate.value), name: name?.value || 'Tax', amount: Math.round(amount * parseFloat(rate.value) / 100 * 100) / 100 };
}

async function autoProvision(serviceId) {
  const service = await db.prepare('SELECT s.*, p.delivery_fields FROM services s LEFT JOIN products p ON s.product_id = p.id WHERE s.id = $1').get(serviceId);
  if (!service) return;
  let deliveryFields = [];
  try { deliveryFields = JSON.parse(service.delivery_fields || '[]'); } catch {}
  if (deliveryFields.length === 0) return;
  const delivery = {};
  const idShort = serviceId.replace(/-/g, '').slice(0, 8);
  for (const field of deliveryFields) {
    const label = field.label || '';
    let value;
    if (/password/i.test(label)) {
      value = crypto.randomBytes(8).toString('hex');
    } else if (/username|user/i.test(label)) {
      value = 'u_' + crypto.randomBytes(4).toString('hex');
    } else if (/hostname|domain|server|url|ip/i.test(label)) {
      value = 'server' + idShort + '.royaldev.com';
    } else if (/port/i.test(label)) {
      value = '2083';
    } else {
      value = crypto.randomBytes(6).toString('hex');
    }
    delivery[field.key || label] = value;
  }
  const now = new Date().toISOString();
  await db.prepare('UPDATE services SET delivery = $1, updated_at = $2 WHERE id = $3').run(JSON.stringify(delivery), now, serviceId);
  await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1, $2, $3, $4, $5)').run(uuidv4(), service.user_id, 'Service Provisioned', `Your service ${service.name} has been provisioned. Check your service details for credentials.`, 'success');
  logActivity(service.user_id, null, 'provision', `Service ${service.name} auto-provisioned`);
}

async function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// Maintenance mode check
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/me') || req.path === '/api/settings/maintenance' || req.path.startsWith('/api/turnstile-key') || req.path.startsWith('/api/_health')) return next();
  const setting = await db.prepare("SELECT value FROM settings WHERE key = 'maintenance_mode'").get();
  if (setting?.value === 'true') {
    const user = req.user ? await db.prepare('SELECT role FROM users WHERE id = $1').get(req.user.id) : null;
    if (user?.role !== 'admin') {
      return res.status(503).json({ error: 'Site is under maintenance. Please check back later.', maintenance: true });
    }
  }
  next();
});

// Maintenance status endpoint
app.get('/api/settings/maintenance', async (req, res) => {
  const setting = await db.prepare("SELECT value FROM settings WHERE key = 'maintenance_mode'").get();
  res.json({ maintenance: setting?.value === 'true' });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (rateLimit(`register:${ip}`, 3, 60000)) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    const { email, password, name, phone, turnstile_token, referral_code } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    if (!(await verifyTurnstile(turnstile_token))) return res.status(400).json({ error: 'Captcha verification failed' });
    const existing = await db.prepare('SELECT id FROM users WHERE email = $1').get(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const refCode = generateReferralCode();
    let referrerId = null;
    if (referral_code) {
      const referrer = await db.prepare('SELECT id FROM users WHERE referral_code = $1').get(referral_code);
      if (referrer) referrerId = referrer.id;
    }
    await db.prepare('INSERT INTO users (id, email, password, name, phone, referral_code, referred_by) VALUES ($1, $2, $3, $4, $5, $6, $7)').run(id, email, hashed, name || email.split('@')[0], phone || '', refCode, referrerId);
    logActivity(id, null, 'register', `User registered: ${email}`);
    const token = jwt.sign({ id, email, role: 'client' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, email, name: name || email.split('@')[0], role: 'client', balance: 0, referral_code: refCode } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (rateLimit(`login:${ip}`, 5, 60000)) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    const { email, password, turnstile_token } = req.body;
    if (!(await verifyTurnstile(turnstile_token))) return res.status(400).json({ error: 'Captcha verification failed' });
    const user = await db.prepare('SELECT * FROM users WHERE email = $1').get(email);
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: 'Invalid credentials' });
    if (user.totp_enabled) {
      const tempToken = jwt.sign({ id: user.id, step: '2fa' }, JWT_SECRET, { expiresIn: '5m' });
      return res.json({ requires_2fa: true, temp_token: tempToken });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    logActivity(user.id, null, 'login', `User logged in: ${email}`);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, balance: user.balance, avatar: user.avatar } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login/2fa', async (req, res) => {
  try {
    const speakeasy = require('speakeasy');
    const { temp_token, token } = req.body;
    let payload;
    try { payload = jwt.verify(temp_token, JWT_SECRET); } catch { return res.status(400).json({ error: 'Session expired' }); }
    if (payload.step !== '2fa') return res.status(400).json({ error: 'Invalid session' });
    const user = await db.prepare('SELECT * FROM users WHERE id = $1').get(payload.id);
    if (!user?.totp_secret) return res.status(400).json({ error: '2FA not configured' });
    const verified = speakeasy.totp.verify({ secret: user.totp_secret, encoding: 'base32', token, window: 1 });
    if (!verified) {
      const recoveryCodes = await db.prepare('SELECT id, code_hash FROM recovery_codes WHERE user_id = $1 AND used = 0').all(user.id);
      let matched = null;
      for (const rc of recoveryCodes) {
        if (crypto.createHash('sha256').update(token).digest('hex') === rc.code_hash) {
          matched = rc.id;
          break;
        }
      }
      if (!matched) return res.status(400).json({ error: 'Invalid code' });
      await db.prepare('UPDATE recovery_codes SET used = 1 WHERE id = $1').run(matched);
    }
    const jwtToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    logActivity(user.id, null, 'login', `User logged in with 2FA: ${user.email}`);
    res.json({ token: jwtToken, user: { id: user.id, email: user.email, name: user.name, role: user.role, balance: user.balance, avatar: user.avatar } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await db.prepare('SELECT id, email, name, phone, address, city, state, country, avatar, balance, role, created_at, whmcs_client_id FROM users WHERE id = $1').get(req.user.id);
  res.json(user);
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  if (rateLimit(`forgot:${ip}`, 2, 60000)) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const user = await db.prepare('SELECT id FROM users WHERE email = $1').get(email);
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await db.prepare('UPDATE users SET reset_token = $1, reset_expires = NOW() + INTERVAL \'1 hour\' WHERE id = $2').run(token, user.id);
    const siteUrl = (await db.prepare("SELECT value FROM settings WHERE key = 'site_url'").get())?.value || `${req.protocol}://${req.get('host')}`;
    const resetLink = `${siteUrl}/devlopment/reset-password?token=${token}`;
    await sendMail({ to: email, subject: 'Password Reset', html: `<p>Click to reset: <a href="${resetLink}">${resetLink}</a></p>` });
  }
  res.json({ success: true });
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const user = await db.prepare("SELECT * FROM users WHERE reset_token = $1 AND reset_expires > NOW()").get(token);
    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await db.prepare('UPDATE users SET password = $1, reset_token = NULL, reset_expires = NULL WHERE id = $2').run(hashed, user.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/categories', async (req, res) => {
  res.json(await db.prepare('SELECT * FROM categories ORDER BY sort_order').all());
});

app.get('/api/products', async (req, res) => {
  const { category } = req.query;
  if (category) return res.json(await db.prepare('SELECT * FROM products WHERE category_id = $1 AND status = $2').all(category, 'active'));
  res.json(await db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = $1 ORDER BY p.created_at DESC').all('active'));
});

app.get('/api/order/configure/:productId', async (req, res) => {
  const product = await db.prepare('SELECT * FROM products WHERE id = $1 AND status = $2').get(req.params.productId, 'active');
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.post('/api/order/place', auth, async (req, res) => {
  const { product_id, billing_cycle, custom_data, coupon_code } = req.body;
  const product = await db.prepare('SELECT * FROM products WHERE id = $1 AND status = $2').get(product_id, 'active');
  if (!product) return res.status(404).json({ error: 'Product not found' });
  const cycle = billing_cycle || product.billing_cycle || 'monthly';
  const multipliers = { monthly: 1, quarterly: 3, semiannually: 6, annually: 12 };
  const multiplier = multipliers[cycle] || 1;
  let total = product.price * multiplier;
  let couponApplied = null;
  if (coupon_code) {
    const coupon = await db.prepare("SELECT * FROM coupons WHERE code = $1 AND status = $2 AND (expires_at IS NULL OR expires_at > NOW())").get(coupon_code, 'active');
    if (coupon && (coupon.max_uses === 0 || coupon.used_count < coupon.max_uses) && total >= coupon.min_amount) {
      const productIds = JSON.parse(coupon.product_ids || '[]');
      if (productIds.length === 0 || productIds.includes(product_id)) {
        if (coupon.type === 'percentage') total = Math.round(total * (100 - coupon.value) / 100 * 100) / 100;
        else total = Math.max(0, total - coupon.value);
        await db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1').run(coupon.id);
        couponApplied = coupon.code;
      }
    }
  }
  const tax = calcTax(total);
  const totalWithTax = Math.round((total + tax.amount) * 100) / 100;
  const serviceId = uuidv4();
  const orderId = uuidv4();
  const invoiceId = uuidv4();
  const invoiceNo = 'INV-' + Date.now();
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const customData = custom_data ? JSON.stringify(custom_data) : '{}';
  await db.prepare('INSERT INTO services (id, user_id, product_id, name, price, billing_cycle, status, custom_data) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)').run(serviceId, req.user.id, product_id, product.name, totalWithTax, cycle, 'pending', customData);
  await db.prepare('INSERT INTO orders (id, user_id, product_id, service_id, amount, status) VALUES ($1, $2, $3, $4, $5, $6)').run(orderId, req.user.id, product_id, serviceId, totalWithTax, 'pending');
  const items = JSON.stringify([{ name: product.name, description: product.description, price: totalWithTax, qty: 1, cycle, features: product.features, tax: tax.amount, coupon: couponApplied }]);
  await db.prepare('INSERT INTO invoices (id, user_id, service_id, invoice_no, amount, status, due_date, items) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)').run(invoiceId, req.user.id, serviceId, invoiceNo, totalWithTax, 'unpaid', dueDate, items);
  await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1, $2, $3, $4, $5)').run(uuidv4(), req.user.id, 'Order Placed', `Your order for ${product.name} has been placed. Invoice: ${invoiceNo}`, 'info');
  logActivity(req.user.id, null, 'order', `Order placed: ${product.name}, Invoice: ${invoiceNo}, Amount: ${totalWithTax}`);
  res.json({ service_id: serviceId, order_id: orderId, invoice_id: invoiceId, invoice_no: invoiceNo, amount: totalWithTax });
});

app.get('/api/services', auth, async (req, res) => {
  res.json(await db.prepare('SELECT s.*, p.name as product_name, p.description as product_description FROM services s LEFT JOIN products p ON s.product_id = p.id WHERE s.user_id = $1 ORDER BY s.created_at DESC').all(req.user.id));
});

app.get('/api/services/:id', auth, async (req, res) => {
  const service = await db.prepare('SELECT s.*, p.name as product_name, p.description as product_description, p.features, p.custom_fields as product_custom_fields, p.delivery_fields as product_delivery_fields FROM services s LEFT JOIN products p ON s.product_id = p.id WHERE s.id = $1 AND s.user_id = $2').get(req.params.id, req.user.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  const invoices = await db.prepare('SELECT * FROM invoices WHERE service_id = $1 ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...service, invoices, uploads: [] });
});

app.get('/api/invoices', auth, async (req, res) => {
  res.json(await db.prepare('SELECT i.*, s.name as service_name FROM invoices i LEFT JOIN services s ON i.service_id = s.id WHERE i.user_id = $1 ORDER BY i.created_at DESC').all(req.user.id));
});

app.get('/api/invoices/:id', auth, async (req, res) => {
  const user = await db.prepare('SELECT * FROM users WHERE id = $1').get(req.user.id);
  const invoice = await db.prepare('SELECT i.*, s.name as service_name FROM invoices i LEFT JOIN services s ON i.service_id = s.id WHERE i.id = $1 AND i.user_id = $2').get(req.params.id, req.user.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ ...invoice, user });
});

function renderInvoiceHtml(invoice, user, items, settings) {
  const currency = settings.currency || 'INR';
  const taxName = settings.tax_name || 'Tax';
  const subtotal = items.reduce((s, i) => s + (parseFloat(i.price ?? i.amount) || 0), 0);
  const statusColor = invoice.status === 'paid' ? '#22c55e' : invoice.status === 'unpaid' ? '#ef4444' : '#f59e0b';
  const rows = items.map((i, idx) => {
    const amt = parseFloat(i.price ?? i.amount) || 0;
    return `<tr><td>${idx + 1}</td><td>${i.name || 'Service'}</td><td class="amt">${currency} ${amt.toFixed(2)}</td></tr>`;
  }).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Invoice ${invoice.invoice_no || invoice.id}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0a0b1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;padding:40px 20px;display:flex;justify-content:center}
.invoice{max-width:800px;width:100%;background:#111322;border:1px solid #1e2030;border-radius:16px;padding:48px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
.brand h1{font-size:28px;letter-spacing:-0.5px}
.brand h1 .accent{color:#1cc4e8}
.brand h1 .white{color:#f1f5f9}
.brand .tagline{color:#1cc4e8;font-size:11px;letter-spacing:2px;margin-top:2px;text-transform:uppercase}
.title h2{font-size:24px;color:#f1f5f9;text-align:right}
.title .num{color:#64748b;font-size:14px;text-align:right}
.divider{height:1px;background:#1e2030;margin:24px 0}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px}
.label{color:#64748b;font-size:12px;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px}
.value{color:#f1f5f9;font-size:14px;line-height:1.5}
table{width:100%;border-collapse:collapse;margin-bottom:24px}
th{text-align:left;padding:12px 8px;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #1e2030}
td{padding:14px 8px;font-size:14px;border-bottom:1px solid rgba(30,32,48,.5);color:#cbd5e1}
td.amt{text-align:right;font-family:ui-monospace,monospace}
.totals{margin-left:auto;width:280px}
.totals .row{display:flex;justify-content:space-between;padding:8px 0;font-size:14px}
.totals .row .lbl{color:#64748b}
.totals .row .val{color:#cbd5e1;font-family:ui-monospace,monospace}
.totals .total{border-top:1px solid #1e2030;margin-top:4px;padding-top:12px;font-size:18px;font-weight:700}
.totals .total .lbl{color:#f1f5f9}
.totals .total .val{color:#1cc4e8}
.status{display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:${statusColor};border:1px solid ${statusColor};background:${statusColor}15}
.footer{text-align:center;margin-top:40px;padding-top:24px;border-top:1px solid #1e2030;color:#475569;font-size:12px}
@media print{body{background:#fff;padding:0}.invoice{box-shadow:none;border:none;border-radius:0}body{background:#0a0b1e}}
</style>
</head>
<body>
<div class="invoice">
<div class="header">
<div class="brand">
<h1><span class="accent">ROYAL</span> <span class="white">DEVLOPMENTS</span></h1>
<div class="tagline">Building Solutions Power Future</div>
</div>
<div class="title">
<h2>INVOICE</h2>
<div class="num">#${invoice.invoice_no || invoice.id}</div>
</div>
</div>
<div class="divider"></div>
<div class="grid">
<div>
<div class="label">Bill To</div>
<div class="value">${user.name || ''}<br>${user.email || ''}${user.address ? `<br>${user.address}${user.city ? ', ' + user.city : ''}${user.state ? ', ' + user.state : ''}${user.country ? '<br>' + user.country : ''}` : ''}</div>
</div>
<div style="text-align:right">
<div class="label">Status</div>
<div class="value"><span class="status">${invoice.status || 'unknown'}</span></div>
<div style="margin-top:12px">
<div class="label">Issue Date</div>
<div class="value">${new Date(invoice.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
</div>
${invoice.due_date ? `<div style="margin-top:12px">
<div class="label">Due Date</div>
<div class="value">${new Date(invoice.due_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
</div>` : ''}
</div>
</div>
<div class="divider"></div>
${invoice.service_name ? `<div style="margin-bottom:20px;font-size:14px"><span class="label">Service</span><div class="value" style="margin-top:4px">${invoice.service_name}</div></div>` : ''}
<table>
<thead><tr><th style="width:40px">#</th><th>Item</th><th style="text-align:right;width:140px">Amount</th></tr></thead>
<tbody>${rows || '<tr><td colspan="3" style="text-align:center;color:#64748b;padding:24px">No line items</td></tr>'}</tbody>
</table>
<div class="totals">
${subtotal !== total ? `<div class="row"><span class="lbl">Subtotal</span><span class="val">${currency} ${subtotal.toFixed(2)}</span></div>` : ''}
${items[0] && items[0].tax > 0 ? `<div class="row"><span class="lbl">${taxName}</span><span class="val">${currency} ${(parseFloat(items[0].tax) || 0).toFixed(2)}</span></div>` : (taxAmount > 0 ? `<div class="row"><span class="lbl">${taxName}</span><span class="val">${currency} ${taxAmount.toFixed(2)}</span></div>` : '')}
<div class="row total"><span class="lbl">Total</span><span class="val">${currency} ${(parseFloat(invoice.amount) || 0).toFixed(2)}</span></div>
</div>
<div class="footer">Thank you for your business!</div>
</div>
</body>
</html>`;
}

app.get('/api/invoices/:id/pdf', auth, async (req, res) => {
  try {
    const user = await db.prepare('SELECT * FROM users WHERE id = $1').get(req.user.id);
    const invoice = await db.prepare("SELECT i.*, s.name as service_name FROM invoices i LEFT JOIN services s ON i.service_id = s.id WHERE i.id = $1 AND (i.user_id = $2 OR $3 IN (SELECT id FROM users WHERE role = 'admin'))").get(req.params.id, req.user.id, req.user.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const settings = {};
    (await db.prepare('SELECT key, value FROM settings').all()).forEach(r => settings[r.key] = r.value);
    let items = [];
    try { items = JSON.parse(invoice.items || '[]'); } catch {}
    const html = renderInvoiceHtml(invoice, user, items, settings);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename=invoice-${invoice.invoice_no || invoice.id}.html`);
    res.send(html);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/pay/:invoiceId', auth, async (req, res) => {
  try {
    const { method } = req.body;
    const invoice = await db.prepare('SELECT * FROM invoices WHERE id = $1 AND user_id = $2').get(req.params.invoiceId, req.user.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'paid') return res.json({ success: true, message: 'Already paid' });
    const paymentId = uuidv4();
    const paymentMethods = { cashfree: 'Cashfree', upi: 'UPI', card: 'Card', netbanking: 'Netbanking', wallet: 'Wallet' };
    const methodName = paymentMethods[method] || method;
    await db.prepare('UPDATE invoices SET status = $1, paid_at = $2, payment_method = $3 WHERE id = $4').run('paid', new Date().toISOString(), methodName, req.params.invoiceId);
    await db.prepare('UPDATE services SET status = $1, updated_at = $2 WHERE id = $3').run('active', new Date().toISOString(), invoice.service_id);
    await db.prepare('UPDATE orders SET status = $1 WHERE service_id = $2').run('active', invoice.service_id);
    await autoProvision(invoice.service_id);
    if (method === 'wallet') {
      const user = await db.prepare('SELECT balance FROM users WHERE id = $1').get(req.user.id);
      if (!user || user.balance < invoice.amount) return res.status(400).json({ error: 'Insufficient wallet balance' });
      await db.prepare('UPDATE users SET balance = balance - $1 WHERE id = $2').run(invoice.amount, req.user.id);
    }
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1, $2, $3, $4, $5)').run(uuidv4(), req.user.id, 'Payment Received', `Payment of ₹${invoice.amount} for ${invoice.invoice_no} received successfully.`, 'success');
    logActivity(req.user.id, null, 'payment', `Payment received: ${invoice.invoice_no}, Amount: ${invoice.amount}, Method: ${methodName}`);
    res.json({ success: true, payment_id: paymentId, invoice_no: invoice.invoice_no, amount: invoice.amount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/dashboard', auth, async (req, res) => {
  const userId = req.user.id;
  const activeServices = (await db.prepare("SELECT COUNT(*) as count FROM services WHERE user_id = $1 AND status = 'active'").get(userId)) || { count: 0 };
  const unpaidInvoices = (await db.prepare("SELECT COUNT(*) as count FROM invoices WHERE user_id = $1 AND status = 'unpaid'").get(userId)) || { count: 0 };
  const openTickets = (await db.prepare("SELECT COUNT(*) as count FROM tickets WHERE user_id = $1 AND status = 'open'").get(userId)) || { count: 0 };
  const totalOrders = (await db.prepare('SELECT COUNT(*) as count FROM orders WHERE user_id = $1').get(userId)) || { count: 0 };
  const recentInvoices = await db.prepare('SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5').all(userId);
  const recentServices = await db.prepare('SELECT s.*, p.name as product_name FROM services s LEFT JOIN products p ON s.product_id = p.id WHERE s.user_id = $1 ORDER BY s.created_at DESC LIMIT 5').all(userId);
  const recentTickets = await db.prepare('SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5').all(userId);
  const recentOrders = await db.prepare('SELECT o.*, p.name as product_name FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.user_id = $1 ORDER BY o.created_at DESC LIMIT 5').all(userId);
  const userWhmcs = await db.prepare('SELECT whmcs_client_id FROM users WHERE id = $1').get(userId);
  res.json({ stats: { activeServices: activeServices.count, unpaidInvoices: unpaidInvoices.count, openTickets: openTickets.count, totalOrders: totalOrders.count }, recentInvoices, recentServices, recentTickets, recentOrders, whmcs_client_id: userWhmcs?.whmcs_client_id || null });
});

app.get('/api/dashboard/charts', auth, async (req, res) => {
  const userId = req.user.id;
  const monthlyInvoices = await db.prepare(`
    SELECT TO_CHAR(created_at, 'Mon') as month, EXTRACT(MONTH from created_at) as m, EXTRACT(YEAR from created_at) as y, SUM(amount) as revenue, COUNT(*) as count
    FROM invoices WHERE user_id = $1 AND created_at > NOW() - INTERVAL '6 months'
    GROUP BY y, m, month ORDER BY y, m
  `).all(userId);
  const serviceHistory = await db.prepare(`
    SELECT TO_CHAR(created_at, 'Mon') as month, EXTRACT(MONTH from created_at) as m, EXTRACT(YEAR from created_at) as y, COUNT(*) as count
    FROM services WHERE user_id = $1 AND created_at > NOW() - INTERVAL '6 months'
    GROUP BY y, m, month ORDER BY y, m
  `).all(userId);
  res.json({ monthlyInvoices, serviceHistory });
});

app.get('/api/tickets', auth, async (req, res) => {
  res.json(await db.prepare('SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC').all(req.user.id));
});

app.post('/api/tickets', auth, async (req, res) => {
  const { subject, department, priority, service_id, message } = req.body;
  const id = uuidv4();
  await db.prepare('INSERT INTO tickets (id, user_id, subject, department, priority, status, service_id) VALUES ($1, $2, $3, $4, $5, $6, $7)').run(id, req.user.id, subject, department || 'Support', priority || 'low', 'open', service_id || null);
  if (message) await db.prepare('INSERT INTO ticket_replies (id, ticket_id, user_id, message) VALUES ($1, $2, $3, $4)').run(uuidv4(), id, req.user.id, message);
  res.json(await db.prepare('SELECT * FROM tickets WHERE id = $1').get(id));
});

app.get('/api/tickets/:id', auth, async (req, res) => {
  let ticket;
  if (req.user.role === 'admin') {
    ticket = await db.prepare('SELECT * FROM tickets WHERE id = $1').get(req.params.id);
  } else {
    ticket = await db.prepare('SELECT * FROM tickets WHERE id = $1 AND user_id = $2').get(req.params.id, req.user.id);
  }
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const replies = await db.prepare('SELECT tr.*, u.name as user_name FROM ticket_replies tr LEFT JOIN users u ON tr.user_id = u.id WHERE tr.ticket_id = $1 ORDER BY tr.created_at').all(req.params.id);
  res.json({ ...ticket, replies });
});

app.post('/api/tickets/:id/reply', auth, async (req, res) => {
  const isStaff = req.user.role === 'admin' ? 1 : 0;
  await db.prepare('INSERT INTO ticket_replies (id, ticket_id, user_id, message, is_staff) VALUES ($1, $2, $3, $4, $5)').run(uuidv4(), req.params.id, req.user.id, req.body.message, isStaff);
  await db.prepare('UPDATE tickets SET status = $1, updated_at = $2 WHERE id = $3').run('awaiting_reply', new Date().toISOString(), req.params.id);
  res.json({ success: true });
});

app.post('/api/tickets/:id/close', auth, async (req, res) => {
  if (req.user.role === 'admin') {
    await db.prepare('UPDATE tickets SET status = $1, updated_at = $2 WHERE id = $3').run('closed', new Date().toISOString(), req.params.id);
  } else {
    await db.prepare('UPDATE tickets SET status = $1, updated_at = $2 WHERE id = $3 AND user_id = $4').run('closed', new Date().toISOString(), req.params.id, req.user.id);
  }
  res.json({ success: true });
});

app.put('/api/profile', auth, async (req, res) => {
  const { name, phone, address, city, state } = req.body;
  await db.prepare('UPDATE users SET name = $1, phone = $2, address = $3, city = $4, state = $5, updated_at = $6 WHERE id = $7').run(name, phone, address, city, state, new Date().toISOString(), req.user.id);
  res.json({ success: true });
});

app.put('/api/profile/password', auth, async (req, res) => {
  const { current, newpass } = req.body;
  const user = await db.prepare('SELECT * FROM users WHERE id = $1').get(req.user.id);
  if (!(await bcrypt.compare(current, user.password))) return res.status(400).json({ error: 'Current password incorrect' });
  await db.prepare('UPDATE users SET password = $1, updated_at = $2 WHERE id = $3').run(await bcrypt.hash(newpass, 10), new Date().toISOString(), req.user.id);
  res.json({ success: true });
});

app.get('/api/profile/2fa/status', auth, async (req, res) => {
  const user = await db.prepare('SELECT totp_enabled FROM users WHERE id = $1').get(req.user.id);
  res.json({ enabled: !!user?.totp_enabled });
});

app.post('/api/profile/2fa/setup', auth, async (req, res) => {
  const speakeasy = require('speakeasy');
  const qrcode = require('qrcode');
  const secret = speakeasy.generateSecret({ name: 'Royal Devlopments (' + req.user.email + ')' });
  const qr = await qrcode.toDataURL(secret.otpauth_url);
  await db.prepare('UPDATE users SET totp_secret = $1, updated_at = $2 WHERE id = $3').run(secret.base32, new Date().toISOString(), req.user.id);
  const recoverCodes = [];
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(6).toString('hex').toUpperCase();
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    await db.prepare('INSERT INTO recovery_codes (id, user_id, code_hash) VALUES ($1, $2, $3)').run(uuidv4(), req.user.id, hash);
    recoverCodes.push(code);
  }
  res.json({ secret: secret.base32, qr, recovery_codes: recoverCodes });
});

app.post('/api/profile/2fa/verify', auth, async (req, res) => {
  const speakeasy = require('speakeasy');
  const { token } = req.body;
  const user = await db.prepare('SELECT * FROM users WHERE id = $1').get(req.user.id);
  if (!user?.totp_secret) return res.status(400).json({ error: '2FA not set up' });
  const verified = speakeasy.totp.verify({ secret: user.totp_secret, encoding: 'base32', token });
  if (!verified) return res.status(400).json({ error: 'Invalid code' });
  await db.prepare('UPDATE users SET totp_enabled = $1, updated_at = $2 WHERE id = $3').run(true, new Date().toISOString(), req.user.id);
  res.json({ success: true });
});

app.post('/api/profile/2fa/disable', auth, async (req, res) => {
  const speakeasy = require('speakeasy');
  const { token, password } = req.body;
  const user = await db.prepare('SELECT * FROM users WHERE id = $1').get(req.user.id);
  if (token) {
    const verified = speakeasy.totp.verify({ secret: user.totp_secret, encoding: 'base32', token });
    if (!verified) return res.status(400).json({ error: 'Invalid code' });
  } else if (password) {
    if (!(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: 'Password incorrect' });
  } else {
    return res.status(400).json({ error: 'Token or password required' });
  }
  await db.prepare("UPDATE users SET totp_secret = NULL, totp_enabled = FALSE, updated_at = $1 WHERE id = $2").run(new Date().toISOString(), req.user.id);
  res.json({ success: true });
});

app.post('/api/profile/2fa/recovery-codes', auth, async (req, res) => {
  await db.prepare('UPDATE recovery_codes SET used = 1 WHERE user_id = $1 AND used = 0').run(req.user.id);
  const codes = [];
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(6).toString('hex').toUpperCase();
    const hash = crypto.createHash('sha256').update(code).digest('hex');
    await db.prepare('INSERT INTO recovery_codes (id, user_id, code_hash) VALUES ($1, $2, $3)').run(uuidv4(), req.user.id, hash);
    codes.push(code);
  }
  res.json({ recovery_codes: codes });
});

// Notification preferences
app.get('/api/notification-preferences', auth, async (req, res) => {
  let prefs = await db.prepare('SELECT * FROM notification_preferences WHERE user_id = $1').get(req.user.id);
  if (!prefs) {
    const id = uuidv4();
    await db.prepare('INSERT INTO notification_preferences (id, user_id) VALUES ($1, $2)').run(id, req.user.id);
    prefs = { id, user_id: req.user.id, invoice_emails: 1, support_emails: 1, marketing_emails: 1, service_emails: 1 };
  }
  res.json(prefs);
});

app.put('/api/notification-preferences', auth, async (req, res) => {
  const { invoice_emails, support_emails, marketing_emails, service_emails } = req.body;
  const existing = await db.prepare('SELECT id FROM notification_preferences WHERE user_id = $1').get(req.user.id);
  if (!existing) {
    const id = uuidv4();
    await db.prepare('INSERT INTO notification_preferences (id, user_id, invoice_emails, support_emails, marketing_emails, service_emails) VALUES ($1, $2, $3, $4, $5, $6)').run(id, req.user.id, invoice_emails ?? 1, support_emails ?? 1, marketing_emails ?? 1, service_emails ?? 1);
  } else {
    await db.prepare('UPDATE notification_preferences SET invoice_emails = $1, support_emails = $2, marketing_emails = $3, service_emails = $4 WHERE user_id = $5').run(invoice_emails ?? 1, support_emails ?? 1, marketing_emails ?? 1, service_emails ?? 1, req.user.id);
  }
  const prefs = await db.prepare('SELECT * FROM notification_preferences WHERE user_id = $1').get(req.user.id);
  res.json(prefs);
});

app.get('/api/activity', auth, async (req, res) => {
  const logs = await db.prepare('SELECT id, action, details, created_at FROM activity_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json(logs);
});

app.get('/api/notifications', auth, async (req, res) => {
  const notifications = await db.prepare('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20').all(req.user.id);
  const unread = await db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = $2').get(req.user.id, 0);
  res.json({ notifications, unread: unread?.count || 0 });
});

app.post('/api/notifications/read', auth, async (req, res) => {
  await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = $1').run(req.user.id);
  res.json({ success: true });
});

app.get('/api/payment-methods', auth, async (req, res) => {
  res.json(await db.prepare('SELECT * FROM payment_methods WHERE user_id = $1').all(req.user.id));
});

app.get('/api/wallet/transactions', auth, async (req, res) => {
  res.json(await db.prepare('SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50').all(req.user.id));
});

app.post('/api/wallet/create-topup', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid amount' });
    const orderId = 'TUP-' + Date.now();
    await db.prepare('INSERT INTO transactions (id, user_id, type, amount, description, reference) VALUES ($1, $2, $3, $4, $5, $6)').run(orderId, req.user.id, 'pending', amount, 'Wallet Top-Up', 'manual');
    res.json({ key: '', order_id: orderId, amount: Math.round(amount * 100), currency: 'INR', receipt: orderId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/wallet/verify-topup', auth, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id } = req.body;
  const txn = await db.prepare('SELECT * FROM transactions WHERE reference = $1 AND user_id = $2').get(razorpay_order_id, req.user.id);
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });
  await db.prepare('UPDATE transactions SET type = $1, reference = $2 WHERE id = $3').run('credit', razorpay_payment_id, txn.id);
  await db.prepare('UPDATE users SET balance = balance + $1 WHERE id = $2').run(txn.amount, req.user.id);
  const updated = await db.prepare('SELECT balance FROM users WHERE id = $1').get(req.user.id);
  res.json({ success: true, balance: updated.balance });
});

app.post('/api/wallet/manual-topup', auth, async (req, res) => {
  const { amount, method } = req.body;
  if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid amount' });
  const txnId = 'M-' + Date.now();
  await db.prepare('INSERT INTO transactions (id, user_id, type, amount, description, reference) VALUES ($1, $2, $3, $4, $5, $6)').run(txnId, req.user.id, 'credit', amount, `Wallet Top-Up (${method || 'Manual'})`, txnId);
  await db.prepare('UPDATE users SET balance = balance + $1 WHERE id = $2').run(amount, req.user.id);
  const updated = await db.prepare('SELECT balance FROM users WHERE id = $1').get(req.user.id);
  res.json({ success: true, balance: updated.balance });
});

app.get('/api/admin/stats', auth, adminOnly, async (req, res) => {
  const totalUsers = (await db.prepare('SELECT COUNT(*) as count FROM users').get()) || { count: 0 };
  const totalRevenue = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE status = 'paid'").get()) || { total: 0 };
  const pendingServices = (await db.prepare("SELECT COUNT(*) as count FROM services WHERE status = 'pending'").get()) || { count: 0 };
  const openTickets = (await db.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'open'").get()) || { count: 0 };
  res.json({ totalUsers: totalUsers.count, totalRevenue: totalRevenue.total, pendingServices: pendingServices.count, openTickets: openTickets.count });
});

app.get('/api/admin/categories', auth, adminOnly, async (req, res) => {
  res.json(await db.prepare('SELECT * FROM categories ORDER BY sort_order').all());
});

app.get('/api/admin/products', auth, adminOnly, async (req, res) => {
  res.json(await db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.created_at DESC').all());
});

app.delete('/api/admin/categories/:id', auth, adminOnly, async (req, res) => {
  await db.prepare('UPDATE products SET category_id = NULL WHERE category_id = $1').run(req.params.id);
  await db.prepare('DELETE FROM categories WHERE id = $1').run(req.params.id);
  res.json({ success: true });
});

app.delete('/api/admin/products/:id', auth, adminOnly, async (req, res) => {
  await db.prepare('DELETE FROM products WHERE id = $1').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  res.json(await db.prepare('SELECT id, email, name, phone, balance, role, created_at FROM users ORDER BY created_at DESC').all());
});

app.put('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  const { name, email, phone, role, balance } = req.body;
  const user = await db.prepare('SELECT * FROM users WHERE id = $1').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const updates = [];
  const vals = [];
  let idx = 1;
  if (name !== undefined) { updates.push(`name = $${idx++}`); vals.push(name); }
  if (email !== undefined) { updates.push(`email = $${idx++}`); vals.push(email); }
  if (phone !== undefined) { updates.push(`phone = $${idx++}`); vals.push(phone); }
  if (role !== undefined) { updates.push(`role = $${idx++}`); vals.push(role); }
  if (balance !== undefined) { updates.push(`balance = $${idx++}`); vals.push(balance); }
  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
  updates.push(`updated_at = $${idx++}`);
  vals.push(new Date().toISOString());
  vals.push(req.params.id);
  await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`).run(...vals);
  logActivity(req.user.id, req.params.id, 'Updated user', JSON.stringify(req.body));
  res.json({ success: true });
});

app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  const user = await db.prepare('SELECT * FROM users WHERE id = $1').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  await db.prepare('DELETE FROM users WHERE id = $1').run(req.params.id);
  logActivity(req.user.id, req.params.id, 'Deleted user', user.email);
  res.json({ success: true });
});

app.get('/api/admin/orders', auth, adminOnly, async (req, res) => {
  res.json(await db.prepare("SELECT o.*, u.name as user_name, u.email as user_email, p.name as product_name FROM orders o LEFT JOIN users u ON o.user_id = u.id LEFT JOIN products p ON o.product_id = p.id ORDER BY o.created_at DESC").all());
});

app.get('/api/admin/transactions', auth, adminOnly, async (req, res) => {
  res.json(await db.prepare("SELECT t.*, u.name as user_name, u.email as user_email FROM transactions t LEFT JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC").all());
});

app.post('/api/admin/bulk/service-status', auth, adminOnly, async (req, res) => {
  const { ids, status } = req.body;
  if (!ids?.length || !['pending','active','suspended','cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid request' });
  const stmt = await db.prepare('UPDATE services SET status = $1, updated_at = $2 WHERE id = $3');
  for (const id of ids) await stmt.run(status, new Date().toISOString(), id);
  logActivity(req.user.id, null, 'Bulk service status update', `${ids.length} services set to ${status}`);
  res.json({ success: true, count: ids.length });
});

app.post('/api/admin/bulk/invoice-status', auth, adminOnly, async (req, res) => {
  const { ids, status } = req.body;
  if (!ids?.length || !['paid','unpaid','cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid request' });
  const stmt = await db.prepare('UPDATE invoices SET status = $1, updated_at = $2 WHERE id = $3');
  for (const id of ids) await stmt.run(status, new Date().toISOString(), id);
  if (status === 'paid') {
    const actStmt = await db.prepare("UPDATE services SET status = 'active', updated_at = $1 WHERE id IN (SELECT service_id FROM invoices WHERE id = $2)");
    for (const id of ids) await actStmt.run(new Date().toISOString(), id);
  }
  logActivity(req.user.id, null, 'Bulk invoice status update', `${ids.length} invoices set to ${status}`);
  res.json({ success: true, count: ids.length });
});

app.get('/api/admin/export/:type', auth, adminOnly, async (req, res) => {
  const { type } = req.params;
  let rows, fields;
  if (type === 'users') {
    rows = await db.prepare('SELECT id, email, name, phone, balance, role, created_at FROM users ORDER BY created_at DESC').all();
    fields = ['id','email','name','phone','balance','role','created_at'];
  } else if (type === 'services') {
    rows = await db.prepare('SELECT s.id, s.user_id, u.name as user_name, u.email as user_email, p.name as product_name, s.status, s.price, s.created_at FROM services s LEFT JOIN users u ON s.user_id = u.id LEFT JOIN products p ON s.product_id = p.id ORDER BY s.created_at DESC').all();
    fields = ['id','user_id','user_name','user_email','product_name','status','price','created_at'];
  } else if (type === 'invoices') {
    rows = await db.prepare('SELECT i.id, i.invoice_no, i.user_id, u.name as user_name, u.email as user_email, i.amount, i.status, i.payment_method, i.created_at, i.paid_at FROM invoices i LEFT JOIN users u ON i.user_id = u.id ORDER BY i.created_at DESC').all();
    fields = ['id','invoice_no','user_id','user_name','user_email','amount','status','payment_method','created_at','paid_at'];
  } else if (type === 'orders') {
    rows = await db.prepare("SELECT o.*, u.name as user_name, u.email as user_email, p.name as product_name FROM orders o LEFT JOIN users u ON o.user_id = u.id LEFT JOIN products p ON o.product_id = p.id ORDER BY o.created_at DESC").all();
    fields = ['id','user_id','user_name','user_email','product_id','product_name','amount','status','created_at'];
  } else {
    return res.status(400).json({ error: 'Invalid export type' });
  }
  const csv = [fields.join(','), ...rows.map(r => fields.map(f => {
    const v = r[f]; if (v === null || v === undefined) return '';
    const s = String(v); return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(','))].join('\n');
  res.json({ csv, filename: `${type}-${Date.now()}.csv` });
});

app.get('/api/admin/services', auth, adminOnly, async (req, res) => {
  res.json(await db.prepare('SELECT s.*, u.name as user_name, p.name as product_name FROM services s LEFT JOIN users u ON s.user_id = u.id LEFT JOIN products p ON s.product_id = p.id ORDER BY s.created_at DESC').all());
});

app.get('/api/admin/invoices', auth, adminOnly, async (req, res) => {
  res.json(await db.prepare('SELECT i.*, u.name as user_name FROM invoices i LEFT JOIN users u ON i.user_id = u.id ORDER BY i.created_at DESC').all());
});

app.post('/api/admin/invoices/:id/status', auth, adminOnly, async (req, res) => {
  const { status } = req.body;
  if (!['paid', 'unpaid', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  await db.prepare('UPDATE invoices SET status = $1, updated_at = $2 WHERE id = $3').run(status, new Date().toISOString(), req.params.id);
  if (status === 'paid') {
    const invoice = await db.prepare('SELECT * FROM invoices WHERE id = $1').get(req.params.id);
    if (invoice?.service_id) {
      await db.prepare('UPDATE services SET status = $1, updated_at = $2 WHERE id = $3').run('active', new Date().toISOString(), invoice.service_id);
      await db.prepare('UPDATE orders SET status = $1 WHERE service_id = $2').run('active', invoice.service_id);
      await autoProvision(invoice.service_id);
    }
  }
  res.json({ success: true });
});

app.get('/api/admin/tickets', auth, adminOnly, async (req, res) => {
  res.json(await db.prepare('SELECT t.*, u.name as user_name FROM tickets t LEFT JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC').all());
});

app.post('/api/admin/services/status', auth, adminOnly, async (req, res) => {
  const { service_id, status } = req.body;
  await db.prepare('UPDATE services SET status = $1, updated_at = $2 WHERE id = $3').run(status, new Date().toISOString(), service_id);
  res.json({ success: true });
});

app.post('/api/admin/services/deliver', auth, adminOnly, async (req, res) => {
  const { service_id, delivery } = req.body;
  if (delivery) {
    await db.prepare('UPDATE services SET delivery = $1, status = $2, updated_at = $3 WHERE id = $4').run(JSON.stringify(delivery), 'active', new Date().toISOString(), service_id);
  } else {
    await autoProvision(service_id);
  }
  res.json({ success: true });
});

app.post('/api/admin/products', auth, adminOnly, async (req, res) => {
  const { category_id, name, description, price, billing_cycle, features, custom_fields, delivery_fields } = req.body;
  const id = uuidv4();
  await db.prepare('INSERT INTO products (id, category_id, name, description, price, billing_cycle, features, custom_fields, delivery_fields) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)').run(id, category_id, name, description, price, billing_cycle || 'monthly', features || '[]', custom_fields ? JSON.stringify(custom_fields) : '[]', delivery_fields ? JSON.stringify(delivery_fields) : '[]');
  res.json({ id });
});

app.put('/api/admin/products/:id', auth, adminOnly, async (req, res) => {
  const { name, description, price, billing_cycle, features, category_id, custom_fields, delivery_fields } = req.body;
  await db.prepare('UPDATE products SET name=$1, description=$2, price=$3, billing_cycle=$4, features=$5, category_id=$6, custom_fields=$7, delivery_fields=$8 WHERE id=$9').run(name, description, price, billing_cycle || 'monthly', features || '[]', category_id, custom_fields ? JSON.stringify(custom_fields) : '[]', delivery_fields ? JSON.stringify(delivery_fields) : '[]', req.params.id);
  res.json({ success: true });
});

app.post('/api/admin/categories', auth, adminOnly, async (req, res) => {
  const id = uuidv4();
  await db.prepare('INSERT INTO categories (id, name, description, icon, sort_order) VALUES ($1, $2, $3, $4, $5)').run(id, req.body.name, req.body.description, req.body.icon || 'Package', 99);
  res.json({ id });
});

app.get('/api/admin/settings', auth, adminOnly, async (req, res) => {
  const rows = await db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

app.post('/api/admin/settings', auth, adminOnly, async (req, res) => {
  const { key, value } = req.body;
  await db.prepare('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value').run(key, value);
  res.json({ success: true });
});

app.get('/api/admin/activity-log', auth, adminOnly, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const total = (await db.prepare('SELECT COUNT(*) as count FROM activity_log').get()) || { count: 0 };
  const logs = await db.prepare('SELECT a.*, u.name as user_name FROM activity_log a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT $1 OFFSET $2').all(limit, offset);
  res.json({ logs, total: total.count, page, limit });
});

app.get('/api/admin/coupons', auth, adminOnly, async (req, res) => {
  res.json(await db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all());
});

app.post('/api/admin/coupons', auth, adminOnly, async (req, res) => {
  const { code, type, value, min_amount, max_uses, product_ids, expires_at } = req.body;
  const id = uuidv4();
  try {
    await db.prepare('INSERT INTO coupons (id, code, type, value, min_amount, max_uses, product_ids, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)').run(id, code.toUpperCase(), type || 'percentage', value, min_amount || 0, max_uses || 0, JSON.stringify(product_ids || []), expires_at || null);
    logActivity(null, req.user.id, 'coupon_create', `Coupon created: ${code}`);
    res.json({ id });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admin/coupons/:id', auth, adminOnly, async (req, res) => {
  await db.prepare('DELETE FROM coupons WHERE id = $1').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/coupon/validate', async (req, res) => {
  const { code, product_id, amount } = req.body;
  const coupon = await db.prepare("SELECT * FROM coupons WHERE code = $1 AND status = $2 AND (expires_at IS NULL OR expires_at > NOW())").get(code.toUpperCase(), 'active');
  if (!coupon) return res.json({ valid: false, error: 'Invalid or expired coupon' });
  if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) return res.json({ valid: false, error: 'Coupon usage limit reached' });
  if (amount < coupon.min_amount) return res.json({ valid: false, error: `Minimum order amount ₹${coupon.min_amount} required` });
  const productIds = JSON.parse(coupon.product_ids || '[]');
  if (productIds.length > 0 && !productIds.includes(product_id)) return res.json({ valid: false, error: 'Coupon not applicable for this product' });
  let discount = coupon.type === 'percentage' ? Math.round(amount * coupon.value / 100 * 100) / 100 : coupon.value;
  discount = Math.min(discount, amount);
  res.json({ valid: true, discount, type: coupon.type, value: coupon.value, code: coupon.code });
});

app.get('/api/admin/announcements', auth, adminOnly, async (req, res) => {
  res.json(await db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all());
});

app.post('/api/admin/announcements', auth, adminOnly, async (req, res) => {
  const { title, content, status } = req.body;
  const id = uuidv4();
  await db.prepare('INSERT INTO announcements (id, title, content, status) VALUES ($1, $2, $3, $4)').run(id, title, content, status || 'published');
  res.json({ id });
});

app.delete('/api/admin/announcements/:id', auth, adminOnly, async (req, res) => {
  await db.prepare('DELETE FROM announcements WHERE id = $1').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/announcements', async (req, res) => {
  res.json(await db.prepare("SELECT * FROM announcements WHERE status = 'published' ORDER BY created_at DESC").all());
});

app.post('/api/services/:id/cancel', auth, async (req, res) => {
  const { reason, type } = req.body;
  const service = await db.prepare('SELECT * FROM services WHERE id = $1 AND user_id = $2').get(req.params.id, req.user.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  const id = uuidv4();
  await db.prepare('INSERT INTO cancellations (id, user_id, service_id, reason, type) VALUES ($1, $2, $3, $4, $5)').run(id, req.user.id, req.params.id, reason || '', type || 'immediate');
  if (type === 'immediate') await db.prepare('UPDATE services SET status = $1, updated_at = $2 WHERE id = $3').run('cancelled', new Date().toISOString(), req.params.id);
  res.json({ id });
});

app.get('/api/admin/cancellations', auth, adminOnly, async (req, res) => {
  res.json(await db.prepare('SELECT c.*, u.name as user_name, s.name as service_name FROM cancellations c LEFT JOIN users u ON c.user_id = u.id LEFT JOIN services s ON c.service_id = s.id ORDER BY c.created_at DESC').all());
});

app.post('/api/admin/cancellations/:id', auth, adminOnly, async (req, res) => {
  const { status, admin_response } = req.body;
  await db.prepare('UPDATE cancellations SET status = $1, admin_response = $2 WHERE id = $3').run(status, admin_response || '', req.params.id);
  if (status === 'approved') {
    const c = await db.prepare('SELECT service_id FROM cancellations WHERE id = $1').get(req.params.id);
    if (c) await db.prepare('UPDATE services SET status = $1, updated_at = $2 WHERE id = $3').run('cancelled', new Date().toISOString(), c.service_id);
  }
  res.json({ success: true });
});

app.post('/api/services/:id/upgrade', auth, async (req, res) => {
  const { product_id } = req.body;
  const service = await db.prepare('SELECT * FROM services WHERE id = $1 AND user_id = $2').get(req.params.id, req.user.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  const newProduct = await db.prepare('SELECT * FROM products WHERE id = $1 AND status = $2').get(product_id, 'active');
  if (!newProduct) return res.status(404).json({ error: 'Product not found' });
  const cycle = service.billing_cycle || 'monthly';
  const multipliers = { monthly: 1, quarterly: 3, semiannually: 6, annually: 12 };
  const newTotal = newProduct.price * (multipliers[cycle] || 1);
  const diff = newTotal - service.price;
  if (diff <= 0) return res.status(400).json({ error: 'New product must cost more' });
  const invoiceId = uuidv4();
  const invoiceNo = 'UPG-' + Date.now();
  await db.prepare('INSERT INTO invoices (id, user_id, service_id, invoice_no, amount, status, due_date, items) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)').run(invoiceId, req.user.id, req.params.id, invoiceNo, diff, 'unpaid', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), JSON.stringify([{ name: `Upgrade`, description: 'Prorated upgrade', price: diff, qty: 1 }]));
  res.json({ invoice_id: invoiceId, invoice_no: invoiceNo, amount: diff });
});

app.get('/api/referrals', auth, async (req, res) => {
  const stats = (await db.prepare("SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as earnings FROM referrals WHERE referrer_id = $1 AND status = 'paid'").get(req.user.id)) || { count: 0, earnings: 0 };
  const list = await db.prepare('SELECT r.*, u.name as referred_name, u.email as referred_email FROM referrals r LEFT JOIN users u ON r.referred_id = u.id WHERE r.referrer_id = $1 ORDER BY r.created_at DESC').all(req.user.id);
  const user = await db.prepare('SELECT referral_code, referral_earnings FROM users WHERE id = $1').get(req.user.id);
  res.json({ stats: { count: stats.count, earnings: stats.earnings, balance: user?.referral_earnings || 0 }, list, referral_code: user?.referral_code || '' });
});

app.post('/api/referrals/payout', auth, async (req, res) => {
  const user = await db.prepare('SELECT * FROM users WHERE id = $1').get(req.user.id);
  if (!user.referral_earnings || user.referral_earnings < 100) return res.status(400).json({ error: 'Minimum payout is 100' });
  await db.prepare('UPDATE users SET balance = balance + $1, referral_earnings = 0 WHERE id = $2').run(user.referral_earnings, req.user.id);
  await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1, $2, $3, $4, $5)').run(uuidv4(), req.user.id, 'Payout Sent', `₹${user.referral_earnings} added to your wallet`, 'success');
  res.json({ success: true, amount: user.referral_earnings });
});

app.get('/api/admin/email-templates', auth, adminOnly, async (req, res) => {
  res.json(await db.prepare('SELECT * FROM email_templates ORDER BY key').all());
});

app.post('/api/admin/email-templates/:id', auth, adminOnly, async (req, res) => {
  const { subject, body } = req.body;
  await db.prepare('UPDATE email_templates SET subject = $1, body = $2 WHERE id = $3').run(subject, body, req.params.id);
  res.json({ success: true });
});

app.post('/api/tokens', auth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = uuidv4();
  const token = 'rt_' + crypto.randomBytes(32).toString('hex');
  await db.prepare('INSERT INTO api_tokens (id, user_id, name, token) VALUES ($1, $2, $3, $4)').run(id, req.user.id, name, token);
  res.json({ id, name, token });
});

app.get('/api/tokens', auth, async (req, res) => {
  res.json(await db.prepare('SELECT id, name, last_used, created_at FROM api_tokens WHERE user_id = $1 ORDER BY created_at DESC').all(req.user.id));
});

app.delete('/api/tokens/:id', auth, async (req, res) => {
  await db.prepare('DELETE FROM api_tokens WHERE id = $1 AND user_id = $2').run(req.params.id, req.user.id);
  res.json({ success: true });
});

app.get('/api/turnstile-key', async (req, res) => {
  const key = await db.prepare("SELECT value FROM settings WHERE key = 'turnstile_key'").get();
  res.json({ key: key?.value || '' });
});

app.get('/api/site-url', async (req, res) => {
  const url = await db.prepare("SELECT value FROM settings WHERE key = 'site_url'").get();
  res.json({ url: url?.value || '' });
});

app.get('/api/currency', async (req, res) => {
  const c = await db.prepare("SELECT value FROM settings WHERE key = 'currency'").get();
  res.json({ currency: c?.value || 'INR' });
});

app.get('/api/tax-info', async (req, res) => {
  const rate = await db.prepare("SELECT value FROM settings WHERE key = 'tax_rate'").get();
  const name = await db.prepare("SELECT value FROM settings WHERE key = 'tax_name'").get();
  res.json({ rate: parseFloat(rate?.value || 0), name: name?.value || 'Tax' });
});

app.get('/api/site-features', async (req, res) => {
  const row = await db.prepare("SELECT value FROM settings WHERE key = 'site_features'").get();
  let features = {};
  try { features = row?.value ? JSON.parse(row.value) : {}; } catch {}
  res.json(features);
});

async function whmcsGetConfig() {
  const rows = await db.prepare("SELECT key, value FROM settings WHERE key IN ('whmcs_url','whmcs_identifier','whmcs_secret')").all();
  const cfg = {};
  for (const r of rows) cfg[r.key] = r.value;
  return {
    url: cfg.whmcs_url || process.env.WHMCS_URL || '',
    identifier: cfg.whmcs_identifier || process.env.WHMCS_IDENTIFIER || '',
    secret: cfg.whmcs_secret || process.env.WHMCS_SECRET || '',
  };
}

async function whmcsApiCall(action, params = {}) {
  const { url, identifier, secret } = await whmcsGetConfig();
  if (!url || !identifier || !secret) return null;
  const body = new URLSearchParams({ action, identifier, secret, responsetype: 'json', ...params });
  try {
    const r = await fetch(`${url}/includes/api.php`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
    return await r.json();
  } catch { return null; }
}

app.get('/api/whmcs/sso', auth, async (req, res) => {
  const cfg = await whmcsGetConfig();
  if (!cfg.url || !cfg.identifier || !cfg.secret) return res.json({ url: null, error: 'WHMCS is not configured. Contact administrator.' });
  const user = await db.prepare('SELECT whmcs_client_id FROM users WHERE id = $1').get(req.user.id);
  if (!user?.whmcs_client_id) return res.json({ url: null, error: 'No WHMCS account linked to your profile.' });
  const sso = await whmcsApiCall('CreateSsoToken', { client_id: user.whmcs_client_id, redirect_url: '' });
  if (sso?.result === 'success' && sso.redirect_url) return res.json({ url: sso.redirect_url });
  res.json({ url: null, error: 'WHMCS SSO unavailable. Try again later.' });
});

app.get('/api/whmcs/domain-check', async (req, res) => {
  const { domain, tld } = req.query;
  if (!domain || !tld) return res.json({ result: 'error', message: 'Missing domain or TLD' });
  const cfg = await whmcsGetConfig();
  if (!cfg.url || !cfg.identifier || !cfg.secret) return res.json({ result: 'error', message: 'WHMCS domain checker is not configured. Contact administrator.' });
  const whois = await whmcsApiCall('DomainWHOIS', { domain, tld });
  if (!whois) return res.json({ result: 'error', message: 'Failed to connect to WHMCS. Try again later.' });
  if (whois.result === 'error') return res.json({ result: 'error', message: whois.message || 'WHMCS lookup failed.' });
  const status = whois.status === 'available' ? 'available' : 'unavailable';
  res.json({ result: 'success', status, message: whois.status === 'available' ? `${domain}${tld} is available!` : `${domain}${tld} is already registered` });
});

app.get('/api/whmcs/domain-suggestions', async (req, res) => {
  const cfg = await whmcsGetConfig();
  if (!cfg.url || !cfg.identifier || !cfg.secret) return res.json({ tlds: [], error: 'WHMCS is not configured. Contact administrator.' });
  const pricing = await whmcsApiCall('GetTLDPricing');
  if (!pricing) return res.json({ tlds: [], error: 'Failed to connect to WHMCS for pricing.' });
  if (pricing.result === 'error') return res.json({ tlds: [], error: pricing.message || 'Failed to fetch TLD pricing.' });
  if (pricing.pricing) {
    const tlds = Object.entries(pricing.pricing).map(([tld, p]) => ({
      tld: `.${tld.replace(/^\./, '')}`, price: parseInt(p.register?.replace(/[^0-9]/g, '')) || 899,
      renew: parseInt(p.renew?.replace(/[^0-9]/g, '')) || 999,
      register: true, transfer: true
    }));
    return res.json({ tlds, source: 'whmcs' });
  }
  res.json({ tlds: [], error: 'No TLD pricing data available from WHMCS.' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function oauthGetSettings() {
  const rows = await db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  for (const r of rows) s[r.key] = r.value;
  return s;
}

async function oauthFindOrCreateUser(profile) {
  const email = profile.email;
  if (!email) return null;
  let user = await db.prepare('SELECT * FROM users WHERE email = $1').get(email);
  if (!user) {
    const id = uuidv4();
    const hashed = await bcrypt.hash(uuidv4(), 10);
    const referralCode = 'ROYAL' + Math.random().toString(36).slice(2, 8).toUpperCase();
    await db.prepare('INSERT INTO users (id, name, email, password, role, referral_code) VALUES ($1, $2, $3, $4, $5, $6)').run(id, profile.name || email.split('@')[0], email, hashed, 'customer', referralCode);
    user = await db.prepare('SELECT * FROM users WHERE id = $1').get(id);
  }
  return user;
}

async function oauthFindOrCreateUserAsync(profile, provider) {
  return oauthFindOrCreateUser(profile);
}

// Google OAuth
app.get('/api/auth/google', async (req, res) => {
  try {
    const s = await oauthGetSettings();
    const clientId = s.google_client_id;
    if (!clientId) return res.redirect('/devlopment/login?error=Google+login+not+configured');
    const redirectUri = `${req.protocol}://${req.get('host')}/devlopment/api/auth/google/callback`;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email%20profile`;
    res.redirect(url);
  } catch (e) {
    res.redirect('/devlopment/login?error=Google+login+failed');
  }
});

app.get('/api/auth/google/callback', async (req, res) => {
  try {
    const s = await oauthGetSettings();
    const { code } = req.query;
    if (!code) return res.redirect('/devlopment/login?error=No+code+received');
    const redirectUri = `${req.protocol}://${req.get('host')}/devlopment/api/auth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: s.google_client_id,
        client_secret: s.google_client_secret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    const { access_token } = tokenData;
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profile = await profileRes.json();
    const user = await oauthFindOrCreateUser({ email: profile.email, name: profile.name });
    if (!user) return res.redirect('/devlopment/login?error=Email+required');
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.redirect(`/devlopment/login?token=${token}`);
  } catch (e) {
    res.redirect('/devlopment/login?error=Google+login+failed');
  }
});

// Discord OAuth
app.get('/api/auth/discord', async (req, res) => {
  try {
    const s = await oauthGetSettings();
    const clientId = s.discord_client_id;
    if (!clientId) return res.redirect('/devlopment/login?error=Discord+login+not+configured');
    const redirectUri = `${req.protocol}://${req.get('host')}/devlopment/api/auth/discord/callback`;
    const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email`;
    res.redirect(url);
  } catch (e) {
    res.redirect('/devlopment/login?error=Discord+login+failed');
  }
});

app.get('/api/auth/discord/callback', async (req, res) => {
  try {
    const s = await oauthGetSettings();
    const { code } = req.query;
    if (!code) return res.redirect('/devlopment/login?error=No+code+received');
    const redirectUri = `${req.protocol}://${req.get('host')}/devlopment/api/auth/discord/callback`;
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: s.discord_client_id,
        client_secret: s.discord_client_secret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });
    const tokenData = await tokenRes.json();
    const { access_token } = tokenData;
    const profileRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profile = await profileRes.json();
    const user = await oauthFindOrCreateUser({ email: profile.email, name: profile.global_name || profile.username });
    if (!user) return res.redirect('/devlopment/login?error=Email+required');
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.redirect(`/devlopment/login?token=${token}`);
  } catch (e) {
    res.redirect('/devlopment/login?error=Discord+login+failed');
  }
});

// === Payment Routes ===

async function getRzKey() {
  const r = await db.prepare("SELECT value FROM settings WHERE key = 'rz_key_id'").get();
  return r?.value || process.env.RZ_KEY_ID || '';
}

async function getRzSecret() {
  const r = await db.prepare("SELECT value FROM settings WHERE key = 'rz_key_secret'").get();
  return r?.value || process.env.RZ_KEY_SECRET || '';
}

async function getCfClientId() {
  const r = await db.prepare("SELECT value FROM settings WHERE key = 'cf_client_id'").get();
  return r?.value || process.env.CF_CLIENT_ID || '';
}

async function getCfClientSecret() {
  const r = await db.prepare("SELECT value FROM settings WHERE key = 'cf_client_secret'").get();
  return r?.value || process.env.CF_CLIENT_SECRET || '';
}

async function isCfTestMode() {
  const r = await db.prepare("SELECT value FROM settings WHERE key = 'cf_test_mode'").get();
  return r?.value !== 'false';
}

function rzBasicAuth(key, secret) {
  return 'Basic ' + Buffer.from(key + ':' + secret).toString('base64');
}

async function markInvoicePaid(invoiceId, paymentRef, method) {
  const invoice = await db.prepare('SELECT * FROM invoices WHERE id = $1').get(invoiceId);
  if (!invoice || invoice.status === 'paid') return;
  await db.prepare('UPDATE invoices SET status = $1, paid_at = $2, payment_method = $3, payment_order_id = $4 WHERE id = $5')
    .run('paid', new Date().toISOString(), method, paymentRef, invoiceId);
  if (invoice.service_id) {
    await db.prepare('UPDATE services SET status = $1, updated_at = $2 WHERE id = $3').run('active', new Date().toISOString(), invoice.service_id);
    await db.prepare('UPDATE orders SET status = $1 WHERE service_id = $2').run('active', invoice.service_id);
    await autoProvision(invoice.service_id);
  }
  await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1, $2, $3, $4, $5)')
    .run(uuidv4(), invoice.user_id, 'Payment Received', `₹${invoice.amount} paid for ${invoice.invoice_no}`, 'success');
}

app.post('/api/payment/create-order', auth, async (req, res) => {
  try {
    const { invoice_id } = req.body;
    const invoice = await db.prepare('SELECT * FROM invoices WHERE id = $1 AND user_id = $2').get(invoice_id, req.user.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'paid') return res.json({ paid: true });

    const keyId = await getRzKey();
    const keySecret = await getRzSecret();

    if (!keyId || !keySecret) return res.status(400).json({ error: 'Payment not configured' });

    const rzRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': rzBasicAuth(keyId, keySecret),
      },
      body: JSON.stringify({
        amount: Math.round(invoice.amount * 100),
        currency: 'INR',
        receipt: invoice.invoice_no,
        notes: { invoice_id, user_id: req.user.id },
      }),
    });
    const rzOrder = await rzRes.json();

    await db.prepare('UPDATE invoices SET payment_order_id = $1 WHERE id = $2').run(rzOrder.id, invoice_id);

    const user = await db.prepare('SELECT name, email, phone FROM users WHERE id = $1').get(req.user.id);
    res.json({
      key: keyId,
      order_id: rzOrder.id,
      amount: rzOrder.amount,
      currency: rzOrder.currency,
      receipt: rzOrder.receipt,
      invoice_id,
      name: user?.name || 'Customer',
      email: user?.email || '',
      contact: user?.phone || '',
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Payment creation failed' });
  }
});

app.post('/api/payment/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoice_id } = req.body;
    const keySecret = await getRzSecret();
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
    if (expectedSig !== razorpay_signature) return res.status(400).json({ error: 'Invalid signature' });
    await markInvoicePaid(invoice_id, razorpay_payment_id, 'Razorpay');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/payment/create-cf-order', auth, async (req, res) => {
  try {
    const { invoice_id } = req.body;
    const invoice = await db.prepare('SELECT * FROM invoices WHERE id = $1 AND user_id = $2').get(invoice_id, req.user.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'paid') return res.json({ paid: true });

    const orderId = 'CF-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const clientId = await getCfClientId();
    const clientSecret = await getCfClientSecret();
    const testMode = await isCfTestMode();

    if (clientId && clientSecret) {
      const returnUrl = process.env.CF_RETURN_URL || 'https://royal-web-seven.vercel.app/devlopment/payment/callback';
      const payload = {
        order_id: orderId,
        order_amount: invoice.amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: req.user.id,
          customer_email: req.user.email || 'customer@royaldev.com',
          customer_phone: '9999999999',
        },
        order_meta: { return_url: returnUrl + '?order_id={order_id}', notify_url: '' },
      };
      const baseUrl = testMode ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
      const cfRes = await fetch(`${baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-client-id': clientId,
          'x-client-secret': clientSecret,
        },
        body: JSON.stringify(payload),
      });
      const cfData = await cfRes.json();
      await db.prepare('UPDATE invoices SET payment_order_id = $1 WHERE id = $2').run(orderId, invoice_id);
      res.json({
        payment_link: cfData.payment_link,
        payment_session_id: cfData.payment_session_id,
        order_id: orderId,
        amount: invoice.amount,
      });
    } else {
      await db.prepare('UPDATE invoices SET payment_order_id = $1 WHERE id = $2').run(orderId, invoice_id);
      res.json({ test_mode: true, order_id: orderId, amount: invoice.amount, message: 'Use /api/payment/confirm for test payment.' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/payment/confirm', auth, async (req, res) => {
  try {
    const { invoice_id } = req.body;
    const invoice = await db.prepare('SELECT * FROM invoices WHERE id = $1 AND user_id = $2').get(invoice_id, req.user.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    await markInvoicePaid(invoice_id, 'manual-' + Date.now(), 'Manual');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/payment/cf-webhook', async (req, res) => {
  try {
    const data = req.body?.data?.order || req.body;
    const { order_id, order_status } = data;
    if (order_status === 'PAID' || order_status === 'SUCCESS') {
      const invoice = await db.prepare('SELECT * FROM invoices WHERE payment_order_id = $1').get(order_id);
      if (invoice && invoice.status !== 'paid') {
        await markInvoicePaid(invoice.id, order_id, 'Cashfree');
      }
    }
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// === Chat Routes ===

app.get('/api/chat/messages', async (req, res) => {
  try {
    const { user_id } = req.query;
    if (user_id) {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'No token' });
      try {
        const user = jwt.verify(token, JWT_SECRET);
        if (user.role !== 'admin') {
          const messages = await db.prepare('SELECT * FROM chat_messages WHERE (user_id = $1 OR email = (SELECT email FROM users WHERE id = $1)) ORDER BY created_at ASC').all(user_id);
          return res.json(messages);
        }
      } catch {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }
    const messages = await db.prepare("SELECT * FROM chat_messages WHERE is_read = 0 OR created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at ASC LIMIT 50").all();
    res.json(messages);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/chat/messages', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !message) return res.status(400).json({ error: 'Name and message required' });
    const id = uuidv4();
    let userId = null;
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const user = jwt.verify(token, JWT_SECRET);
        userId = user.id;
      } catch {}
    }
    await db.prepare('INSERT INTO chat_messages (id, user_id, name, email, message) VALUES ($1, $2, $3, $4, $5)').run(id, userId, name, email || null, message);
    const created = await db.prepare('SELECT * FROM chat_messages WHERE id = $1').get(id);
    res.json(created);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/chat/messages/admin', auth, adminOnly, async (req, res) => {
  try {
    const { user_id, email } = req.query;
    if (user_id) {
      const messages = await db.prepare('SELECT * FROM chat_messages WHERE user_id = $1 ORDER BY created_at ASC').all(user_id);
      return res.json(messages);
    }
    if (email) {
      const messages = await db.prepare('SELECT * FROM chat_messages WHERE email = $1 ORDER BY created_at ASC').all(email);
      return res.json(messages);
    }
    const messages = await db.prepare("SELECT * FROM chat_messages WHERE is_read = 0 OR created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at ASC LIMIT 50").all();
    res.json(messages);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/chat/read/:id', auth, adminOnly, async (req, res) => {
  try {
    await db.prepare('UPDATE chat_messages SET is_read = 1 WHERE id = $1').run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/chat/reply', auth, adminOnly, async (req, res) => {
  try {
    const { user_email, message } = req.body;
    if (!user_email || !message) return res.status(400).json({ error: 'user_email and message required' });
    const id = uuidv4();
    await db.prepare('INSERT INTO chat_messages (id, name, email, message, is_admin) VALUES ($1, $2, $3, $4, $5)').run(id, 'Support', user_email, message, 1);
    const created = await db.prepare('SELECT * FROM chat_messages WHERE id = $1').get(id);
    res.json(created);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// === Upload Routes ===
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
const uploadsDir = '/tmp/uploads';
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + path.extname(file.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/upload', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const id = 'upload_' + uuidv4();
  await db.prepare('INSERT INTO uploads (id, user_id, filename, original_name, mime_type, size) VALUES ($1, $2, $3, $4, $5, $6)').run(id, req.user.id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size);
  res.json({ id, url: `/api/uploads/file/${req.file.filename}`, original_name: req.file.originalname });
});

app.get('/api/uploads/:serviceId', auth, async (req, res) => {
  const uploads = await db.prepare('SELECT id, original_name, mime_type, size, created_at, filename FROM uploads WHERE service_id = $1 AND (user_id = $2 OR $3 IN (SELECT id FROM users WHERE role = $4))').all(req.params.serviceId, req.user.id, req.user.id, 'admin');
  res.json(uploads.map(u => ({ ...u, url: `/api/uploads/file/${u.filename}`, filename: undefined })));
});

app.get('/api/uploads/file/:filename', async (req, res) => {
  const filePath = path.join(uploadsDir, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.sendFile(filePath);
});

export const handler = serverless(app);

export default app;
