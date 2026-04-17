import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';       
import Dashboard from './pages/Dashboard';
import Payouts from './pages/Payouts';
import Analytics from './pages/Analytics';
import WorkerOnboarding from './pages/WorkerOnboarding';
import WorkerApp from './pages/WorkerApp';
import WorkerMap from './pages/WorkerMap';
import DemoController from './pages/DemoController';
import AdminLogin from './pages/AdminLogin';
import { SS } from './utils/shared';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = SS.get('token');
  const role = SS.get('role'); // e.g. 'admin' or 'rider'
  const location = useLocation();
  
  if (!role && location.pathname !== '/worker/onboarding' && location.pathname !== '/admin-login') {
    return <Navigate to="/worker/onboarding" />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // If not authorized for this view, redirect
    if (role === 'rider') return <Navigate to="/worker/app" />;
    if (role === 'admin') return <Navigate to="/" />;
  }
  
  return children;
};

const LogoutBtn = () => (
  <div style={{ padding: '0 8px' }}>
    <button 
      onClick={() => { SS.clear(); window.location.href = '/worker/onboarding'; }}
      style={{ background: 'transparent', color: '#ff5252', border: '1px solid #ff525240', borderRadius: '8px', padding: '8px', width: '100%', cursor: 'pointer' }}
    >
      Logout
    </button>
  </div>
);

const GuidewireBadge = () => (
  <div style={{ marginTop: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0a1a0a', padding: '16px 12px 12px 12px', borderRadius: '10px', border: '1px solid #113311', width: 'calc(100% - 24px)', alignSelf: 'center', boxSizing: 'border-box' }}>
    <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '1px', color: '#00e676', textTransform: 'uppercase', marginBottom: '8px' }}>
      Powered by
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.95 }}>
      {/* CSS Guidewire Logo */}
      <div style={{ position: 'relative', width: '22px', height: '22px' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4.5px', background: '#007fac' }}></div>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '4.5px', height: '100%', background: '#007fac' }}></div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '4.5px', background: '#007fac' }}></div>
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '4.5px', height: '13px', background: '#007fac' }}></div>
        <div style={{ position: 'absolute', bottom: '10px', right: 0, width: '12px', height: '4.5px', background: '#007fac' }}></div>
      </div>
      <div style={{ fontSize: '15px', fontWeight: 700, color: '#e8eaf0', letterSpacing: '1.2px', fontFamily: 'inherit' }}>
        GUIDEWIRE
      </div>
    </div>
  </div>
);

function AppSidebar() {
  const role = SS.get('role');
  
  if (role === 'rider') {
    // Rider navigation (mostly worker app)
    return (
      <aside style={{ width: '220px', backgroundColor: '#0f1117', borderRight: '1px solid #22262e', display: 'flex', flexDirection: 'column', padding: '24px 0', position: 'fixed', left: 0, top: 0, bottom: 0 }}>
        <div style={{ padding: '0 20px 24px', fontSize: '18px', fontWeight: 700, color: '#e8eaf0', borderBottom: '1px solid #22262e' }}>
          SmartShift<span style={{ color: '#00e676' }}>+</span>
        </div>
        <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: '#5a6070', textTransform: 'uppercase', padding: '16px 8px 4px' }}>Worker View</div>
          <Link to="/worker/app" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px', borderRadius: '8px', fontSize: '13px', color: window.location.pathname === '/worker/app' ? '#e8eaf0' : '#5a6070', textDecoration: 'none', background: window.location.pathname === '/worker/app' ? '#0a1a0a' : 'transparent' }}>
            Worker App
          </Link>
          <Link to="/worker/map" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px', borderRadius: '8px', fontSize: '13px', color: window.location.pathname === '/worker/map' ? '#e8eaf0' : '#5a6070', textDecoration: 'none', background: window.location.pathname === '/worker/map' ? '#0a1a0a' : 'transparent', marginTop: '2px' }}>
            Regional Map
          </Link>
          <GuidewireBadge />
          <LogoutBtn />
        </nav>
      </aside>
    );
  }

  // Admin / default sidebar
  return (
    <aside style={{ width: '220px', backgroundColor: '#0f1117', borderRight: '1px solid #22262e', display: 'flex', flexDirection: 'column', padding: '24px 0', position: 'fixed', left: 0, top: 0, bottom: 0 }}>
      <div style={{ padding: '0 20px 24px', fontSize: '18px', fontWeight: 700, color: '#e8eaf0', borderBottom: '1px solid #22262e' }}>
        SmartShift<span style={{ color: '#00e676' }}>+</span>
        <span style={{ fontSize: '10px', color: '#5a6070', fontWeight: 400, display: 'block', marginTop: '2px' }}>Operations Center</span>
      </div>
      <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: '#5a6070', textTransform: 'uppercase', padding: '8px 8px 4px' }}>Overview</div>   
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#e8eaf0', textDecoration: 'none', background: '#0a1a0a' }}>
          Dashboard
        </Link>

        <Link to="/payouts" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px', borderRadius: '8px', fontSize: '13px', color: '#5a6070', textDecoration: 'none', marginTop: '2px' }}>
          Payouts
        </Link>
        <Link to="/analytics" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px', borderRadius: '8px', fontSize: '13px', color: '#5a6070', textDecoration: 'none', marginTop: '2px' }}>
          Analytics
        </Link>
        
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1.5px', color: '#5a6070', textTransform: 'uppercase', padding: '16px 8px 4px' }}>Demo Check</div>
        <Link to="/demo-controller" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px', borderRadius: '8px', fontSize: '13px', color: '#5a6070', textDecoration: 'none', marginTop: '2px' }}>
          Controller
        </Link>
        <GuidewireBadge />
        <LogoutBtn />
      </nav>
    </aside>
  );
}

function App() {
  const currentRole = SS.get('role');
  const isAuthScreen = !currentRole || window.location.pathname === '/worker/onboarding' || window.location.pathname === '/admin-login';

  return (
    <Router>
      <div className="App" style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Space Grotesk', sans-serif", background: '#080a0e' }}>
        {!isAuthScreen && <AppSidebar />}
        <main style={{ marginLeft: isAuthScreen ? '0' : '220px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Routes>
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/worker/onboarding" element={<WorkerOnboarding />} />

            <Route path="/" element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/payouts" element={<ProtectedRoute allowedRoles={['admin']}><Payouts /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin']}><Analytics /></ProtectedRoute>} />
            <Route path="/demo-controller" element={<ProtectedRoute allowedRoles={['admin']}><DemoController /></ProtectedRoute>} />

            <Route path="/worker/app" element={<ProtectedRoute allowedRoles={['rider']}><WorkerApp /></ProtectedRoute>} />
            <Route path="/worker/map" element={<ProtectedRoute allowedRoles={['rider']}><WorkerMap /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
