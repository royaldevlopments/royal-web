import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import nodemailer from 'nodemailer';
import paymentRoutes from './routes/payment.js';
import oauthRoutes from './routes/oauth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = 'royal-billing-secret-2026';

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Strip /devlopment prefix for cPanel Node.js app routing
app.use('/devlopment', (req, _, next) => { req.url = req.url.replace('/devlopment', ''); next(); });

import db from './config/db.js';
import { whmcsApi, createWhmcsClient, createAutoLoginLink, checkDomain } from './config/whmcs.js';

// ====== MAINTENANCE MODE ======
app.use((req, res, next) => {
  if (req.path === '/api/admin/settings' || req.path === '/api/turnstile-key' || req.path === '/api/site-url') return next();
  const mode = db.prepare("SELECT value FROM settings WHERE key = 'maintenance_mode'").get();
  if (mode?.value === 'true') {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      try {
        const user = jwt.verify(token, JWT_SECRET);
        if (user.role === 'admin') return next();
      } catch {}
    }
    return res.status(503).json({ error: 'Under Maintenance' });
  }
  next();
});

// ====== HELPERS ======

function mailTransport() {
  const url = db.prepare('SELECT value FROM settings WHERE key = ?').get('smtp_url');
  if (!url) return null;
  try { return nodemailer.createTransport(url.value); } catch { return null; }
}

async function sendMail({ to, subject, html }) {
  const transport = mailTransport();
  if (!transport) return;
  const from = db.prepare('SELECT value FROM settings WHERE key = ?').get('smtp_from')?.value || 'noreply@royaldev.com';
  try { await transport.sendMail({ from, to, subject, html }); } catch (e) { console.log('Mail error:', e.message); }
}

function logActivity(userId, adminId, action, details) {

// ====== EMAIL TEMPLATES ======
function renderTemplate(key, vars) {
  const row = db.prepare('SELECT subject, body FROM email_templates WHERE key = ?').get(key);
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
  db.prepare('INSERT INTO activity_log (id, user_id, admin_id, action, details) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), userId, adminId, action, details || '');
}

async function verifyTurnstile(token) {
  const secret = db.prepare("SELECT value FROM settings WHERE key = 'turnstile_secret'").get();
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
  const rate = db.prepare("SELECT value FROM settings WHERE key = 'tax_rate'").get();
  const name = db.prepare("SELECT value FROM settings WHERE key = 'tax_name'").get();
  if (!rate || !rate.value || parseFloat(rate.value) <= 0) return { rate: 0, name: '', amount: 0 };
  return { rate: parseFloat(rate.value), name: name?.value || 'Tax', amount: Math.round(amount * parseFloat(rate.value) / 100 * 100) / 100 };
}

// File upload config
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, '../client/dist')));

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}

// ====== AUTH ======
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, phone, turnstile_token, referral_code } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    
    // Verify Turnstile
    if (!(await verifyTurnstile(turnstile_token))) return res.status(400).json({ error: 'Captcha verification failed. Please try again.' });
    
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const refCode = generateReferralCode();

    // Validate referral
    let referrerId = null;
    if (referral_code) {
      const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referral_code);
      if (referrer) referrerId = referrer.id;
    }

    db.prepare('INSERT INTO users (id, email, password, name, phone, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, email, hashed, name || email.split('@')[0], phone || '', refCode, referrerId);

    // Log activity
    logActivity(id, null, 'register', `User registered: ${email}`);

    // Send welcome email
    sendMail({ to: email, subject: 'Welcome to Royal Billing', html: `<h2>Welcome ${name || email}!</h2><p>Your account has been created successfully.</p>` });
    // Use email template if available
    const welcomeTpl = renderTemplate('welcome', { name: name || email, email });
    if (welcomeTpl) sendMail({ to: email, subject: welcomeTpl.subject, html: welcomeTpl.body });

    // Sync to WHMCS (non-blocking)
    createWhmcsClient({ id, email, name: name || email.split('@')[0], plainPassword: password }).then(whmcsRes => {
      if (whmcsRes.result === 'success' && whmcsRes.clientid) {
        db.prepare('UPDATE users SET whmcs_client_id = ? WHERE id = ?').run(String(whmcsRes.clientid), id);
      }
    });

    const token = jwt.sign({ id, email, role: 'client' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, email, name: name || email.split('@')[0], role: 'client', balance: 0, referral_code: refCode } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, turnstile_token } = req.body;
    if (!(await verifyTurnstile(turnstile_token))) return res.status(400).json({ error: 'Captcha verification failed. Please try again.' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    logActivity(user.id, null, 'login', `User logged in: ${email}`);
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, balance: user.balance, avatar: user.avatar } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = db.prepare('SELECT id, email, name, phone, address, city, state, country, avatar, balance, role, created_at, whmcs_client_id FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// ====== PRODUCTS & CATEGORIES ======
app.get('/api/categories', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY sort_order').all());
});

app.get('/api/products', (req, res) => {
  const { category } = req.query;
  if (category) return res.json(db.prepare('SELECT * FROM products WHERE category_id = ? AND status = ?').all(category, 'active'));
  res.json(db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = ? ORDER BY p.created_at DESC').all('active'));
});

// ====== ORDER FLOW ======
// Step 1: Get product details for ordering
app.get('/api/order/configure/:productId', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND status = ?').get(req.params.productId, 'active');
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// Step 2: Create order (cart → checkout)
app.post('/api/order/place', auth, (req, res) => {
  const { product_id, billing_cycle, custom_data, coupon_code } = req.body;
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND status = ?').get(product_id, 'active');
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const cycle = billing_cycle || product.billing_cycle || 'monthly';
  const multipliers = { monthly: 1, quarterly: 3, semiannually: 6, annually: 12 };
  const multiplier = multipliers[cycle] || 1;
  let total = product.price * multiplier;

  // Apply coupon
  let couponApplied = null;
  if (coupon_code) {
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? AND status = ? AND (expires_at IS NULL OR expires_at > datetime(\'now\'))').get(coupon_code, 'active');
    if (coupon && (coupon.max_uses === 0 || coupon.used_count < coupon.max_uses) && total >= coupon.min_amount) {
      const productIds = JSON.parse(coupon.product_ids || '[]');
      if (productIds.length === 0 || productIds.includes(product_id)) {
        if (coupon.type === 'percentage') total = Math.round(total * (100 - coupon.value) / 100 * 100) / 100;
        else total = Math.max(0, total - coupon.value);
        db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(coupon.id);
        couponApplied = coupon.code;
      }
    }
  }

  // Apply tax
  const tax = calcTax(total);
  const totalWithTax = Math.round((total + tax.amount) * 100) / 100;

  const serviceId = uuidv4();
  const orderId = uuidv4();
  const invoiceId = uuidv4();
  const invoiceNo = 'INV-' + Date.now();
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const features = product.features || '[]';
  const customData = custom_data ? JSON.stringify(custom_data) : '{}';

  db.prepare('INSERT INTO services (id, user_id, product_id, name, price, billing_cycle, status, custom_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(serviceId, req.user.id, product_id, product.name, totalWithTax, cycle, 'pending', customData);
  db.prepare('INSERT INTO orders (id, user_id, product_id, service_id, amount, status) VALUES (?, ?, ?, ?, ?, ?)').run(orderId, req.user.id, product_id, serviceId, totalWithTax, 'pending');

  // Link uploaded files to service
  if (custom_data) {
    const fileIds = [];
    for (const [, val] of Object.entries(custom_data)) {
      if (typeof val === 'string' && val.startsWith('upload_')) fileIds.push(val);
    }
    for (const fid of fileIds) {
      try { db.prepare('UPDATE uploads SET service_id = ? WHERE id = ? AND user_id = ?').run(serviceId, fid, req.user.id); } catch {}
    }
  }

  const items = JSON.stringify([{ name: product.name, description: product.description, price: totalWithTax, qty: 1, cycle, features, tax: tax.amount, coupon: couponApplied }]);
  db.prepare('INSERT INTO invoices (id, user_id, service_id, invoice_no, amount, status, due_date, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(invoiceId, req.user.id, serviceId, invoiceNo, totalWithTax, 'unpaid', dueDate, items);
  
  // Notification
  db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), req.user.id, 'Order Placed', `Your order for ${product.name} has been placed. Invoice: ${invoiceNo}`, 'info');

  // Log activity
  logActivity(req.user.id, null, 'order', `Order placed: ${product.name}, Invoice: ${invoiceNo}, Amount: ${totalWithTax}`);

  // Send email
  sendMail({ to: req.user.email, subject: 'Order Confirmed - Royal Billing', html: `<h2>Order Confirmed!</h2><p>Your order for <strong>${product.name}</strong> has been placed.</p><p>Invoice: ${invoiceNo}<br>Amount: ₹${totalWithTax}<br>Due: ${new Date(dueDate).toLocaleDateString()}</p>` });
  const orderTpl = renderTemplate('order_confirmed', { name: req.user.name, email: req.user.email, product_name: product.name, invoice_no: invoiceNo, amount: `₹${totalWithTax}`, due_date: new Date(dueDate).toLocaleDateString() });
  if (orderTpl) sendMail({ to: req.user.email, subject: orderTpl.subject, html: orderTpl.body });

  res.json({ service_id: serviceId, order_id: orderId, invoice_id: invoiceId, invoice_no: invoiceNo, amount: totalWithTax });
});

// File upload
app.post('/api/upload', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const id = 'upload_' + uuidv4();
  db.prepare('INSERT INTO uploads (id, user_id, filename, original_name, mime_type, size) VALUES (?, ?, ?, ?, ?, ?)').run(id, req.user.id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size);
  res.json({ id, url: `/uploads/${req.file.filename}`, original_name: req.file.originalname });
});

// Get uploads for a service
app.get('/api/uploads/:serviceId', auth, (req, res) => {
  const uploads = db.prepare('SELECT id, original_name, mime_type, size, created_at FROM uploads WHERE service_id = ? AND (user_id = ? OR ? IN (SELECT id FROM users WHERE role = ?))').all(req.params.serviceId, req.user.id, req.user.id, 'admin');
  res.json(uploads.map(u => ({ ...u, url: `/uploads/${u.filename}` })));
});

// ====== SERVICES ======
app.get('/api/services', auth, (req, res) => {
  res.json(db.prepare('SELECT s.*, p.name as product_name, p.description as product_description FROM services s LEFT JOIN products p ON s.product_id = p.id WHERE s.user_id = ? ORDER BY s.created_at DESC').all(req.user.id));
});

app.get('/api/services/:id', auth, (req, res) => {
  const service = db.prepare('SELECT s.*, p.name as product_name, p.description as product_description, p.features, p.custom_fields as product_custom_fields, p.delivery_fields as product_delivery_fields FROM services s LEFT JOIN products p ON s.product_id = p.id WHERE s.id = ? AND s.user_id = ?').get(req.params.id, req.user.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  const invoices = db.prepare('SELECT * FROM invoices WHERE service_id = ? ORDER BY created_at DESC').all(req.params.id);
  const uploadRecords = service.custom_data ? (() => {
    const cd = JSON.parse(service.custom_data);
    const uploadIds = Object.values(cd).filter(v => typeof v === 'string' && v.startsWith('upload_'));
    if (uploadIds.length === 0) return [];
    const placeholders = uploadIds.map(() => '?').join(',');
    return db.prepare(`SELECT * FROM uploads WHERE id IN (${placeholders})`).all(...uploadIds);
  })() : [];
  // Also fetch uploads linked via delivery
  const deliveryUploads = service.delivery ? (() => {
    const d = typeof service.delivery === 'string' ? JSON.parse(service.delivery) : service.delivery;
    const uploadIds = Object.values(d).filter(v => typeof v === 'string' && v.startsWith('upload_'));
    if (uploadIds.length === 0) return [];
    const placeholders = uploadIds.map(() => '?').join(',');
    return db.prepare(`SELECT * FROM uploads WHERE id IN (${placeholders})`).all(...uploadIds);
  })() : [];
  res.json({ ...service, invoices, uploads: [...uploadRecords, ...deliveryUploads] });
});

// ====== INVOICES ======
app.get('/api/invoices', auth, (req, res) => {
  res.json(db.prepare('SELECT i.*, s.name as service_name FROM invoices i LEFT JOIN services s ON i.service_id = s.id WHERE i.user_id = ? ORDER BY i.created_at DESC').all(req.user.id));
});

app.get('/api/invoices/:id', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const invoice = db.prepare('SELECT i.*, s.name as service_name FROM invoices i LEFT JOIN services s ON i.service_id = s.id WHERE i.id = ? AND i.user_id = ?').get(req.params.id, req.user.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ ...invoice, user });
});

// ====== INVOICE PDF ======
app.get('/api/invoices/:id/pdf', auth, async (req, res) => {
  try {
    const PDFDocument = (await import('pdfkit')).default;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    const invoice = db.prepare('SELECT i.*, s.name as service_name FROM invoices i LEFT JOIN services s ON i.service_id = s.id WHERE i.id = ? AND (i.user_id = ? OR ? IN (SELECT id FROM users WHERE role = ?))').get(req.params.id, req.user.id, req.user.id, 'admin');
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const settings = {};
    db.prepare('SELECT key, value FROM settings').all().forEach(r => settings[r.key] = r.value);
    const currency = settings.currency || 'INR';
    const taxName = settings.tax_name || 'GST';

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_no || invoice.id}.pdf`);
    doc.pipe(res);

    doc.fontSize(24).font('Helvetica-Bold').fillColor('#1cc4e8').text('ROYAL', { continued: true }).fillColor('#f1f5f9').text(' DEVLOPMENTS');
    doc.fontSize(8).fillColor('#1cc4e8').text('BUILDING SOLUTIONS POWER FUTURE', { width: 200 });
    doc.moveDown();

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#f1f5f9').text('INVOICE', { align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text(`#${invoice.invoice_no || invoice.id}`, { align: 'right' });
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#334155').stroke();
    doc.moveDown();

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#f1f5f9').text('Bill To:', 50, doc.y);
    doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text(user.name, 50, doc.y + 15);
    doc.text(user.email, 50, doc.y + 30);
    doc.text(user.address || '', 50, doc.y + 15);

    const rightX = 350;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#f1f5f9').text('Invoice Date:', rightX, doc.y - 58);
    doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text(new Date(invoice.created_at).toLocaleDateString(), rightX + 80, doc.y - 15);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#f1f5f9').text('Status:', rightX, doc.y);
    doc.fontSize(10).font('Helvetica').fillColor(invoice.status === 'paid' ? '#22c55e' : '#ef4444').text(invoice.status.toUpperCase(), rightX + 80, doc.y + 15);

    doc.moveDown(2);
    const tableTop = doc.y;
    const headers = ['Description', 'Amount'];
    const colWidth = [400, 100];
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#f1f5f9');
    doc.text(headers[0], 50, tableTop, { width: colWidth[0] });
    doc.text(headers[1], 450, tableTop, { width: colWidth[1], align: 'right' });
    doc.moveTo(50, doc.y + 5).lineTo(545, doc.y + 5).strokeColor('#334155').stroke();

    doc.fontSize(10).font('Helvetica').fillColor('#94a3b8');
    doc.text(invoice.service_name || 'Service', 50, doc.y + 10, { width: colWidth[0] });
    doc.text(`${currency} ${invoice.amount}`, 450, doc.y - 15, { width: colWidth[1], align: 'right' });

    doc.moveDown(2);
    const totalY = doc.y;
    doc.moveTo(350, totalY).lineTo(545, totalY).strokeColor('#334155').stroke();
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#f1f5f9').text('Total:', 350, totalY + 5);
    doc.text(`${currency} ${invoice.amount}`, 450, totalY + 5, { width: colWidth[1], align: 'right' });
    if (invoice.tax_amount) {
      doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text(`${taxName}:`, 350, doc.y + 5);
      doc.text(`${currency} ${invoice.tax_amount}`, 450, doc.y - 15, { width: colWidth[1], align: 'right' });
    }

    doc.moveDown(4);
    doc.fontSize(8).fillColor('#64748b').text('Thank you for your business!', 50, doc.y, { align: 'center' });
    doc.end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ====== PAYMENT ======
app.post('/api/pay/:invoiceId', auth, async (req, res) => {
  try {
    const { method } = req.body;
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?').get(req.params.invoiceId, req.user.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'paid') return res.json({ success: true, message: 'Already paid' });

    const paymentId = uuidv4();
    const paymentMethods = { cashfree: 'Cashfree', upi: 'UPI', card: 'Card', netbanking: 'Netbanking', wallet: 'Wallet' };
    const methodName = paymentMethods[method] || method;

    // Process payment
    db.prepare('UPDATE invoices SET status = ?, paid_at = ?, payment_method = ? WHERE id = ?').run('paid', new Date().toISOString(), methodName, req.params.invoiceId);
    db.prepare('UPDATE services SET status = ?, updated_at = ? WHERE id = ?').run('active', new Date().toISOString(), invoice.service_id);
    db.prepare('UPDATE orders SET status = ? WHERE service_id = ?').run('active', invoice.service_id);
    // Wallet payment — deduct balance
    if (method === 'wallet') {
      const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
      if (!user || user.balance < invoice.amount) return res.status(400).json({ error: 'Insufficient wallet balance' });
      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(invoice.amount, req.user.id);
    }
    
    db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), req.user.id, 'Payment Received', `Payment of ₹${invoice.amount} for ${invoice.invoice_no} received successfully.`, 'success');

    logActivity(req.user.id, null, 'payment', `Payment received: ${invoice.invoice_no}, Amount: ${invoice.amount}, Method: ${methodName}`);
    sendMail({ to: req.user.email, subject: 'Payment Received - Royal Billing', html: `<h2>Payment Received!</h2><p>Your payment of <strong>₹${invoice.amount}</strong> for ${invoice.invoice_no} has been received successfully.</p>` });
    const payTpl = renderTemplate('payment_received', { name: req.user.name, email: req.user.email, amount: `₹${invoice.amount}`, invoice_no: invoice.invoice_no });
    if (payTpl) sendMail({ to: req.user.email, subject: payTpl.subject, html: payTpl.body });

    res.json({ success: true, payment_id: paymentId, invoice_no: invoice.invoice_no, amount: invoice.amount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ====== DASHBOARD ======
app.get('/api/dashboard', auth, (req, res) => {
  const userId = req.user.id;
  const activeServices = db.prepare('SELECT COUNT(*) as count FROM services WHERE user_id = ? AND status = ?').get(userId, 'active');
  const unpaidInvoices = db.prepare('SELECT COUNT(*) as count FROM invoices WHERE user_id = ? AND status = ?').get(userId, 'unpaid');
  const openTickets = db.prepare('SELECT COUNT(*) as count FROM tickets WHERE user_id = ? AND status = ?').get(userId, 'open');
  const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE user_id = ?').get(userId);
  const recentInvoices = db.prepare('SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(userId);
  const recentServices = db.prepare('SELECT s.*, p.name as product_name FROM services s LEFT JOIN products p ON s.product_id = p.id WHERE s.user_id = ? ORDER BY s.created_at DESC LIMIT 5').all(userId);
  const recentTickets = db.prepare('SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 5').all(userId);
  const recentOrders = db.prepare('SELECT o.*, p.name as product_name FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 5').all(userId);
  const userWhmcs = db.prepare('SELECT whmcs_client_id FROM users WHERE id = ?').get(userId);
  res.json({ stats: { activeServices: activeServices.count, unpaidInvoices: unpaidInvoices.count, openTickets: openTickets.count, totalOrders: totalOrders.count }, recentInvoices, recentServices, recentTickets, recentOrders, whmcs_client_id: userWhmcs?.whmcs_client_id || null });
});

// ====== TICKETS ======
app.get('/api/tickets', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id));
});

app.post('/api/tickets', auth, (req, res) => {
  const { subject, department, priority, service_id, message } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO tickets (id, user_id, subject, department, priority, status, service_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, req.user.id, subject, department || 'Support', priority || 'low', 'open', service_id || null);
  if (message) db.prepare('INSERT INTO ticket_replies (id, ticket_id, user_id, message) VALUES (?, ?, ?, ?)').run(uuidv4(), id, req.user.id, message);
  res.json(db.prepare('SELECT * FROM tickets WHERE id = ?').get(id));
});

app.get('/api/tickets/:id', auth, (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const replies = db.prepare('SELECT tr.*, u.name as user_name FROM ticket_replies tr LEFT JOIN users u ON tr.user_id = u.id WHERE tr.ticket_id = ? ORDER BY tr.created_at').all(req.params.id);
  res.json({ ...ticket, replies });
});

app.post('/api/tickets/:id/reply', auth, (req, res) => {
  db.prepare('INSERT INTO ticket_replies (id, ticket_id, user_id, message) VALUES (?, ?, ?, ?)').run(uuidv4(), req.params.id, req.user.id, req.body.message);
  db.prepare('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?').run('awaiting_reply', new Date().toISOString(), req.params.id);
  res.json({ success: true });
});

app.post('/api/tickets/:id/close', auth, (req, res) => {
  db.prepare('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?').run('closed', new Date().toISOString(), req.params.id, req.user.id);
  res.json({ success: true });
});

// ====== PROFILE ======
app.put('/api/profile', auth, (req, res) => {
  const { name, phone, address, city, state } = req.body;
  db.prepare('UPDATE users SET name = ?, phone = ?, address = ?, city = ?, state = ?, updated_at = ? WHERE id = ?').run(name, phone, address, city, state, new Date().toISOString(), req.user.id);
  res.json({ success: true });
});

app.put('/api/profile/password', auth, async (req, res) => {
  const { current, newpass } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!(await bcrypt.compare(current, user.password))) return res.status(400).json({ error: 'Current password incorrect' });
  db.prepare('UPDATE users SET password = ?, updated_at = ? WHERE id = ?').run(await bcrypt.hash(newpass, 10), new Date().toISOString(), req.user.id);
  res.json({ success: true });
});

// ====== NOTIFICATIONS ======
app.get('/api/notifications', auth, (req, res) => {
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(req.user.id);
  const unread = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = ?').get(req.user.id, 0);
  res.json({ notifications, unread: unread.count });
});

app.post('/api/notifications/read', auth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ success: true });
});

// ====== PAYMENT METHODS ======
app.get('/api/payment-methods', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM payment_methods WHERE user_id = ?').all(req.user.id));
});

// ====== WALLET ======
app.get('/api/wallet/transactions', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id));
});

app.post('/api/wallet/create-topup', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid amount' });
    const [RZ, { default: Razorpay }] = await Promise.all([import('./config/razorpay.js'), import('razorpay')]);
    const rp = new Razorpay({ key_id: RZ.default.keyId, key_secret: RZ.default.keySecret });
    const orderId = 'TUP-' + Date.now();
    const rzOrder = await rp.orders.create({ amount: Math.round(amount * 100), currency: 'INR', receipt: orderId });
    db.prepare('INSERT INTO transactions (id, user_id, type, amount, description, reference) VALUES (?, ?, ?, ?, ?, ?)').run(orderId, req.user.id, 'pending', amount, 'Wallet Top-Up', rzOrder.id);
    res.json({ key: RZ.keyId, order_id: rzOrder.id, amount: rzOrder.amount, currency: rzOrder.currency, receipt: rzOrder.receipt });
  } catch (e) { console.error('TopUp error:', e); res.status(500).json({ error: e.message }); }
});

app.post('/api/wallet/verify-topup', auth, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const RZ = (await import('./config/razorpay.js')).default;
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSig = crypto.createHmac('sha256', RZ.keySecret).update(body).digest('hex');
  if (expectedSig !== razorpay_signature) return res.status(400).json({ error: 'Invalid signature' });
  const txn = db.prepare('SELECT * FROM transactions WHERE reference = ? AND user_id = ?').get(razorpay_order_id, req.user.id);
  if (!txn) return res.status(404).json({ error: 'Transaction not found' });
  db.prepare('UPDATE transactions SET type = ?, reference = ? WHERE id = ?').run('credit', razorpay_payment_id, txn.id);
  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(txn.amount, req.user.id);
  const updated = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, balance: updated.balance });
});

app.post('/api/wallet/manual-topup', auth, (req, res) => {
  const { amount, method } = req.body;
  if (!amount || amount < 1) return res.status(400).json({ error: 'Invalid amount' });
  const txnId = 'M-' + Date.now();
  db.prepare('INSERT INTO transactions (id, user_id, type, amount, description, reference) VALUES (?, ?, ?, ?, ?, ?)').run(txnId, req.user.id, 'credit', amount, `Wallet Top-Up (${method || 'Manual'})`, txnId);
  db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(amount, req.user.id);
  const updated = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id);
  res.json({ success: true, balance: updated.balance });
});

// ====== ADMIN ======
app.get('/api/admin/stats', auth, adminOnly, (req, res) => {
  res.json({
    totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    totalRevenue: db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM invoices WHERE status = ?').get('paid').total,
    pendingServices: db.prepare('SELECT COUNT(*) as count FROM services WHERE status = ?').get('pending').count,
    openTickets: db.prepare('SELECT COUNT(*) as count FROM tickets WHERE status = ?').get('open').count,
  });
});

app.get('/api/admin/categories', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY sort_order').all());
});

app.get('/api/admin/products', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.created_at DESC').all());
});

app.delete('/api/admin/categories/:id', auth, adminOnly, (req, res) => {
  db.prepare('UPDATE products SET category_id = NULL WHERE category_id = ?').run(req.params.id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.delete('/api/admin/products/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/admin/users', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT id, email, name, phone, balance, role, created_at FROM users ORDER BY created_at DESC').all());
});

app.get('/api/admin/services', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT s.*, u.name as user_name, p.name as product_name FROM services s LEFT JOIN users u ON s.user_id = u.id LEFT JOIN products p ON s.product_id = p.id ORDER BY s.created_at DESC').all());
});

app.get('/api/admin/invoices', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT i.*, u.name as user_name FROM invoices i LEFT JOIN users u ON i.user_id = u.id ORDER BY i.created_at DESC').all());
});

app.get('/api/admin/tickets', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT t.*, u.name as user_name FROM tickets t LEFT JOIN users u ON t.user_id = u.id ORDER BY t.created_at DESC').all());
});

app.post('/api/admin/services/status', auth, adminOnly, (req, res) => {
  const { service_id, status } = req.body;
  db.prepare('UPDATE services SET status = ?, updated_at = ? WHERE id = ?').run(status, new Date().toISOString(), service_id);
  res.json({ success: true });
});

app.post('/api/admin/services/deliver', auth, adminOnly, (req, res) => {
  const { service_id, delivery } = req.body;
  db.prepare('UPDATE services SET delivery = ?, status = ?, updated_at = ? WHERE id = ?').run(JSON.stringify(delivery), 'active', new Date().toISOString(), service_id);
  // Link any file uploads in delivery to the service
  if (delivery && typeof delivery === 'object') {
    for (const val of Object.values(delivery)) {
      if (typeof val === 'string' && val.startsWith('upload_')) {
        try { db.prepare('UPDATE uploads SET service_id = ? WHERE id = ?').run(service_id, val); } catch {}
      }
    }
  }
  res.json({ success: true });
});

app.post('/api/admin/products', auth, adminOnly, (req, res) => {
  const { category_id, name, description, price, billing_cycle, features, custom_fields, delivery_fields } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO products (id, category_id, name, description, price, billing_cycle, features, custom_fields, delivery_fields) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, category_id, name, description, price, billing_cycle || 'monthly', features || '[]', custom_fields ? JSON.stringify(custom_fields) : '[]', delivery_fields ? JSON.stringify(delivery_fields) : '[]');
  res.json({ id });
});

app.put('/api/admin/products/:id', auth, adminOnly, (req, res) => {
  const { name, description, price, billing_cycle, features, category_id, custom_fields, delivery_fields } = req.body;
  db.prepare('UPDATE products SET name=?, description=?, price=?, billing_cycle=?, features=?, category_id=?, custom_fields=?, delivery_fields=? WHERE id=?').run(name, description, price, billing_cycle || 'monthly', features || '[]', category_id, custom_fields ? JSON.stringify(custom_fields) : '[]', delivery_fields ? JSON.stringify(delivery_fields) : '[]', req.params.id);
  res.json({ success: true });
});

app.post('/api/admin/categories', auth, adminOnly, (req, res) => {
  const id = uuidv4();
  db.prepare('INSERT INTO categories (id, name, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)').run(id, req.body.name, req.body.description, req.body.icon || 'Package', 99);
  res.json({ id });
});

app.get('/api/admin/settings', auth, adminOnly, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

app.post('/api/admin/settings', auth, adminOnly, (req, res) => {
  const { key, value } = req.body;
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  res.json({ success: true });
});

// ====== ACTIVITY LOG ======
app.get('/api/admin/activity-log', auth, adminOnly, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  const total = db.prepare('SELECT COUNT(*) as count FROM activity_log').get().count;
  const logs = db.prepare('SELECT a.*, u.name as user_name FROM activity_log a LEFT JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
  res.json({ logs, total, page, limit });
});

// ====== COUPONS ======
app.get('/api/admin/coupons', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all());
});

app.post('/api/admin/coupons', auth, adminOnly, (req, res) => {
  const { code, type, value, min_amount, max_uses, product_ids, expires_at } = req.body;
  const id = uuidv4();
  try {
    db.prepare('INSERT INTO coupons (id, code, type, value, min_amount, max_uses, product_ids, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, code.toUpperCase(), type || 'percentage', value, min_amount || 0, max_uses || 0, JSON.stringify(product_ids || []), expires_at || null);
    logActivity(null, req.user.id, 'coupon_create', `Coupon created: ${code}`);
    res.json({ id });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/admin/coupons/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.post('/api/coupon/validate', (req, res) => {
  const { code, product_id, amount } = req.body;
  const coupon = db.prepare("SELECT * FROM coupons WHERE code = ? AND status = ? AND (expires_at IS NULL OR expires_at > datetime('now'))").get(code.toUpperCase(), 'active');
  if (!coupon) return res.json({ valid: false, error: 'Invalid or expired coupon' });
  if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) return res.json({ valid: false, error: 'Coupon usage limit reached' });
  if (amount < coupon.min_amount) return res.json({ valid: false, error: `Minimum order amount ₹${coupon.min_amount} required` });
  const productIds = JSON.parse(coupon.product_ids || '[]');
  if (productIds.length > 0 && !productIds.includes(product_id)) return res.json({ valid: false, error: 'Coupon not applicable for this product' });
  let discount = coupon.type === 'percentage' ? Math.round(amount * coupon.value / 100 * 100) / 100 : coupon.value;
  discount = Math.min(discount, amount);
  res.json({ valid: true, discount, type: coupon.type, value: coupon.value, code: coupon.code });
});

// ====== ANNOUNCEMENTS ======
app.get('/api/admin/announcements', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all());
});

app.post('/api/admin/announcements', auth, adminOnly, (req, res) => {
  const { title, content, status } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO announcements (id, title, content, status) VALUES (?, ?, ?, ?)').run(id, title, content, status || 'published');
  res.json({ id });
});

app.delete('/api/admin/announcements/:id', auth, adminOnly, (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/announcements', (req, res) => {
  res.json(db.prepare("SELECT * FROM announcements WHERE status = 'published' ORDER BY created_at DESC").all());
});

// ====== CANCELLATIONS ======
app.post('/api/services/:id/cancel', auth, (req, res) => {
  const { reason, type } = req.body;
  const service = db.prepare('SELECT * FROM services WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  const id = uuidv4();
  db.prepare('INSERT INTO cancellations (id, user_id, service_id, reason, type) VALUES (?, ?, ?, ?, ?)').run(id, req.user.id, req.params.id, reason || '', type || 'immediate');
  if (type === 'immediate') db.prepare('UPDATE services SET status = ?, updated_at = ? WHERE id = ?').run('cancelled', new Date().toISOString(), req.params.id);
  res.json({ id });
});

app.get('/api/admin/cancellations', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT c.*, u.name as user_name, s.name as service_name FROM cancellations c LEFT JOIN users u ON c.user_id = u.id LEFT JOIN services s ON c.service_id = s.id ORDER BY c.created_at DESC').all());
});

app.post('/api/admin/cancellations/:id', auth, adminOnly, (req, res) => {
  const { status, admin_response } = req.body;
  db.prepare('UPDATE cancellations SET status = ?, admin_response = ? WHERE id = ?').run(status, admin_response || '', req.params.id);
  if (status === 'approved') {
    const c = db.prepare('SELECT service_id FROM cancellations WHERE id = ?').get(req.params.id);
    if (c) db.prepare('UPDATE services SET status = ?, updated_at = ? WHERE id = ?').run('cancelled', new Date().toISOString(), c.service_id);
  }
  res.json({ success: true });
});

// ====== UPGRADE ======
app.post('/api/services/:id/upgrade', auth, (req, res) => {
  const { product_id } = req.body;
  const service = db.prepare('SELECT * FROM services WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  const newProduct = db.prepare('SELECT * FROM products WHERE id = ? AND status = ?').get(product_id, 'active');
  if (!newProduct) return res.status(404).json({ error: 'Product not found' });
  const cycles = ['monthly', 'quarterly', 'semiannually', 'annually'];
  const cycle = service.billing_cycle || 'monthly';
  const multipliers = { monthly: 1, quarterly: 3, semiannually: 6, annually: 12 };
  const newTotal = newProduct.price * (multipliers[cycle] || 1);
  const diff = newTotal - service.price;
  if (diff <= 0) return res.status(400).json({ error: 'New product must cost more' });
  const invoiceId = uuidv4();
  const invoiceNo = 'UPG-' + Date.now();
  const items = JSON.stringify([{ name: `Upgrade: ${service.name} → ${newProduct.name}`, description: 'Prorated upgrade', price: diff, qty: 1 }]);
  db.prepare('INSERT INTO invoices (id, user_id, service_id, invoice_no, amount, status, due_date, items) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(invoiceId, req.user.id, req.params.id, invoiceNo, diff, 'unpaid', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), items);
  res.json({ invoice_id: invoiceId, invoice_no: invoiceNo, amount: diff });
});

// ====== REFERRALS ======
app.get('/api/referrals', auth, (req, res) => {
  const stats = db.prepare('SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as earnings FROM referrals WHERE referrer_id = ? AND status = ?').get(req.user.id, 'paid');
  const list = db.prepare('SELECT r.*, u.name as referred_name, u.email as referred_email FROM referrals r LEFT JOIN users u ON r.referred_id = u.id WHERE r.referrer_id = ? ORDER BY r.created_at DESC').all(req.user.id);
  const user = db.prepare('SELECT referral_code, referral_earnings FROM users WHERE id = ?').get(req.user.id);
  res.json({ stats: { count: stats.count, earnings: stats.earnings, balance: user.referral_earnings }, list, referral_code: user.referral_code });
});

// ====== AFFILIATE PAYOUT ======
app.post('/api/referrals/payout', auth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user.referral_earnings || user.referral_earnings < 100) return res.status(400).json({ error: 'Minimum payout is 100' });
  db.prepare('UPDATE users SET balance = balance + ?, referral_earnings = 0 WHERE id = ?').run(user.referral_earnings, req.user.id);
  db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), req.user.id, 'Payout Sent', `₹${user.referral_earnings} added to your wallet`, 'success');
  res.json({ success: true, amount: user.referral_earnings });
});

// ====== EMAIL TEMPLATES (ADMIN) ======
app.get('/api/admin/email-templates', auth, adminOnly, (req, res) => {
  res.json(db.prepare('SELECT * FROM email_templates ORDER BY key').all());
});

app.post('/api/admin/email-templates/:id', auth, adminOnly, (req, res) => {
  const { subject, body } = req.body;
  db.prepare('UPDATE email_templates SET subject = ?, body = ? WHERE id = ?').run(subject, body, req.params.id);
  res.json({ success: true });
});

// ====== API TOKENS ======
app.post('/api/tokens', auth, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = uuidv4();
  const token = 'rt_' + crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO api_tokens (id, user_id, name, token) VALUES (?, ?, ?, ?)').run(id, req.user.id, name, token);
  res.json({ id, name, token });
});

app.get('/api/tokens', auth, (req, res) => {
  res.json(db.prepare('SELECT id, name, last_used, created_at FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id));
});

app.delete('/api/tokens/:id', auth, (req, res) => {
  db.prepare('DELETE FROM api_tokens WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// ====== AUTO-SUSPEND CRON ======
app.post('/api/cron/suspend', auth, adminOnly, (req, res) => {
  const overdue = db.prepare("SELECT i.*, s.user_id, u.name as user_name FROM invoices i LEFT JOIN services s ON i.service_id = s.id LEFT JOIN users u ON s.user_id = u.id WHERE i.status = ? AND i.due_date < datetime('now') AND s.status = ?").all('unpaid', 'active');
  let suspended = 0;
  for (const inv of overdue) {
    db.prepare('UPDATE services SET status = ?, updated_at = ? WHERE id = ?').run('suspended', new Date().toISOString(), inv.service_id);
    db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), inv.user_id, 'Service Suspended', `Your service has been suspended due to unpaid invoice: ${inv.invoice_no}`, 'warning');
    suspended++;
  }
  res.json({ suspended, total: overdue.length });
});

// ====== TURNSTILE KEY ======
app.get('/api/turnstile-key', (req, res) => {
  const key = db.prepare("SELECT value FROM settings WHERE key = 'turnstile_key'").get();
  res.json({ key: key?.value || '' });
});

// ====== SITE URL ======
app.get('/api/site-url', (req, res) => {
  const url = db.prepare("SELECT value FROM settings WHERE key = 'site_url'").get();
  res.json({ url: url?.value || '' });
});

// ====== CURRENCY ======
app.get('/api/currency', (req, res) => {
  const c = db.prepare("SELECT value FROM settings WHERE key = 'currency'").get();
  res.json({ currency: c?.value || 'INR' });
});

// ====== TAX INFO ======
app.get('/api/tax-info', (req, res) => {
  const rate = db.prepare("SELECT value FROM settings WHERE key = 'tax_rate'").get();
  const name = db.prepare("SELECT value FROM settings WHERE key = 'tax_name'").get();
  res.json({ rate: parseFloat(rate?.value || 0), name: name?.value || 'Tax' });
});

// ====== SITE FEATURES ======
app.get('/api/site-features', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'site_features'").get();
  let features = {};
  try { features = row?.value ? JSON.parse(row.value) : {}; } catch {}
  res.json(features);
});

// ====== WHMCS SSO ======
app.get('/api/whmcs/sso', auth, async (req, res) => {
  const user = db.prepare('SELECT whmcs_client_id FROM users WHERE id = ?').get(req.user.id);
  if (!user?.whmcs_client_id) return res.json({ url: null, error: 'No WHMCS account linked' });
  const url = await createAutoLoginLink(user.whmcs_client_id);
  res.json({ url });
});

// ====== WHMCS DOMAIN CHECK ======
app.get('/api/whmcs/domain-check', async (req, res) => {
  const { domain, tld } = req.query;
  if (!domain || !tld) return res.status(400).json({ error: 'domain and tld required' });
  const result = await checkDomain(domain, tld);
  res.json(result);
});

app.get('/api/whmcs/domain-suggestions', async (req, res) => {
  const result = await whmcsApi('GetTLDPricing');
  if (result.result === 'success' && result.pricing) {
    const tlds = Object.entries(result.pricing).map(([tld, data]) => {
      const currency = Object.values(data)[0] || {};
      const parseP = (v) => v ? parseFloat(String(v).replace(/[^0-9.]/g, '')) || null : null;
      const register = parseP(currency.register);
      const renew = parseP(currency.renew);
      const transfer = parseP(currency.transfer);
      return {
        tld: '.' + tld.replace(/^\./, ''),
        price: register || (renew || 8.99),
        renew: renew || (register || 9.99),
        register: !!register,
        transfer: !!transfer,
      };
    }).filter(t => t.price > 0).sort((a, b) => a.price - b.price);
    return res.json({ tlds, source: 'whmcs' });
  }
  res.json({
    tlds: ['.com', '.net', '.org', '.in', '.co.in', '.tech', '.io', '.app', '.dev', '.me', '.xyz', '.online', '.store', '.site', '.cloud'].map(t => ({
      tld: t, price: 899, renew: 999, register: true, transfer: true
    })),
    source: 'fallback'
  });
});

// ====== PAYMENT ======
app.use('/api/payment', paymentRoutes);

// ====== OAUTH ======
app.use('/api/auth', oauthRoutes);

// ====== SPA catch-all for admin panel at /devlopment/=====
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// ====== START ======
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Royal Billing API on port ${PORT}`);
  seed();
});

function seed() {
  if (db.prepare('SELECT COUNT(*) as count FROM categories').get().count > 0) return;

  const cat1 = uuidv4(), cat2 = uuidv4(), cat3 = uuidv4(), cat4 = uuidv4();
  db.prepare('INSERT INTO categories (id, name, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)').run(cat1, 'Game Servers', 'Premium game server hosting with DDoS protection', 'Gamepad2', 1);
  db.prepare('INSERT INTO categories (id, name, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)').run(cat2, 'VPS', 'High-performance virtual private servers', 'Server', 2);
  db.prepare('INSERT INTO categories (id, name, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)').run(cat3, 'Web Hosting', 'Reliable website hosting solutions', 'Globe', 3);
  db.prepare('INSERT INTO categories (id, name, description, icon, sort_order) VALUES (?, ?, ?, ?, ?)').run(cat4, 'Discord Bot', '24/7 Discord bot hosting', 'Headphones', 4);

  const prods = [
    [cat1, 'Lammu Plan', 'Entry-level game server with 4GB RAM', 49, 'monthly', '["4GB DDR4 RAM","2 vCPU Cores","50GB NVMe SSD","1Gbps Port","DDoS Protection","Free Subdomain"]'],
    [cat1, 'Standard Plan', 'Balanced game server with 8GB RAM', 99, 'monthly', '["8GB DDR4 RAM","4 vCPU Cores","100GB NVMe SSD","1Gbps Port","DDoS Protection","Free Subdomain","Daily Backups"]'],
    [cat1, 'Premium Plan', 'High-performance game server with 16GB RAM', 199, 'monthly', '["16GB DDR4 RAM","6 vCPU Cores","200GB NVMe SSD","1Gbps Port","DDoS Protection","Free Subdomain","Daily Backups","Priority Support"]'],
    [cat1, 'Ultra Plan', 'Ultimate game server with 32GB RAM', 399, 'monthly', '["32GB DDR4 RAM","8 vCPU Cores","400GB NVMe SSD","1Gbps Port","DDoS Protection","Free Subdomain","Daily Backups","Priority Support","Dedicated IP"]'],
    [cat2, 'Intel Platinum VPS', 'Intel Platinum VPS with 2GB RAM', 149, 'monthly', '["2GB DDR4 RAM","1 vCPU","40GB NVMe","1 IPv4","Root Access","DDoS Protection","KVM Virtualization"]'],
    [cat2, 'AMD Ryzen VPS', 'High-performance AMD Ryzen VPS with 4GB', 299, 'monthly', '["4GB DDR4 RAM","2 vCPU","80GB NVMe","1 IPv4","Root Access","DDoS Protection","KVM Virtualization"]'],
    [cat2, 'AMD EPYC VPS', 'Enterprise EPYC VPS with 8GB', 599, 'monthly', '["8GB DDR4 RAM","4 vCPU","160GB NVMe","1 IPv4","Root Access","DDoS Protection","KVM Virtualization"]'],
    [cat3, 'Web Hosting Basic', 'cPanel hosting for 1 website', 79, 'monthly', '["1 Website","10GB Storage","100GB Bandwidth","Free SSL","cPanel","1 Email Account"]'],
    [cat3, 'Web Hosting Pro', 'cPanel hosting for 5 websites', 199, 'monthly', '["5 Websites","50GB Storage","Unlimited Bandwidth","Free SSL","cPanel","5 Email Accounts","Daily Backups"]'],
    [cat4, 'Discord Bot Basic', 'Basic Discord bot hosting', 49, 'monthly', '["512MB RAM","1 vCPU","5GB Storage","24/7 Uptime","Auto Restart","Free .xyz Domain"]'],
    [cat4, 'Discord Bot Pro', 'Advanced Discord bot hosting', 99, 'monthly', '["2GB RAM","2 vCPU","10GB Storage","24/7 Uptime","Auto Restart","Free .xyz Domain","Database Included"]'],
  ];

  for (const [cid, name, desc, price, cycle, features] of prods) {
    db.prepare('INSERT INTO products (id, category_id, name, description, price, billing_cycle, features) VALUES (?, ?, ?, ?, ?, ?, ?)').run(uuidv4(), cid, name, desc, price, cycle, features);
  }

  const hashed = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (id, email, password, name, role, balance) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), 'admin@royaldev.com', hashed, 'Admin', 'admin', 99999);
}
