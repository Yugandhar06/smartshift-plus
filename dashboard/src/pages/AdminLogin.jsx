import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SS } from '../utils/shared';
import './WorkerOnboarding.css'; // Reuse styles

export default function AdminLogin() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState();
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const res = await fetch(`http://localhost:8000/api/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        SS.set('role', data.role);
        SS.set('token', data.token);
        SS.set('name', data.name);
        window.location.href = '/';
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      setError('Login failed');
    }
  };

  return (
    <div className="onboarding-wrapper" style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div className="screen active" style={{ maxWidth: '400px', width: '100%', padding: '40px' }}>
        <div className="hero">
          <div className="hero-icon"></div>
          <h1>System<br/><span>Admin</span></h1>
          <p>Login to SmartShift+ Operations Center</p>
        </div>
        
        {error && <div style={{ color: '#ff5252', marginBottom: '10px' }}>{error}</div>}

        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="form-input" type="text" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        
        <div className="form-group" style={{ marginTop: '20px' }}>
          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        <button className="cta-btn" onClick={handleLogin} style={{ marginTop: '30px' }}>Login to Dashboard →</button>
        <button className="cta-btn secondary" onClick={() => navigate('/worker/onboarding')} style={{ marginTop: '10px' }}>Go to Rider Flow</button>
      </div>
    </div>
  );
}