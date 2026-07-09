import db from './db.js';

function getSetting(key, fallback) {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : fallback;
  } catch { return fallback; }
}

const RZ = {
  get keyId() { return getSetting('rz_key_id', process.env.RZ_KEY_ID || 'rzp_test_XXXXXXXXXXXX'); },
  get keySecret() { return getSetting('rz_key_secret', process.env.RZ_KEY_SECRET || 'test_secret_key'); },
  get testMode() { return getSetting('rz_test_mode', 'true') !== 'false'; },
};

export default RZ;
