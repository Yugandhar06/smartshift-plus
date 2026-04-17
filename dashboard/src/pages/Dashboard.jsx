import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';
import AdminRegionMap from '../components/AdminRegionMap';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Fix leaflet marker icon issue in react
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl,
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
});

const API_BASE = "http://localhost:8000/api";

export default function Dashboard() {
  const [zones, setZones] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [fraudLogs, setFraudLogs] = useState([]);
  const [stats, setStats] = useState({
    workers: 0,
    payoutsToday: 0,
    fraudBlocked: 0,
    revenue: "0",
    lossRatio: 0
  });

  const fetchData = async () => {
    try {
      const [zonesRes, payoutsRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE}/zones/scores`),
        axios.get(`${API_BASE}/payouts`),
        axios.get(`${API_BASE}/admin/stats`)
      ]);
      setZones(zonesRes.data);
      setPayouts(payoutsRes.data.slice(0, 7)); // Only logic for feed

      setStats({
        workers: statsRes.data.workers || 0,
        payoutsToday: statsRes.data.payoutsSum || 0,
        fraudBlocked: statsRes.data.fraudBlocked || 0,
        revenue: statsRes.data.revenue || "0",
        lossRatio: statsRes.data.lossRatio || 0
      });
    } catch (e) { console.error("Poll error", e); }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getZoneClass = (score) => {
    if (score <= 30) return 'zone-green';
    if (score <= 60) return 'zone-yellow';
    if (score <= 80) return 'zone-red';
    return 'zone-black';
  };

  return (
    <div className="main">
      <div className="topbar">
        <div className="topbar-title">Live Operations Dashboard</div>
        <div className="topbar-right">
          <select className="city-select">
            <option>Bengaluru</option>
            <option>Mumbai</option>
          </select>
          <div className="time-badge">{new Date().toLocaleTimeString()}</div>
          <div className="alert-badge"> {stats.fraudBlocked} Fraud Alerts</div>
        </div>
      </div>

      <div className="content">
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="kpi-label">Active Workers</div>
            <div className="kpi-value green">{stats.workers}</div>
            <div className="kpi-delta up">↑ 12% vs last week</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Payouts Today</div>
            <div className="kpi-value yellow">₹{stats.payoutsToday.toLocaleString()}</div>
            <div className="kpi-delta up">↑ Real-time update</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Fraud Blocked</div>
            <div className="kpi-value red">{stats.fraudBlocked}</div>
            <div className="kpi-delta up" style={{ color: '#00e676' }}>↑ TrustMesh active</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Weekly Revenue</div>
            <div className="kpi-value blue">₹{stats.revenue}</div>
            <div className="kpi-delta up">{(stats.workers || 0).toLocaleString()} workers</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Loss Ratio</div>
            <div className="kpi-value purple">{stats.lossRatio}%</div>
            <div className="kpi-delta up" style={{ color: '#00e676' }}>↓ Healthy (&lt;70%)</div>
          </div>
        </div>

        {/* REGIONAL TRACKER MAP */}
        <AdminRegionMap />

        <div className="two-col" style={{ marginTop: '20px' }}>
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title"> Live Zone Risk Map</div>
              <div className="panel-badge badge-blue">LIVE  15min</div>
            </div>
            <div className="panel-body" style={{ height: '350px', padding: 0 }}>
              <MapContainer center={[22.5937, 78.9629]} zoom={4} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                />
                {zones.map((z, i) => {
                  let color = z.score <= 30 ? '#00e676' : z.score <= 60 ? '#ffd740' : z.score <= 80 ? '#ff5252' : '#b388ff';
                  return (
                    <Marker key={z.id} position={[z.lat || 12.9716 + (Math.random()-0.5)*0.1, z.lng || 77.5946 + (Math.random()-0.5)*0.1]}>
                      <Popup>
                        <div style={{color: '#000'}}>
                          <strong>{z.name}</strong><br/>
                          Risk Score: <span style={{color: color, fontWeight: 'bold'}}>{z.score}</span>/100
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title"> Live Payout Feed</div>
              <div className="panel-badge badge-green">{payouts.length} total</div>
            </div>
            <div className="panel-body">
              <div className="payout-feed">
                {payouts.map(p => (
                  <div key={p.id} className="payout-item">
                    <div className={p.status === 'approved' ? "payout-item-icon pi-green" : "payout-item-icon pi-red"}>
                      {p.status === 'approved' ? '' : ''}
                    </div>
                    <div className="payout-item-info">
                      <div className="payout-item-name">Worker #{p.user_id}</div>
                      <div className="payout-item-detail">BPS Score: {p.bps_score}</div>
                    </div>
                    <div className="payout-item-amt">
                      <div className="payout-item-val" style={{ color: p.status === 'approved' ? '#00e676' : '#ff5252' }}>
                        {p.status === 'approved' ? `+₹${p.payout_amount}` : 'REJECTED'}
                      </div>
                      <div className="payout-item-time">{new Date(p.created_at).toLocaleTimeString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="two-col">
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title"> Weekly Financial Summary</div>
              <div className="panel-badge badge-green">Real System Data</div>
            </div>
            <div className="panel-body">
              <div className="fin-grid">
                <div className="fin-item">
                  <div className="fin-item-val" style={{ color: '#00e676' }}>₹{stats.revenue}</div>
                  <div className="fin-item-lbl">Premium Collected</div>
                </div>
                <div className="fin-item">
                  <div className="fin-item-val" style={{ color: '#ff5252' }}>₹{(stats.payoutsToday/1000).toFixed(2)}K</div>
                  <div className="fin-item-lbl">Total Payouts</div>
                </div>
              </div>
              <div style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#5a6070', marginBottom: '6px' }}>
                  <span>Loss Ratio</span><span style={{ color: '#00e676' }}>{stats.lossRatio}% · Target &lt;70%</span>
                </div>
                <div className="loss-ratio-bar">
                  <div className="loss-ratio-fill" style={{ width: `${stats.lossRatio}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
             <div className="panel-header">
              <div className="panel-title"> System Controls</div>
            </div>
            <div className="panel-body">
               <button 
                onClick={fetchData}
                style={{ background: '#161920', color: '#e8eaf0', border: '1px solid #22262e', padding: '10px', borderRadius: '8px', cursor: 'pointer', width: '100%' }}
              >
                Manual Trigger Sync
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

