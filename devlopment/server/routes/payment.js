import { Router } from 'express';
import Razorpay from 'razorpay';
import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import RZ from '../config/razorpay.js';
import CF from '../config/cashfree.js';

const router = Router();

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, 'royal-billing-secret-2026'); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

let _razorpay = null;
function getRazorpay() {
  if (!_razorpay) {
    _razorpay = new Razorpay({ key_id: RZ.keyId, key_secret: RZ.keySecret });
  }
  return _razorpay;
}

// ====== RAZORPAY ======

router.post('/create-order', auth, async (req, res) => {
  try {
    const { invoice_id } = req.body;
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?').get(invoice_id, req.user.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'paid') return res.json({ paid: true });

    const rzOrder = await getRazorpay().orders.create({
      amount: Math.round(invoice.amount * 100),
      currency: 'INR',
      receipt: invoice.invoice_no,
      notes: { invoice_id, user_id: req.user.id },
    });

    db.prepare('UPDATE invoices SET payment_order_id = ? WHERE id = ?').run(rzOrder.id, invoice_id);

    res.json({
      key: RZ.keyId,
      order_id: rzOrder.id,
      amount: rzOrder.amount,
      currency: rzOrder.currency,
      receipt: rzOrder.receipt,
      invoice_id,
      name: req.user.name || 'Customer',
      email: req.user.email || '',
      contact: req.user.phone || '',
    });
  } catch (e) {
    console.error('Razorpay error:', e);
    res.status(500).json({ error: e.message || 'Payment creation failed' });
  }
});

router.post('/verify', auth, (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoice_id } = req.body;
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSig = crypto.createHmac('sha256', RZ.keySecret).update(body).digest('hex');
  if (expectedSig !== razorpay_signature) return res.status(400).json({ error: 'Invalid signature' });
  markPaid(invoice_id, razorpay_payment_id, 'Razorpay', req);
});

// ====== CASHFREE ======

router.post('/create-cf-order', auth, async (req, res) => {
  try {
    const { invoice_id } = req.body;
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?').get(invoice_id, req.user.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'paid') return res.json({ paid: true });

    const orderId = 'CF-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

    if (CF.clientId && CF.clientSecret) {
      const payload = {
        order_id: orderId,
        order_amount: invoice.amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: req.user.id,
          customer_email: req.user.email || 'customer@royaldev.com',
          customer_phone: '9999999999',
        },
        order_meta: {
          return_url: CF.returnUrl + '?order_id={order_id}',
          notify_url: 'http://65.0.139.64:3002/api/payment/cf-webhook',
        },
      };

      const response = await axios.post(`${CF.baseUrl}/orders`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2023-08-01',
          'x-client-id': CF.clientId,
          'x-client-secret': CF.clientSecret,
        },
      });

      db.prepare('UPDATE invoices SET payment_order_id = ? WHERE id = ?').run(orderId, invoice_id);
      res.json({
        payment_link: response.data.payment_link,
        payment_session_id: response.data.payment_session_id,
        order_id: orderId,
        amount: invoice.amount,
      });
    } else {
      db.prepare('UPDATE invoices SET payment_order_id = ? WHERE id = ?').run(orderId, invoice_id);
      res.json({ test_mode: true, order_id: orderId, amount: invoice.amount, message: 'API keys not configured — use /api/payment/confirm for test payment.' });
    }
  } catch (e) {
    console.error('Cashfree error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// Cashfree webhook
router.post('/cf-webhook', async (req, res) => {
  try {
    const { order_id, order_status } = req.body.data?.order || req.body;
    if (order_status === 'PAID' || order_status === 'SUCCESS') {
      const invoice = db.prepare('SELECT * FROM invoices WHERE payment_order_id = ?').get(order_id);
      if (invoice && invoice.status !== 'paid') {
        db.prepare('UPDATE invoices SET status = ?, paid_at = ?, payment_method = ? WHERE id = ?').run('paid', new Date().toISOString(), 'Cashfree', invoice.id);
        if (invoice.service_id) {
          db.prepare('UPDATE services SET status = ?, updated_at = ? WHERE id = ?').run('active', new Date().toISOString(), invoice.service_id);
          db.prepare('UPDATE orders SET status = ? WHERE service_id = ?').run('active', invoice.service_id);
        }
      }
    }
    res.json({ status: 'ok' });
  } catch (e) { console.error('CF webhook error:', e.message); res.json({ status: 'error' }); }
});

// ====== COMMON ======

router.post('/confirm', auth, (req, res) => {
  const { invoice_id } = req.body;
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND user_id = ?').get(invoice_id, req.user.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  markPaid(invoice_id, 'manual-' + Date.now(), 'Manual', req);
});

function markPaid(invoiceId, paymentRef, method, reqCtx) {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
  if (!invoice) return;
  db.prepare('UPDATE invoices SET status = ?, paid_at = ?, payment_method = ?, payment_order_id = ? WHERE id = ?')
    .run('paid', new Date().toISOString(), method, paymentRef, invoiceId);
  if (invoice.service_id) {
    db.prepare('UPDATE services SET status = ?, updated_at = ? WHERE id = ?').run('active', new Date().toISOString(), invoice.service_id);
    db.prepare('UPDATE orders SET status = ? WHERE service_id = ?').run('active', invoice.service_id);
  }
  const userId = reqCtx?.user?.id || invoice.user_id;
  db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
    .run(uuidv4(), userId, 'Payment Received', `₹${invoice.amount} paid for ${invoice.invoice_no}`, 'success');
}

export default router;
