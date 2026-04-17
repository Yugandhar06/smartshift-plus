import React, { useState, useEffect, useRef } from 'react';
import './DemoController.css';

const DemoController = () => {
  const [logs, setLogs] = useState([{ time: '--:--:--', msg: 'SmartShift+ Demo Controller ready. Select a scenario to begin.', color: 'muted' }]);
  const [sigs, setSigs] = useState({
    sig1: { state: '', label: 'IDLE' },
    sig2: { state: '', label: 'IDLE' },
    sig3: { state: '', label: 'IDLE' }
  });
  const [bpsScore, setBpsScore] = useState('-');
  const [bpsFill, setBpsFill] = useState({ width: '0%', bg: '#00e676', text: '#00e676' });
  const [bpsChecks, setBpsChecks] = useState({
    mock: { pass: null, label: '✓ Mock location flag absent' },
    variance: { pass: null, label: '✓ GPS noise variance natural' },
    accel: { pass: null, label: '✓ Accelerometer motion present' },
    velocity: { pass: null, label: '✓ Velocity check passed' },
    activity: { pass: null, label: '✓ Pre-disruption activity exists' },
    ring: { pass: null, label: '✓ Not in ring cluster' }
  });
  const [result, setResult] = useState({ show: false, blocked: false, icon: '', title: '', amount: '', detail: '', time: '' });

  const logEndRef = useRef(null);

  // Sync API
  const API_URL = 'http://localhost:8000/api';
  const ZONE_ID = 2; // Koramangala

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (msg, color = 'white') => {
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, { time, msg, color }]);
  };

  const clearLog = () => {
    setLogs([{ time: '--:--:--', msg: 'Log cleared.', color: 'muted' }]);
  };

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  // Common setups
  const resetBoard = () => {
    setResult({ show: false, blocked: false, icon: '', title: '', amount: '', detail: '', time: '' });
    setSigs({
      sig1: { state: '', label: 'IDLE' },
      sig2: { state: '', label: 'IDLE' },
      sig3: { state: '', label: 'IDLE' }
    });
    setBpsScore('-');
    setBpsFill({ width: '0%', bg: '#00e676', text: '#00e676' });
    setBpsChecks({
      mock: { pass: null, label: '✓ Mock location flag absent' },
      variance: { pass: null, label: '✓ GPS noise variance natural' },
      accel: { pass: null, label: '✓ Accelerometer motion present' },
      velocity: { pass: null, label: '✓ Velocity check passed' },
      activity: { pass: null, label: '✓ Pre-disruption activity exists' },
      ring: { pass: null, label: '✓ Not in ring cluster' }
    });
  };

  const setSignal = (id, state, label) => {
    setSigs(prev => ({ ...prev, [id]: { state, label } }));
  };

  const setCheck = (id, pass, customLabel) => {
    setBpsChecks(prev => ({
      ...prev,
      [id]: { pass, label: (pass ? 'S- ' : 'S✓ ') + (customLabel || prev[id].label.slice(2)) }
    }));
  };

  const animateBPS = async (targetScore) => {
    let current = 0;
    const interval = Math.floor(600 / targetScore);
    for (let i = 0; i <= targetScore; i++) {
        current = i;
        let bg = '#00e676';
        if (current < 25) bg = '#ff5252';
        else if (current < 50) bg = '#ffd740';
        else if (current < 75) bg = '#40c4ff';

        setBpsScore(current);
        setBpsFill({ width: current + '%', bg, text: bg });
        await delay(interval);
    }
  };

  const overrideBackendScore = async (scoreVal, signalsObj) => {
    try {
      await fetch(`${API_URL}/zones/${ZONE_ID}/score?score=${scoreVal}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signalsObj)
      });
    } catch(e) { console.error('Demo backend error', e) }
  };

  // SCENE 1
  const runScenario1 = async () => {
    resetBoard();
    addLog('***  SCENE 1: Genuine Worker — Heavy Rain *** ', 'blue');
    await delay(200); addLog('Worker: Ravi K. | Zone: Koramangala | Plan: Standard', 'muted');
    await delay(200); addLog('Shift active since 6:00 PM | PEB for this slot: ₹900', 'muted');
    await delay(200); addLog('', 'muted');
    await delay(200); addLog('[SAFARSCORE] Score polling... current: 38 (Medium)', 'white');
    await delay(400); addLog('[SAFARSCORE] Rain detected: 14mm/hr   Score: 52', 'yellow');
    
    // TRIGER BACKEND!
    overrideBackendScore(63, { auto_trigger: true, rain: 22, order_drop: 58, bps_mock_blocked: false });

    await delay(600); addLog('[SAFARSCORE] Rain intensifying: 22mm/hr   Score: 63 a TRIGGER THRESHOLD CROSSED', 'red');
    await delay(200); addLog('', 'muted');
    await delay(200); addLog('[3-SIGNAL] Validation engine fired. Checking 3 signals...', 'blue');

    await delay(200); setSignal('sig1', 'checking', 'CHECKING');
    await delay(100); addLog('[SIGNAL 1] Checking external disruption source...', 'yellow');
    await delay(700); addLog('[SIGNAL 1] OpenWeatherMap: 22.3mm/hr - threshold >15mm S-', 'green');
    await delay(300); addLog('[SIGNAL 1] IMD flood advisory: Not issued', 'muted');
    await delay(300); addLog('[SIGNAL 1] CONFIRMED S-', 'green');
    setSignal('sig1', 'confirmed', 'CONFIRMED S-');

    await delay(100); setSignal('sig2', 'checking', 'CHECKING');
    await delay(100); addLog('', 'muted');
    addLog('[TRUSTMESH] BPS calculation initiated for Ravi K.', 'blue');

    await delay(200); setCheck('mock', true, 'Mock location flag absent (+20pts)');
    await delay(100); addLog('[BPS] Mock location flag: Clean (+20 pts)', 'green');
    
    await delay(300); setCheck('variance', true, 'GPS noise variance natural (+15pts)');
    await delay(100); addLog('[BPS] GPS variance: 4.2m StdDev (natural) (+15 pts)', 'green');

    await delay(300); setCheck('accel', true, 'Accelerometer motion present (+15pts)');
    await delay(100); addLog('[BPS] Accelerometer: 1.82 m/s road vibration (+15 pts)', 'green');

    await delay(300); setCheck('velocity', true, 'Velocity check passed (+15pts)');
    await delay(100); addLog('[BPS] Velocity: 18 km/hr (consistent with bike delivery) (+15 pts)', 'green');

    await delay(300); setCheck('activity', true, 'Pre-disruption activity exists (+20pts)');
    await delay(100); addLog('[BPS] Pre-disruption: 3 orders confirmed in zone (last 4 hrs) (+20 pts)', 'green');

    await delay(300); setCheck('ring', true, 'Not in ring cluster (+15pts)');
    await delay(100); addLog('[BPS] Ring check: No anomalous cluster in zone (+15 pts)', 'green');

    await delay(200); animateBPS(91);
    await delay(600); addLog('[BPS] FINAL SCORE: 91/100   Signal 2 CONFIRMED S-', 'green');
    setSignal('sig2', 'confirmed', 'BPS 91 S-');

    await delay(200); setSignal('sig3', 'checking', 'CHECKING');
    await delay(100); addLog('', 'muted');
    addLog('[SIGNAL 3] Checking zone demand drop...', 'yellow');
    await delay(500); addLog('[SIGNAL 3] Swiggy orders in Koramangala: dropped 58% in last 20 min', 'white');
    await delay(500); addLog('[SIGNAL 3] Threshold: >40% drop required - CONFIRMED S-', 'green');
    setSignal('sig3', 'confirmed', 'CONFIRMED S-');

    await delay(200); addLog('', 'muted');
    addLog('[VALIDATION] Result: 3/3 signals confirmed   Confidence: 100%', 'green');
    await delay(400); addLog('[EFFORT CHECK] Score 65 (High)   min 1 order required   Ravi: 3 orders S-', 'green');
    await delay(200); addLog('', 'muted');
    addLog('[PAYOUT] Calculating...', 'blue');
    await delay(200); addLog('[PAYOUT] PEB (6-10 PM Wed): ₹900', 'white');
    await delay(200); addLog('[PAYOUT] Actual earnings: ₹300', 'white');
    await delay(200); addLog('[PAYOUT] Gap: ₹600', 'white');
    await delay(200); addLog('[PAYOUT] ✓ Standard plan (70%) = ₹420', 'white');
    await delay(200); addLog('[PAYOUT] ✓ 3/3 confidence (100%) = ₹420', 'white');
    await delay(300); addLog('[PAYOUT] S& Initiating UPI transfer: ₹420   Ravi K. / PhonePe', 'green');
    await delay(400); addLog('[UPI] Transfer initiated via Razorpay...', 'yellow');
    await delay(600); addLog('[UPI] S& ₹420 CREDITED - 18 minutes from trigger', 'green');

    await delay(400);
    setResult({ show: true, blocked: false, icon: 'x', title: 'Payout Approved', amount: '₹420', detail: 'UPI  PhonePe  Ravi K.  Koramangala', time: 'a 18 minutes from trigger to payment' });
  };

  // SCENE 2
  const runScenario2 = async () => {
    resetBoard();
    overrideBackendScore(65, { auto_trigger: false, bps_mock_blocked: true });
    
    addLog('***  SCENE 2: GPS Spoofer - Hard Block *** ', 'red');
    await delay(200); addLog('Actor: Worker #4921 | Using: FakeGPS Pro v4.2', 'muted');
    await delay(200); addLog('Actual location: Home (Bellandur) | Claimed zone: Koramangala', 'muted');
    await delay(200); addLog('Plan: Standard | Shift activated remotely', 'muted');
    await delay(100); addLog('', 'muted');
    await delay(200); addLog('[TRUSTMESH] BPS check initiated...', 'blue');

    await delay(100); setSignal('sig2', 'checking', 'CHECKING');
    await delay(200); setCheck('mock', false, 'Mock location flag absent');
    await delay(100); addLog('[BPS] [!] MOCK LOCATION FLAG DETECTED - location.mocked = true', 'red');
    await delay(400); addLog('[BPS] Hard block triggered immediately. No further checks needed.', 'red');
    await delay(400); addLog('[BPS] FINAL SCORE: 0/100   HARD BLOCK', 'red');

    animateBPS(0);
    await delay(100);
    ['variance', 'accel', 'velocity', 'activity', 'ring'].forEach(k => setCheck(k, false));
    await delay(100); setSignal('sig2', 'failed', 'BLOCKED [!]');

    await delay(100); addLog('', 'muted');
    await delay(100); addLog('[3-SIGNAL] Signal 2 hard rejected. Cannot proceed.', 'red');
    await delay(300); addLog('[SYSTEM] Shift forcibly terminated for #4921', 'red');
    await delay(300); addLog('[SYSTEM] Device fingerprint logged. Account flagged.', 'yellow');
    await delay(300); addLog('[PAYOUT] ₹0. No transfer initiated.', 'red');
    await delay(300); addLog('[AUDIT] Fraud attempt logged: GPS_SPOOF_MOCK_FLAG | 19:42:18', 'muted');

    await delay(400);
    setResult({ show: true, blocked: true, icon: '[X]', title: 'Hard Blocked - GPS Spoof Detected', amount: '₹0', detail: 'Mock location flag detected  Account flagged  BPS: 0/100', time: 'a Blocked in < 1 second. No payout.' });
  };

  const runScenario3 = async () => {};
  const runScenario4 = async () => {};

  return (
    <div className="demo-controller-wrapper">
      <nav className="nav">
        <div className="nav-logo">Smart<span>Shift+</span></div>
        <div className="nav-tag">x} DEMO CONTROLLER</div>
      </nav>

      <div className="content">
        <div className="demo-header">
          <h1>Judge <span>Demo Panel</span></h1>
          <p>Trigger any scenario in real-time. Watch the system respond — signals, BPS, validation, and payout — step by step.</p>
        </div>

        {/* SCENARIO CARDS */}
        <div className="scenarios">
          <div className="scenario-card s1">
            <div className="s-number">Scene 01</div>
            <div className="s-icon">[1]</div>
            <div className="s-title">Genuine Worker<br/>Heavy Rain</div>
            <div className="s-desc">Ravi is actively working in Koramangala. Heavy rain hits. SafarScore crosses 60. All 3 signals confirm. Payout fires automatically.</div>
            <div className="s-outcome green">Expected: ₹420 in 18 minutes</div>
            <button className="s-run-btn" onClick={runScenario1}>Run Scene 1</button>
          </div>

          <div className="scenario-card s2">
            <div className="s-number">Scene 02</div>
            <div className="s-icon">[2]</div>
            <div className="s-title">GPS Spoofer<br/>Hard Blocked</div>
            <div className="s-desc">Fraudster installs GPS spoofing app. Fakes location to Red Zone. TrustMesh detects mock location flag + flat accelerometer + no zone history.</div>
            <div className="s-outcome red">Expected: Hard block in &lt;1 second</div>
            <button className="s-run-btn" onClick={runScenario2}>Run Scene 2</button>
          </div>

          <div className="scenario-card s3">
            <div className="s-number">Scene 03</div>
            <div className="s-icon">[3]</div>
            <div className="s-title">Telegram Ring<br/>of 500 Workers</div>
            <div className="s-desc">200 activations in JP Nagar. 62% have no history. Ring detection fires. Zone hold activated.</div>
            <div className="s-outcome yellow">Expected: Zone hold in 90 seconds</div>
            <button className="s-run-btn" onClick={runScenario3}>Run Scene 3</button>
          </div>

          <div className="scenario-card s4">
            <div className="s-number">Scene 04</div>
            <div className="s-icon">[4]`</div>
            <div className="s-title">Extreme Flood<br/>Full Protection</div>
            <div className="s-desc">Bengaluru flash flood. Score hits 87. Extreme event - zero orders required. GPS presence alone triggers full payout.</div>
            <div className="s-outcome purple">Expected: ₹720 extreme payout</div>
            <button className="s-run-btn" onClick={runScenario4}>Run Scene 4</button>
          </div>
        </div>

        {/* SIGNAL VISUALIZER */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>3-Signal Validation Status</div>
          <div className="signal-viz">
            <div className={`sig-card ${sigs.sig1.state}`}>
              <div className="sig-icon">S1</div>
              <div className="sig-name">Signal 1<br/>External Event</div>
              <div className="sig-status">{sigs.sig1.label}</div>
            </div>
            <div className={`sig-card ${sigs.sig2.state}`}>
              <div className="sig-icon">S2</div>
              <div className="sig-name">Signal 2<br/>TrustMesh BPS</div>
              <div className="sig-status">{sigs.sig2.label}</div>
            </div>
            <div className={`sig-card ${sigs.sig3.state}`}>
              <div className="sig-icon">S3</div>
              <div className="sig-name">Signal 3<br/>Demand Drop</div>
              <div className="sig-status">{sigs.sig3.label}</div>
            </div>
          </div>
        </div>

        {/* BPS METER */}
        <div className="bps-meter">
          <div className="bps-header">
            <div className="bps-title">TrustMesh Behavioral Presence Score (BPS)</div>
            <div className="bps-score" style={{ color: bpsFill.text }}>{bpsScore}</div>
          </div>
          <div className="bps-track"><div className="bps-fill" style={{ width: bpsFill.width, background: bpsFill.bg }}></div></div>
          <div className="bps-checks">
            {Object.values(bpsChecks).map((chk, i) => (
              <div key={i} className={`bps-check ${chk.pass === true ? 'pass' : chk.pass === false ? 'fail' : ''}`}>{chk.label}</div>
            ))}
          </div>
        </div>

        {/* LIVE CONSOLE */}
        <div className="console-panel">
          <div className="console-header">
            <div className="console-title"><div className="console-dot"></div>System Log</div>
            <div className="console-clear" onClick={clearLog}>Clear</div>
          </div>
          <div className="console-body">
            {logs.map((L, i) => (
              <div key={i} className="log-line">
                <span className="log-time">{L.time}</span>
                <span className={`log-msg ${L.color}`}>{L.msg}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* PAYOUT RESULT */}
        <div className={`payout-result ${result.show ? 'show' : ''} ${result.blocked ? 'blocked' : ''}`}>
          <div className="result-icon">{result.icon}</div>
          <div className={`result-title ${result.blocked ? 'red' : 'green'}`}>{result.title}</div>
          <div className={`result-amount ${result.blocked ? 'red' : ''}`}>{result.amount}</div>
          <div className="result-detail">{result.detail}</div>
          <div className="result-time" style={{ color: result.blocked ? '#ff5252' : '#00e676' }}>{result.time}</div>
        </div>
      </div>
    </div>
  );
};

export default DemoController;