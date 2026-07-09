import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/axios';
import { Mail, Lock, User, Phone, Eye, EyeOff, Globe, MessageCircle, UserPlus } from 'lucide-react';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileKey, setTurnstileKey] = useState('');
  const [searchParams] = useSearchParams();
  const turnstileRef = useRef(null);
  const turnstileId = useRef(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api('/turnstile-key').then(d => setTurnstileKey(d.key)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!turnstileKey || !window.turnstile) return;
    if (turnstileId.current) window.turnstile.remove(turnstileId.current);
    turnstileId.current = window.turnstile.render(turnstileRef.current, {
      sitekey: turnstileKey,
      theme: 'dark'
    });
    return () => { if (turnstileId.current) window.turnstile.remove(turnstileId.current); };
  }, [turnstileKey]);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    const token = turnstileId.current ? window.turnstile.getResponse(turnstileId.current) : '';
    if (turnstileKey && !token) { setError('Please complete the captcha'); return; }
    setLoading(true);
    try {
      const ref = searchParams.get('ref');
      await register({ email: form.email, password: form.password, name: form.name, phone: form.phone, turnstile_token: token, referral_code: ref || undefined });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
      if (turnstileId.current) window.turnstile.reset(turnstileId.current);
    } finally { setLoading(false); }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#1cc4e8]/20 bg-[#1cc4e8]/5 px-4 py-1.5 text-xs font-medium text-[#1cc4e8] mb-4">
          <UserPlus className="w-3.5 h-3.5" /> GET STARTED
        </div>
        <p className="text-muted-foreground text-sm">Create your account to get started</p>
        {searchParams.get('ref') && <p className="text-xs text-[#1cc4e8] mt-2">Referred by a friend!</p>}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border transition-all duration-300 hover:border-[#1cc4e8]/30"
        style={{ background: 'linear-gradient(180deg, hsl(230 20% 10%) 0%, hsl(230 20% 7%) 100%)' }}>
        <div className="p-8">
          {error && <div className="mb-5 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">{error}</div>}

          <div className="flex gap-3 mb-6">
            <a href="https://royal-web-seven.vercel.app/api/auth/google"
              className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border border-border transition-all duration-300 text-sm font-medium hover:border-[#1cc4e8]/30 hover:shadow-[0_0_20px_rgba(28,196,232,0.1)]"
              style={{ background: 'linear-gradient(180deg, hsl(230 20% 12%) 0%, hsl(230 20% 8%) 100%)' }}>
              <Globe className="w-4 h-4 text-[#1cc4e8]" /> Google
            </a>
            <a href="https://royal-web-seven.vercel.app/api/auth/discord"
              className="flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border border-border transition-all duration-300 text-sm font-medium hover:border-[#1cc4e8]/30 hover:shadow-[0_0_20px_rgba(28,196,232,0.1)]"
              style={{ background: 'linear-gradient(180deg, hsl(230 20% 12%) 0%, hsl(230 20% 8%) 100%)' }}>
              <MessageCircle className="w-4 h-4 text-[#1cc4e8]" /> Discord
            </a>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="px-3 text-xs text-muted" style={{ background: 'linear-gradient(180deg, hsl(230 20% 10%) 0%, hsl(230 20% 7%) 100%)' }}>OR</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Full Name</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-[#1cc4e8] transition-colors" />
                <input type="text" value={form.name} onChange={e => update('name', e.target.value)} className="input-field pl-10" placeholder="Your name" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email *</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-[#1cc4e8] transition-colors" />
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="input-field pl-10" placeholder="Enter your email" required />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Phone</label>
              <div className="relative group">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-[#1cc4e8] transition-colors" />
                <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} className="input-field pl-10" placeholder="+91 XXXXXXXXXX" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Password *</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-[#1cc4e8] transition-colors" />
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => update('password', e.target.value)} className="input-field pl-10 pr-10" placeholder="Min 6 characters" required />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Confirm Password *</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-[#1cc4e8] transition-colors" />
                <input type={showPw ? 'text' : 'password'} value={form.confirm} onChange={e => update('confirm', e.target.value)} className="input-field pl-10" placeholder="Repeat password" required />
              </div>
            </div>

            <div ref={turnstileRef} className="flex justify-center" />

            <button type="submit" disabled={loading}
              className="relative overflow-hidden w-full py-3 text-sm font-semibold rounded-lg transition-all duration-300 text-white hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)' }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Already have an account? <Link to="/login" className="text-[#1cc4e8] hover:text-[#1cc4e8]/80 transition-colors font-medium">Sign in</Link>
          </p>
        </div>
      </div>

      <div className="mt-5 text-center">
        <a href="/" className="text-xs text-muted-foreground hover:text-[#1cc4e8] transition-colors">← Back to Home</a>
      </div>
    </div>
  );
}
