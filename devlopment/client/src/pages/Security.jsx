import { useState, useEffect } from 'react';
import { api } from '../api/axios';
import { Shield, Lock, Smartphone, Key, CheckCircle, XCircle, AlertTriangle, Copy, Check } from 'lucide-react';

export default function Security() {
  const [form, setForm] = useState({ current: '', newpass: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaSecret, setTwoFaSecret] = useState('');
  const [twoFaQr, setTwoFaQr] = useState('');
  const [twoFaStep, setTwoFaStep] = useState('idle');
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaDisablePw, setTwoFaDisablePw] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [codesCopied, setCodesCopied] = useState(false);

  useEffect(() => {
    api('/profile/2fa/status').then(d => setTwoFaEnabled(d.enabled)).catch(() => {});
  }, []);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.newpass !== form.confirm) return setError('Passwords do not match');
    if (form.newpass.length < 6) return setError('Password must be at least 6 characters');
    try {
      await api('/profile/password', { method: 'PUT', body: JSON.stringify({ current: form.current, newpass: form.newpass }) });
      setSuccess(true);
      setForm({ current: '', newpass: '', confirm: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) { setError(err.message); }
  };

  const handleSetup2Fa = async () => {
    setTwoFaLoading(true);
    setError('');
    try {
      const data = await api('/profile/2fa/setup', { method: 'POST' });
      setTwoFaSecret(data.secret);
      setTwoFaQr(data.qr);
      setRecoveryCodes(data.recovery_codes || []);
      setTwoFaStep('verify');
    } catch (err) { setError(err.message); }
    finally { setTwoFaLoading(false); }
  };

  const handleVerify2Fa = async (e) => {
    e.preventDefault();
    setTwoFaLoading(true);
    setError('');
    try {
      await api('/profile/2fa/verify', { method: 'POST', body: JSON.stringify({ token: twoFaCode }) });
      setTwoFaEnabled(true);
      setTwoFaStep('idle');
      setTwoFaSecret('');
      setTwoFaQr('');
      setTwoFaCode('');
    } catch (err) { setError(err.message); }
    finally { setTwoFaLoading(false); }
  };

  const handleDisable2Fa = async () => {
    setTwoFaLoading(true);
    setError('');
    try {
      await api('/profile/2fa/disable', { method: 'POST', body: JSON.stringify({ password: twoFaDisablePw }) });
      setTwoFaEnabled(false);
      setTwoFaDisablePw('');
      setTwoFaStep('idle');
    } catch (err) { setError(err.message); }
    finally { setTwoFaLoading(false); }
  };

  const handleViewRecoveryCodes = async () => {
    try {
      const data = await api('/profile/2fa/recovery-codes', { method: 'POST' });
      setRecoveryCodes(data.recovery_codes || []);
      setTwoFaStep('show-codes');
    } catch (err) { setError(err.message); }
  };

  const copyAllCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCodesCopied(true);
    setTimeout(() => setCodesCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-foreground">Security</h1>
      <div className="card">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Lock className="w-4 h-4" /> Change Password</h3>
        {error && <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">{error}</div>}
        {success && <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success">Password changed successfully!</div>}
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Current Password</label>
            <input type="password" value={form.current} onChange={e => setForm(p => ({ ...p, current: e.target.value }))} className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">New Password</label>
              <input type="password" value={form.newpass} onChange={e => setForm(p => ({ ...p, newpass: e.target.value }))} className="input-field" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Confirm New</label>
              <input type="password" value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} className="input-field" required />
            </div>
          </div>
          <button type="submit" className="btn-primary">Update Password</button>
        </form>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Smartphone className="w-4 h-4" /> Two-Factor Authentication</h3>
        {twoFaEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle className="w-4 h-4" /> 2FA is currently enabled
            </div>
            <div className="flex gap-2 flex-wrap">
              {twoFaStep === 'show-codes' ? (
                <div className="w-full space-y-3">
                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                    <p className="text-sm font-bold text-warning flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" /> Save these recovery codes! Each code can only be used once.</p>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {recoveryCodes.map((code, i) => (
                        <code key={i} className="text-xs font-mono bg-secondary/50 px-2 py-1.5 rounded text-foreground tracking-wider text-center">{code}</code>
                      ))}
                    </div>
                    <button onClick={copyAllCodes} className="btn-primary text-xs flex items-center gap-1.5">
                      {codesCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {codesCopied ? 'Copied' : 'Copy All'}
                    </button>
                  </div>
                  <button onClick={() => setTwoFaStep('idle')} className="btn-secondary text-sm">Close</button>
                </div>
              ) : twoFaStep === 'disable' ? (
                <div className="w-full space-y-3">
                  <p className="text-xs text-muted-foreground">Enter your password to disable 2FA.</p>
                  <input type="password" value={twoFaDisablePw} onChange={e => setTwoFaDisablePw(e.target.value)} placeholder="Your password" className="input-field" />
                  <div className="flex gap-2">
                    <button onClick={handleDisable2Fa} disabled={twoFaLoading || !twoFaDisablePw} className="btn-danger text-sm">Disable 2FA</button>
                    <button onClick={() => { setTwoFaStep('idle'); setTwoFaDisablePw(''); }} className="btn-secondary text-sm">Cancel</button>
                  </div>
                  {error && <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">{error}</div>}
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setTwoFaStep('disable')} className="btn-danger text-sm">Disable 2FA</button>
                  <button onClick={handleViewRecoveryCodes} className="btn-secondary text-sm">View Recovery Codes</button>
                </div>
              )}
            </div>
          </div>
        ) : twoFaStep === 'verify' ? (
          <div className="space-y-4">
            {recoveryCodes.length > 0 && (
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
                <p className="text-sm font-bold text-warning flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" /> Save these recovery codes! Each code can only be used once.</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {recoveryCodes.map((code, i) => (
                    <code key={i} className="text-xs font-mono bg-secondary/50 px-2 py-1.5 rounded text-foreground tracking-wider text-center">{code}</code>
                  ))}
                </div>
                <button onClick={copyAllCodes} className="btn-primary text-xs flex items-center gap-1.5">
                  {codesCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {codesCopied ? 'Copied' : 'Copy All'}
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the code to verify.</p>
            <div className="flex justify-center">
              <img src={twoFaQr} alt="QR Code" className="w-40 h-40 rounded-lg" />
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Or manually enter: <code className="text-[#1cc4e8] text-xs break-all">{twoFaSecret}</code></p>
            </div>
            <form onSubmit={handleVerify2Fa} className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Authentication Code</label>
                <input value={twoFaCode} onChange={e => setTwoFaCode(e.target.value)} placeholder="000000" maxLength={6} className="input-field text-center text-lg tracking-[8px] font-mono" required />
              </div>
              {error && <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">{error}</div>}
              <div className="flex gap-2">
                <button type="submit" disabled={twoFaLoading || twoFaCode.length < 6} className="btn-primary text-sm">Verify & Enable</button>
                <button type="button" onClick={() => setTwoFaStep('idle')} className="btn-secondary text-sm">Cancel</button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Enhance your account security with two-factor authentication.</p>
            <button onClick={handleSetup2Fa} disabled={twoFaLoading} className="btn-secondary text-sm">Enable 2FA</button>
            {error && <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">{error}</div>}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><Key className="w-4 h-4" /> API Keys</h3>
        <p className="text-xs text-muted-foreground">Manage your API access tokens.</p>
        <button className="btn-secondary mt-3 text-sm">Generate API Key</button>
      </div>
    </div>
  );
}
