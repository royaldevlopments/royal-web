import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { api } from './api/axios';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Order from './pages/Order';
import Services from './pages/Services';
import ServiceDetail from './pages/ServiceDetail';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import Tickets from './pages/Tickets';
import TicketDetail from './pages/TicketDetail';
import Profile from './pages/Profile';
import Security from './pages/Security';
import PaymentMethods from './pages/PaymentMethods';
import Admin from './pages/Admin';
import Referrals from './pages/Referrals';
import ApiTokens from './pages/ApiTokens';
import Activity from './pages/Activity';
import Layout from './components/Layout';
import PublicLayout from './components/PublicLayout';
import Maintenance from './pages/Maintenance';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen bg-background"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function Public({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" />;
  return children;
}

function App() {
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);

  useEffect(() => {
    api('/settings/maintenance')
      .then(data => setMaintenance(data.maintenance))
      .catch(() => {})
      .finally(() => setMaintenanceLoading(false));
  }, []);

  if (maintenanceLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (maintenance) return <Maintenance />;

  return (
    <AuthProvider>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<Public><Login /></Public>} />
          <Route path="/register" element={<Public><Register /></Public>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route element={<Protected><Layout /></Protected>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/order" element={<Order />} />
          <Route path="/services" element={<Services />} />
          <Route path="/services/:id" element={<ServiceDetail />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/security" element={<Security />} />
          <Route path="/payment-methods" element={<PaymentMethods />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/api-tokens" element={<ApiTokens />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
