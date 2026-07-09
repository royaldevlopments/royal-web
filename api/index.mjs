import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import serverless from 'serverless-http';
import db, { ensureSchema } from './lib/db.mjs';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'royal-billing-secret-2026';

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  if (req.path.startsWith('/devlopment/api')) {
    req.url = req.url.replace('/devlopment/api', '/api');
  }
  next();
});

function mailTransport() {
  return null;
}

async function sendMail({ to, subject, html }) {
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

app.post('/api/auth/register', async (req, res) => {
  try {
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
    const { email, password, turnstile_token } = req.body;
    if (!(await verifyTurnstile(turnstile_token))) return res.status(400).json({ error: 'Captcha verification failed' });
    const user = await db.prepare('SELECT * FROM users WHERE email = $1').get(email);
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    logActivity(user.id, null, 'login', `User logged in: ${email}`);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, balance: user.balance, avatar: user.avatar } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', auth, async (req, res) => {
  const user = await db.prepare('SELECT id, email, name, phone, address, city, state, country, avatar, balance, role, created_at, whmcs_client_id FROM users WHERE id = $1').get(req.user.id);
  res.json(user);
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const user = await db.prepare('SELECT id FROM users WHERE email = $1').get(email);
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await db.prepare('UPDATE users SET reset_token = $1, reset_expires = NOW() + INTERVAL \'1 hour\' WHERE id = $2').run(token, user.id);
  }
  res.json({ success: true });
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

app.get('/api/invoices/:id/pdf', auth, async (req, res) => {
  try {
    const PDFDocument = (await import('pdfkit')).default;
    const user = await db.prepare('SELECT * FROM users WHERE id = $1').get(req.user.id);
    const invoice = await db.prepare("SELECT i.*, s.name as service_name FROM invoices i LEFT JOIN services s ON i.service_id = s.id WHERE i.id = $1 AND (i.user_id = $2 OR $3 IN (SELECT id FROM users WHERE role = 'admin'))").get(req.params.id, req.user.id, req.user.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const settings = {};
    (await db.prepare('SELECT key, value FROM settings').all()).forEach(r => settings[r.key] = r.value);
    const currency = settings.currency || 'INR';
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_no || invoice.id}.pdf`);
    doc.pipe(res);
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#1cc4e8').text('ROYAL', { continued: true }).fillColor('#f1f5f9').text(' DEVLOPMENTS');
    doc.moveDown();
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#f1f5f9').text('INVOICE', { align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text(`#${invoice.invoice_no || invoice.id}`, { align: 'right' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#334155').stroke();
    doc.moveDown();
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#f1f5f9').text('Bill To:', 50, doc.y);
    doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text(user.name, 50, doc.y + 15);
    doc.text(user.email, 50, doc.y + 30);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#f1f5f9').text('Status:', 350, doc.y);
    doc.fontSize(10).font('Helvetica').fillColor(invoice.status === 'paid' ? '#22c55e' : '#ef4444').text(invoice.status.toUpperCase(), 430, doc.y + 15);
    doc.moveDown(3);
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#f1f5f9').text(`Total: ${currency} ${invoice.amount}`, { align: 'right' });
    doc.moveDown(4);
    doc.fontSize(8).fillColor('#64748b').text('Thank you for your business!', 50, doc.y, { align: 'center' });
    doc.end();
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

app.get('/api/admin/services', auth, adminOnly, async (req, res) => {
  res.json(await db.prepare('SELECT s.*, u.name as user_name, p.name as product_name FROM services s LEFT JOIN users u ON s.user_id = u.id LEFT JOIN products p ON s.product_id = p.id ORDER BY s.created_at DESC').all());
});

app.get('/api/admin/invoices', auth, adminOnly, async (req, res) => {
  res.json(await db.prepare('SELECT i.*, u.name as user_name FROM invoices i LEFT JOIN users u ON i.user_id = u.id ORDER BY i.created_at DESC').all());
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
  await db.prepare('UPDATE services SET delivery = $1, status = $2, updated_at = $3 WHERE id = $4').run(JSON.stringify(delivery), 'active', new Date().toISOString(), service_id);
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
