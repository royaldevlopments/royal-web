import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/axios';
import { Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    } finally { setLoading(false); }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#1cc4e8]/20 bg-[#1cc4e8]/5 px-4 py-1.5 text-xs font-medium text-[#1cc4e8] mb-4">
          <Mail className="w-3.5 h-3.5" /> RESET PASSWORD
        </div>
        <p className="text-muted-foreground text-sm">Enter your email to receive a reset link</p>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border transition-all duration-300 hover:border-[#1cc4e8]/30"
        style={{ background: 'linear-gradient(180deg, hsl(230 20% 10%) 0%, hsl(230 20% 7%) 100%)' }}>
        <div className="p-8">
          {error && <div className="mb-5 p-3 bg-danger/10 border border-danger/20 rounded-lg text-sm text-danger">{error}</div>}
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-success" />
              </div>
              <p className="text-foreground font-medium">Check your email</p>
              <p className="text-sm text-muted-foreground">If an account exists with that email, you'll receive a password reset link shortly.</p>
              <Link to="/login" className="inline-block text-sm text-[#1cc4e8] hover:text-[#1cc4e8]/80 transition-colors mt-4">Back to Sign In</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted group-focus-within:text-[#1cc4e8] transition-colors" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field pl-10" placeholder="Enter your email" required />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="relative overflow-hidden w-full py-3 text-sm font-semibold rounded-lg transition-all duration-300 text-white hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #a855f7, #9333ea)' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-5 text-center">
        <Link to="/login" className="text-xs text-muted-foreground hover:text-[#1cc4e8] transition-colors flex items-center justify-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back to Sign In
        </Link>
      </div>
    </div>
  );
}
