import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api('/auth/me').then(u => { setUser(u); }).catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const login = async (email, password, turnstile_token) => {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, turnstile_token }) });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };

  const register = async (data) => {
    const res = await api('/auth/register', { method: 'POST', body: JSON.stringify(data) });
    localStorage.setItem('token', res.token);
    setUser(res.user);
    return res;
  };

  const logout = () => { localStorage.removeItem('token'); setUser(null); };

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try { const u = await api('/auth/me'); setUser(u); } catch { localStorage.removeItem('token'); setUser(null); }
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
