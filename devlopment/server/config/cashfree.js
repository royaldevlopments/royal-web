import db from './db.js';

function getSetting(key, fallback) {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : fallback;
  } catch { return fallback; }
}

const CF = {
  get clientId() { return getSetting('cf_client_id', process.env.CF_CLIENT_ID || ''); },
  get clientSecret() { return getSetting('cf_client_secret', process.env.CF_CLIENT_SECRET || ''); },
  get testMode() { return getSetting('cf_test_mode', 'true') !== 'false'; },
  get baseUrl() {
    return this.testMode ? 'https://sandbox.cashfree.com/pg' : 'https://api.cashfree.com/pg';
  },
  returnUrl: 'http://65.0.139.64:8008/payment/callback',
};

export default CF;
