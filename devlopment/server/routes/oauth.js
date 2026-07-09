import { Router } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';

const router = Router();
const JWT_SECRET = 'royal-billing-secret-2026';

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  for (const r of rows) s[r.key] = r.value;
  return s;
}

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

function findOrCreateUser(profile, provider) {
  const email = profile.email;
  if (!email) return null;
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    const id = uuidv4();
    const hashed = bcrypt.hashSync(uuidv4(), 10);
    const referral_code = 'ROYAL' + Math.random().toString(36).slice(2, 8).toUpperCase();
    db.prepare('INSERT INTO users (id, name, email, password, role, referral_code) VALUES (?, ?, ?, ?, ?, ?)').run(id, profile.name || email.split('@')[0], email, hashed, 'customer', referral_code);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }
  return user;
}

// Google OAuth
router.get('/google', (req, res) => {
  const s = getSettings();
  const clientId = s.google_client_id;
  if (!clientId) return res.redirect('/devlopment/login?error=Google+login+not+configured');
  const redirectUri = `${req.protocol}://${req.get('host')}/devlopment/api/auth/google/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email%20profile`;
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  try {
    const s = getSettings();
    const { code } = req.query;
    if (!code) return res.redirect('/devlopment/login?error=No+code+received');
    const redirectUri = `${req.protocol}://${req.get('host')}/devlopment/api/auth/google/callback`;
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: s.google_client_id,
      client_secret: s.google_client_secret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });
    const { access_token } = tokenRes.data;
    const profileRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profile = profileRes.data;
    const user = findOrCreateUser({ email: profile.email, name: profile.name }, 'google');
    if (!user) return res.redirect('/devlopment/login?error=Email+required');
    const token = generateToken(user);
    res.redirect(`/devlopment/login?token=${token}`);
  } catch (e) {
    res.redirect(`/devlopment/login?error=Google+login+failed`);
  }
});

// Discord OAuth
router.get('/discord', (req, res) => {
  const s = getSettings();
  const clientId = s.discord_client_id;
  if (!clientId) return res.redirect('/devlopment/login?error=Discord+login+not+configured');
  const redirectUri = `${req.protocol}://${req.get('host')}/devlopment/api/auth/discord/callback`;
  const url = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email`;
  res.redirect(url);
});

router.get('/discord/callback', async (req, res) => {
  try {
    const s = getSettings();
    const { code } = req.query;
    if (!code) return res.redirect('/devlopment/login?error=No+code+received');
    const redirectUri = `${req.protocol}://${req.get('host')}/devlopment/api/auth/discord/callback`;
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: s.discord_client_id,
      client_secret: s.discord_client_secret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const { access_token } = tokenRes.data;
    const profileRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const profile = profileRes.data;
    const user = findOrCreateUser({ email: profile.email, name: profile.global_name || profile.username }, 'discord');
    if (!user) return res.redirect('/devlopment/login?error=Email+required');
    const token = generateToken(user);
    res.redirect(`/devlopment/login?token=${token}`);
  } catch (e) {
    res.redirect(`/devlopment/login?error=Discord+login+failed`);
  }
});

export default router;
