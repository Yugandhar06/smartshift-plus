import React, { useState, useEffect, useRef } from 'react';
import './WorkerApp.css';
import { SS } from '../utils/shared';
import ChatAssistantWidget from '../components/ChatAssistantWidget';


const WorkerApp = () => {
  const [shiftActive, setShiftActive] = useState(false);
  const [shiftStart, setShiftStart] = useState(null);
  const [shiftTimer, setShiftTimer] = useState('Not active');
  const [hoursToday, setHoursToday] = useState(0);
  const [ordersToday, setOrdersToday] = useState(0);
  const [earnedToday, setEarnedToday] = useState(0);
  
  const [weekPayout, setWeekPayout] = useState(0);
  const [weekDisruptions, setWeekDisruptions] = useState(0);
  const [weekNet, setWeekNet] = useState(0);
  
  const [scoreNum, setScoreNum] = useState(28);
  const [scoreLevel, setScoreLevel] = useState('LOW RISK');
  const [scoreDesc, setScoreDesc] = useState('Clear skies. Normal order volume. Safe to work.');
  const [scoreColor, setScoreColor] = useState('#00e676');
  const [scoreGlow, setScoreGlow] = useState('#00e67615');
  
  const [pills, setPills] = useState({ rain: 'inactive', aqi: 'inactive', demand: 'inactive', bps: 'inactive' });
  const [triggerAlert, setTriggerAlert] = useState({ show: false, text: '', sub: '' });
  const [payoutNotif, setPayoutNotif] = useState({ show: false, amt: 0, actual: 0, gap: 0, time: '' });
  const [activeModal, setActiveModal] = useState(null);
  const [lastUpdate, setLastUpdate] = useState('just now');

  const shiftIntervalRef = useRef(null);

  const API_URL = 'http://localhost:8000/api';
  const ZONE_ID = SS.get('zone') || 2; 
  const USER_ID = SS.get('worker_id') || 1; 
  const WORKER_NAME = SS.get('worker_name') || 'Ravi';
  const CURRENT_PLAN = SS.get('plan') || 'STANDARD';
  const area = SS.get('area') || 'Koramangala';
  const city = SS.get('city') || 'Bangalore';

  useEffect(() => {
    const clock = setInterval(() => {
      const now = new Date();
      setLastUpdate(now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    }, 60000);
    return () => clearInterval(clock);
  }, []);

  // Poll for Zone Score every 3 seconds for REAL API integration
  useEffect(() => {
    let pollingInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/zones/${ZONE_ID}/score`);
        if (res.ok) {
          const data = await res.json();
          // Update score visually based on API real data
          updateScoreVisuals(data.score, data.signals);
        }
      } catch (err) {
        console.error('Failed to poll zone score:', err);
      }
    }, 3000);
    return () => clearInterval(pollingInterval);
  }, [shiftActive, ordersToday, earnedToday]); // Dependencies for triggering proper events

  const toggleShift = async () => {
    if (!shiftActive) {
      try {
        const payload = {
            user_id: USER_ID,
            zone: "Koramangala",
            lat: 12.9352,
            lng: 77.6245
        };
        const res = await fetch(`${API_URL}/shift/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.shift_id) {
          SS.set('current_shift_id', data.shift_id);
        }
      } catch (err) {
        console.error("Shift start api failed", err);
      }
      setShiftActive(true);
      setShiftStart(Date.now());
      setOrdersToday(3);
      setEarnedToday(300);
      shiftIntervalRef.current = setInterval(() => {
        setShiftStart(prevStart => {
          if (!prevStart) return prevStart;
          const elapsed = Date.now() - prevStart;
          const mins = Math.floor(elapsed / 60000);
          const secs = Math.floor((elapsed % 60000) / 1000);
          const hrs = (elapsed / 3600000).toFixed(1);
          setShiftTimer(`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')} active`);
          setHoursToday(parseFloat(hrs));
          return prevStart;
        });
      }, 1000);
    } else {
      try {
        const shift_id = SS.get('current_shift_id') || 1;
        const endPayload = {
            shift_id: parseInt(shift_id),
            orders_completed: ordersToday,
            earned: earnedToday
        };
        await fetch(`${API_URL}/shift/end`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(endPayload)
        });
      } catch (err) {
        console.error("Shift end api failed", err);
      }
      setShiftActive(false);
      clearInterval(shiftIntervalRef.current);
      setShiftTimer('Ended');
    }
  };

  const updateScoreVisuals = (val, signals = {}) => {
    let color = '#00e676';
    let glow = '#00e67615';
    let level = 'LOW RISK';
    let desc = 'Clear skies. Normal order volume. Safe to work.';

    if (val > 80) { color = '#b388ff'; glow = '#b388ff15'; level = 'EXTREME'; desc = 'Extreme weather/disruption. Full protection active.'; }
    else if (val > 60) { color = '#ff5252'; glow = '#ff525215'; level = 'HIGH RISK'; desc = 'High disruption. Payout trigger active.'; }
    else if (val > 30) { color = '#ffd740'; glow = '#ffd74015'; level = 'MEDIUM RISK'; desc = 'Moderate disruption. Stay alert.'; }

    if (signals.manual_override_desc) {
      desc = signals.manual_override_desc;
    }

    setScoreNum(val);
    setScoreLevel(level);
    setScoreDesc(desc);
    setScoreColor(color);
    setScoreGlow(glow);

    // Signal Pills update
    const nextPills = { rain: 'inactive', aqi: 'inactive', demand: 'inactive', bps: 'inactive' };
    if (signals.rain && signals.rain > 15) nextPills.rain = 'active-r';
    if (signals.order_drop && signals.order_drop > 40) nextPills.demand = 'active-r';
    if (signals.bps_mock_blocked) { nextPills.bps = 'active-r'; color = '#ffd740'; level = 'FRAUD BLOCKED'; desc = 'GPS spoof detected. BPS: 0. Hard block.'; setScoreColor(color); setScoreLevel(level); setScoreDesc(desc); }

    setPills(nextPills);

    // Automating Demo Triggers if score crosses 60
    if (val > 60 && !triggerAlert.show && signals.auto_trigger) {
       handleBackendPayoutTrigger();
    }
  };

  const handleBackendPayoutTrigger = async () => {
    setTriggerAlert({ show: true, text: '�a� Disruption Detected � Payout Triggered', sub: '3-signal validation running...' });
    
    // Step 1: Create a simulated Shift via Admin to get a real Shift ID matching current UI worked stats
    try {
      const shiftRes = await fetch(`${API_URL}/admin/simulate/shift?user_id=${USER_ID}&zone_id=${ZONE_ID}&hours_worked=${hoursToday || 2.0}&earnings=${earnedToday}&orders_completed=${ordersToday}`, { method: 'POST' });
      const shiftData = await shiftRes.json();
      
      if (shiftData.status === 'success') {
         setTimeout(async () => {
           setTriggerAlert(prev => ({ ...prev, sub: '�S& 3/3 signals confirmed � Payout calculating...' }));
           
           // Step 2: Call actual trigger endpoint for calculating payout based on policy rules
           const payoutRes = await fetch(`${API_URL}/payouts/trigger?shift_id=${shiftData.shift_id}`, { method: 'POST' });
           const payoutData = await payoutRes.json();
           
           if (payoutData.status === 'approved') {
              const approvedAmt = payoutData.amount;
              showPayout(approvedAmt, earnedToday, 900 - earnedToday, `��${approvedAmt}`, '18 min');
           } else {
              setTriggerAlert(prev => ({ ...prev, sub: `�: Payout rejected: ${payoutData.reason}` }));
           }
         }, 2000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const showPayout = (amt, actual, gap, amtStr, timeStr) => {
    setWeekPayout(prev => prev + amt);
    setWeekDisruptions(prev => prev + 1);
    setWeekNet(prev => {
      const net = (prev + 249 + amt) - 249; // Simplified
      return net;
    });

    setPayoutNotif({ show: true, amt: amtStr, actual: `��${actual}`, gap: `��${gap}`, time: timeStr, rawAmt: amt });
  };

  // Demo overrides hit the backend to enforce "real integration"
  const overrideBackendScore = async (scoreVal, signalsObj) => {
    if (!shiftActive) toggleShift();
    await fetch(`${API_URL}/zones/${ZONE_ID}/score?score=${scoreVal}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signalsObj)
    });
  };

  const simulateRain = () => {
    overrideBackendScore(63, { auto_trigger: true, rain: 22, order_drop: 58, manual_override_desc: 'Heavy rain 22mm/hr. Deliveries affected. Payout trigger active.' });
  };
  const simulateFlood = () => {
    overrideBackendScore(87, { auto_trigger: true, rain: 50, order_drop: 90, manual_override_desc: 'Flash flood alert. Zero orders required. Full protection active.' });
  };
  const simulateSpoofer = () => {
    overrideBackendScore(65, { bps_mock_blocked: true, manual_override_desc: 'Attempting GPS spoof from home...' });
    setPayoutNotif({ show: false, amt: 0, actual: 0, gap: 0, time: '' });
    setTriggerAlert({ show: true, text: '�xa� TrustMesh: Mock location flag DETECTED', sub: '�xa� BPS: 0/100 � Mock location + flat accelerometer + no zone history' });
  };
  const resetNormal = () => {
    overrideBackendScore(28, { manual_override_desc: 'Clear skies. Normal order volume. Safe to work.' });
    setTriggerAlert({ show: false, text: '', sub: '' });
    setPayoutNotif({ ...payoutNotif, show: false });
  };

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [activePlan, setActivePlan] = useState(null);
  const [eventLogs, setEventLogs] = useState([]);
  
  useEffect(() => {
    setActivePlan({ coverage_ratio: 0.8, max_payout: 800, weekly_premium: 120 });
  }, []);

  const handlePlanSelection = (planName) => {
    setShowPlanModal(false);
  };

  const displayScore = scoreNum;
  const zoneStatus = scoreLevel;

  return (
    <div className="worker-app-wrapper">
      <div className="topbar">
        <div className="topbar-title">
          Smart<span style={{color: 'var(--green)'}}>Shift+</span> Worker Dashboard
        </div>
        <div className="topbar-right">
          <div className="plan-badge">{CURRENT_PLAN} PLAN</div>
          <div className="time-badge">{new Date().toLocaleTimeString()}</div>
          <div className="avatar">{WORKER_NAME ? WORKER_NAME.charAt(0).toUpperCase() : 'W'}</div>
        </div>
      </div>

      <div className="content" style={{maxWidth: '1400px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px'}}>
        
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
          <div className="greeting">
            <h2 style={{fontSize: '28px', margin: '0 0 8px 0'}}>Good evening, {WORKER_NAME}</h2>
            <p style={{color: 'var(--muted)', margin: 0}}>Koramangala • Monday, Week 12 • Active Vehicle: EV Scooty</p>
          </div>
          {shiftActive && <div className="time-badge" style={{color:'var(--green)', border:'1px solid var(--green)'}}>LIVE: {shiftTimer}</div>}
        </div>

        <div className="kpi-row-worker">
          <div className="kpi-card">
            <div className="kpi-label">Hours Logged</div>
            <div className={`kpi-value ${shiftActive ? 'green' : ''}`}>{hoursToday}</div>
            <div className="kpi-delta">Today</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Deliveries</div>
            <div className="kpi-value">{ordersToday}</div>
            <div className="kpi-delta">Today</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Expected Earnings</div>
            <div className="kpi-value purple">₹{earnedToday}</div>
            <div className="kpi-delta">Incl. base pay</div>
          </div>
        </div>

        <div className="worker-app-grid">
          <div className="side-panel">
            {/* SHIFT CONTROL */}
            <div className="kpi-card">
              <div className="kpi-label" style={{fontSize: '18px', color: 'var(--text)', marginBottom:'10px'}}>Shift Control</div>
              <div className="kpi-value" style={{fontSize: '24px', marginBottom:'20px'}}>{shiftTimer}</div>
              <button className={`shift-btn ${shiftActive ? 'stop' : 'start'}`} onClick={toggleShift} style={{width: '100%', padding: '16px', borderRadius: '12px', border: 'none', background: shiftActive ? 'var(--red)' : 'var(--green)', color: shiftActive ? '#fff' : '#000', fontSize: '16px', fontWeight: 800, cursor: 'pointer'}}>
                {shiftActive ? 'End Operations' : 'Start Active Shift'}
              </button>
            </div>

            {/* MY COVERAGE POLICY */}
            <div className="kpi-card">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                <div style={{fontSize: '18px', fontWeight: 600}}>My Coverage</div>
                <button onClick={() => setShowPlanModal(true)} style={{background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer'}}>Upgrade</button>
              </div>
              
              {activePlan ? (
                <div>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', color: 'var(--green)', fontWeight: 'bold', fontSize: '20px', marginBottom: '12px'}}>
                    <span>{parseInt(activePlan.coverage_ratio * 100)}% Covered</span>
                  </div>
                  <div style={{height: '8px', background: '#252830', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px'}}>
                    <div style={{width: `${activePlan.coverage_ratio * 100}%`, height: '100%', background: 'linear-gradient(90deg, #00e676, #b388ff)'}}></div>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--muted)'}}>
                    <span>Max Payout: ₹{activePlan.max_payout}</span>
                    <span>Fee: ₹{activePlan.weekly_premium}/week</span>
                  </div>
                </div>
              ) : (
                <div style={{color: 'var(--muted)', fontSize: '14px'}}>Loading...</div>
              )}
            </div>
            
            {/* ZONE RISK MONITOR */}
            <div className="kpi-card">
              <div style={{fontSize: '18px', fontWeight: 600, marginBottom: '20px'}}>Zone Risk Monitor</div>
              <div style={{display: 'flex', justifyContent: 'center', margin: '20px 0'}}>
                <div id="zone-score-circle" style={{width: '120px', height: '120px', borderRadius: '50%', border: '8px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                  <div id="zone-score-number" style={{fontSize: '32px', fontWeight: 800, fontFamily: 'var(--mono)'}}>{displayScore}</div>
                  <div style={{fontSize: '11px', color: 'var(--muted)'}}>SCORE</div>
                </div>
              </div>
              <div id="zone-score-status" style={{textAlign: 'center', fontSize: '15px', fontWeight: 600, marginBottom: '20px'}}>{zoneStatus}</div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto'}}>
                {eventLogs.length > 0 ? eventLogs.map((log, i) => (
                   <div key={i} style={{display: 'flex', alignItems: 'center', padding: '10px 12px', background: 'var(--surface2)', borderRadius: '8px', fontSize: '12px'}}>
                     <div style={{width: '8px', height: '8px', borderRadius: '50%', background: log.color, marginRight: '10px'}}></div>
                     <div style={{flex: 1, color: 'var(--text)'}}>{log.msg}</div>
                     <div style={{fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: '10px'}}>{log.time}</div>
                   </div>
                )) : (
                   <div style={{color: 'var(--muted)', fontSize: '13px', textAlign: 'center'}}>No recent events.</div>
                )}
              </div>
            </div>
          </div>

          <div className="side-panel">
            <div className="kpi-card">
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                <div style={{fontSize: '18px', fontWeight: 600}}>Weekly Logs</div>
                <div style={{fontSize: '12px', color: 'var(--muted)'}}>Apr 13 - Apr 19</div>
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {[
                  { day: 'Mon', h: '4.2', e: '₹420' },
                  { day: 'Tue', h: '5.1', e: '₹560' },
                  { day: 'Wed', h: '6.0', e: '₹680' },
                  { day: 'Thu', h: '3.5', e: '₹310' },
                  { day: 'Fri', h: '0.0', e: '₹0' },
                  { day: 'Sat', h: '0.0', e: '₹0' },
                  { day: 'Sun', h: '0.0', e: '₹0' }
                ].map((item, idx) => (
                  <div key={idx} style={{display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: item.h === '0.0' ? 'transparent' : 'var(--surface2)', border: item.h === '0.0' ? '1px dashed var(--border)' : '1px solid var(--border)', borderRadius: '8px'}}>
                    <span style={{width: '40px', color: item.h === '0.0' ? 'var(--muted)' : 'var(--text)', fontWeight: item.h === '0.0' ? 400 : 600}}>{item.day}</span>
                    <span style={{flex: 1, fontFamily: 'var(--mono)', color: 'var(--muted)', fontSize: '13px'}}>{item.h} hrs</span>
                    <span style={{fontFamily: 'var(--mono)', fontWeight: 600, color: item.h === '0.0' ? 'var(--muted)' : 'var(--text)'}}>{item.e}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
{activeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#111318', border: '1px solid #22262e', borderRadius: '16px', padding: '30px', maxWidth: '400px', width: '90%', position: 'relative' }}>
            <button onClick={() => setActiveModal(null)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '20px' }}>&times;</button>
            <h3 style={{ color: '#fff', fontSize: '20px', marginBottom: '15px' }}>{activeModal.title}</h3>
            <p style={{ color: '#aaa', fontSize: '15px', lineHeight: '1.5' }}>{activeModal.content}</p>
            {activeModal.action && (
              <button 
                onClick={() => {
                  activeModal.action();
                  setActiveModal(null);
                }} 
                style={{ marginTop: '20px', width: '100%', background: '#00e676', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {activeModal.actionText}
              </button>
            )}
          </div>
        </div>
      )}

      <footer style={{ marginTop: '30px', padding: '40px 24px', background: '#0f1117', borderTop: '1px solid #22262e', borderRadius: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '40px', marginBottom: '40px' }}>
          <div style={{ flex: '1 1 300px' }}>
            <h3 style={{ fontSize: '24px', margin: '0 0 16px 0', letterSpacing: '-0.5px' }}>
              Smart<span style={{ color: '#00e676' }}>Shift+</span>
            </h3>
            <p style={{ color: '#8a94a6', fontSize: '15px', lineHeight: '1.6', maxWidth: '300px' }}>Empowering operations globally with AI-driven zone intelligence and robust worker protection.</p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <div 
                onClick={() => setActiveModal({ title: 'About Us', content: 'SmartShift+ is the next generation platform connecting gig workers with real-time risk intelligence, transparent payouts, and insurance policies to ensure safe and predictable earnings.'})} 
                style={{ cursor: 'pointer', display: 'inline-block', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '13px', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                About Us
              </div>
            </div>
          </div>
          
          <div style={{ flex: '1 1 150px' }}>
            <h4 style={{ color: '#e8eaf0', fontSize: '16px', marginBottom: '20px', fontWeight: 600 }}>Support Center</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div 
                onClick={() => setActiveModal({ title: 'Help Center', content: 'Our Knowledge Base is currently being updated. For immediate assistance regarding active orders, app issues, or payouts, please contact your hub supervisor directly.'})}
                style={{ margin: 0, color: '#8a94a6', fontSize: '14px', cursor: 'pointer', transition: 'color 0.2s', textDecoration: 'underline', textDecorationColor: 'transparent' }} onMouseOver={e => e.target.style.color = '#00e676'} onMouseOut={e => e.target.style.color = '#8a94a6'}>
                FAQ & Help
              </div>
              <div 
                onClick={() => setActiveModal({ 
                  title: 'Contact Supervisor', 
                  content: `Your assigned supervisor for the ${area} zone is on duty. Do you need immediate assistance?`,
                  actionText: 'Request Call Back',
                  action: () => alert('A call back request has been sent to your supervisor.')
                })}
                style={{ margin: 0, color: '#8a94a6', fontSize: '14px', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#00e676'} onMouseOut={e => e.target.style.color = '#8a94a6'}>
                Live Support
              </div>
              <div 
                onClick={() => setActiveModal({ title: 'Report Fraud', content: 'Noticed something suspicious? TrustMesh keeps the platform fair. Use the anonymous reporting tool in your profile settings to flag incidents.'})}
                style={{ margin: 0, color: '#8a94a6', fontSize: '14px', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#00e676'} onMouseOut={e => e.target.style.color = '#8a94a6'}>
                TrustMesh Report
              </div>
            </div>
          </div>
          
          <div style={{ flex: '1 1 150px' }}>
            <h4 style={{ color: '#e8eaf0', fontSize: '16px', marginBottom: '20px', fontWeight: 600 }}>Operations</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div 
                onClick={() => setActiveModal({ title: 'Zone Settings', content: `Current Home Zone: ${area}, ${city}\n\nTo change your working region, please visit the Regional Map or submit a transfer request.`})}
                style={{ margin: 0, color: '#8a94a6', fontSize: '14px', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#00e676'} onMouseOut={e => e.target.style.color = '#8a94a6'}>
                HQ Location
              </div>
              <div 
                onClick={() => setActiveModal({ title: 'Current Plan', content: `Your active coverage is the ${CURRENT_PLAN} Plan. It protects your earnings against rain delays and high-risk zones.`})}
                style={{ margin: 0, color: '#8a94a6', fontSize: '14px', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#00e676'} onMouseOut={e => e.target.style.color = '#8a94a6'}>
                Protection Plans
              </div>
            </div>
          </div>
        </div>
        
        <div style={{ borderTop: '1px solid #22262e', paddingTop: '24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
          <div style={{ color: '#5a6070', fontSize: '13px' }}>
            &copy; {new Date().getFullYear()} SmartShift+ Technologies Inc.
          </div>
          <div style={{ display: 'flex', gap: '20px', color: '#5a6070', fontSize: '13px' }}>
            <span style={{ cursor: 'pointer' }} onClick={() => setActiveModal({ title: 'Privacy Policy', content: 'We protect your data securely. Your location is only tracked during active shifts to compute Zone Scores and guarantee your safety.' })}>Privacy Policy</span>
            <span style={{ cursor: 'pointer' }} onClick={() => setActiveModal({ title: 'Terms of Service', content: 'By using SmartShift+, you agree to local labor guidelines and our TrustMesh velocity guidelines.' })}>Terms of Service</span>
          </div>

        </div>
      </footer>

    </div>

      <ChatAssistantWidget />
    
      {/* PLAN CHANGE MODAL */}
      {showPlanModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div style={{background: 'var(--surface)', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '400px', border: '1px solid var(--border)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h3 style={{margin: 0}}>Upgrade Coverage</h3>
              <button onClick={() => setShowPlanModal(false)} style={{background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '20px', cursor: 'pointer'}}>×</button>
            </div>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {['light', 'regular', 'standard', 'pro', 'max'].map(p => (
                <button key={p} onClick={() => handlePlanSelection(p)} style={{display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', cursor: 'pointer', textAlign: 'left'}}>
                  <span style={{textTransform: 'capitalize', fontWeight: 600}}>{p}</span>
                  <span style={{color: 'var(--green)', fontFamily: 'var(--mono)'}}>Select</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerApp;