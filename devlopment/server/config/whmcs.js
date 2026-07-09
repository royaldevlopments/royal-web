import db from './db.js';

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings WHERE key IN (?, ?, ?)').all('whmcs_url', 'whmcs_identifier', 'whmcs_secret');
  const s = {};
  for (const r of rows) s[r.key] = r.value;
  return s;
}

export async function whmcsApi(action, params = {}) {
  const settings = getSettings();
  const url = settings.whmcs_url;
  const identifier = settings.whmcs_identifier;
  const secret = settings.whmcs_secret;
  if (!url || !identifier || !secret) return { result: 'error', message: 'WHMCS not configured' };

  const body = new URLSearchParams({
    action,
    identifier,
    secret,
    responsetype: 'json',
    ...params,
  });

  try {
    const res = await fetch(url.replace(/\/+$/, '') + '/includes/api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    return await res.json();
  } catch (e) {
    return { result: 'error', message: e.message };
  }
}

export async function createWhmcsClient(user) {
  const nameParts = (user.name || user.email || '').split(' ');
  return whmcsApi('AddClient', {
    firstname: nameParts[0] || user.email.split('@')[0],
    lastname: nameParts.slice(1).join(' ') || 'User',
    email: user.email,
    password2: user.plainPassword || Math.random().toString(36).slice(2, 10),
    sendwelcomemail: false,
    skipvalidation: true,
  });
}

export async function createAutoLoginLink(clientId) {
  if (!clientId) return null;
  const res = await whmcsApi('CreateAutoLoginLink', { client_id: clientId });
  if (res.result !== 'success') return null;
  let link = res.link;
  if (link && !link.startsWith('http')) {
    const settings = getSettings();
    link = settings.whmcs_url.replace(/\/+$/, '') + '/' + link.replace(/^\//, '');
  }
  return link || null;
}

export async function checkDomain(domain, tld) {
  const res = await whmcsApi('DomainWHOIS', { domain, tld });
  return res;
}
