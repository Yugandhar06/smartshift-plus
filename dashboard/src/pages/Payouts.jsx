import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Payouts() {
  const [payouts, setPayouts] = useState([]);

  const fetchPayouts = async () => {
    try {
      const resp = await axios.get('http://localhost:8000/api/payouts');        
      setPayouts(resp.data);
    } catch (e) { console.log(e); }
  };

  useEffect(() => {
    fetchPayouts();
    const interval = setInterval(fetchPayouts, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '30px', color: '#e8eaf0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, color: '#fff', fontSize: '24px' }}> Payout Monitor</h1>
        <button 
          onClick={fetchPayouts} 
          style={{ 
            background: '#0a1a0a', 
            color: '#00e676', 
            border: '1px solid #113311', 
            padding: '8px 16px', 
            borderRadius: '6px', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Refresh Feed
        </button>
      </div>

      <div style={{ background: '#0f1117', borderRadius: '10px', border: '1px solid #22262e', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#0a1a0a', color: '#5a6070', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <th style={{ padding: '16px', borderBottom: '1px solid #22262e' }}>Date</th>        
              <th style={{ padding: '16px', borderBottom: '1px solid #22262e' }}>User ID</th>     
              <th style={{ padding: '16px', borderBottom: '1px solid #22262e' }}>BPS Score</th>   
              <th style={{ padding: '16px', borderBottom: '1px solid #22262e' }}>Amount</th>
              <th style={{ padding: '16px', borderBottom: '1px solid #22262e' }}>Status</th>      
            </tr>
          </thead>
          <tbody>
            {payouts.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #22262e' }}>
                <td style={{ padding: '16px', color: '#adb5bd' }}>
                  {new Date(p.created_at).toLocaleDateString()} {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td style={{ padding: '16px', fontWeight: '500', color: '#fff' }}>Rider #{p.user_id}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    color: p.bps_score >= 80 ? '#00e676' : p.bps_score > 40 ? '#ffd740' : '#ff5252',
                    background: p.bps_score >= 80 ? '#00e67615' : p.bps_score > 40 ? '#ffd74015' : '#ff525215',
                    padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold'
                  }}>
                    {p.bps_score}/100
                  </span>
                </td>
                <td style={{ padding: '16px', color: '#fff', fontWeight: 'bold' }}>Rs. {p.payout_amount || 0}</td>       
                <td style={{ padding: '16px' }}>
                  <span style={{ 
                    color: p.status.toLowerCase() === 'approved' ? '#00e676' : '#ff5252',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: p.status.toLowerCase() === 'approved' ? '1px solid #00e67640' : '1px solid #ff525240',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    {p.status.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
            {payouts.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#5a6070' }}>Processing feed empty. No payouts recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
