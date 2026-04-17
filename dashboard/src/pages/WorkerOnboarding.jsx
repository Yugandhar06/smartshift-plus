import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './WorkerOnboarding.css';
import { SS } from '../utils/shared';
import { CITY_AREAS } from '../constants/locations';

export default function WorkerOnboarding() {
  const [currentScreen, setCurrentScreen] = useState(1);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Bangalore');
  const [area, setArea] = useState('Indiranagar');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [platform, setPlatform] = useState('swiggy');
  const [plan, setPlan] = useState('Standard');
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  const steps = [null, 14, 28, 42, 56, 70, 85];

  const handlePhoneChange = (e) => setPhone(e.target.value);
  const handleNameChange = (e) => setName(e.target.value);

  const handleOtpChange = (index, value) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
  };

  const handleNext = async (nextScreen) => {
    // API logic on certain screens
    if (nextScreen === 3) {
      // Trying to authenticate or create user after OTP
      try {
        const fullPhone = phone;
        // Check if user exists
        let res = await fetch(`http://localhost:8000/api/auth/login?phone=${encodeURIComponent(fullPhone)}`, {
          method: 'POST'
        });
        
          let userData;
          if (res.ok) {
            userData = await res.json();
            setUserId(userData.id);
            SS.set('worker_id', userData.id);
            SS.set('worker_name', userData.name || name || 'Rider');
            SS.set('zone', userData.home_zone_id || 1);
            SS.set('city', userData.city || city);
            SS.set('area', userData.area || area);
            SS.set('role', 'rider');
            window.location.href = '/worker/app'; // <--- FIX: redirect to dashboard immediately
            return; // prevent setting current screen to 3
          } else {
            // If not exists, signup
            res = await fetch(`http://localhost:8000/api/auth/signup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: fullPhone,
                name: name || 'Rider', // Use typed name or Default
                city: city,
                area: area,
                platform: platform,
                role: 'rider',
                home_zone_id: 1
              })
            });
            if (res.ok) {
              userData = await res.json();
              setUserId(userData.id);
              SS.set('worker_id', userData.id);
              SS.set('worker_name', userData.name || name || 'Rider');
              SS.set('zone', userData.home_zone_id || 1);
              SS.set('city', userData.city || city);
              SS.set('area', userData.area || area);
              SS.set('role', 'rider');
            }
        }
      } catch (err) {
        console.error("Auth error", err);
      }
    }

    if (nextScreen === 6) {
      // Save Policy
      if (userId) {
        const planDetails = {
          'Light': { weekly_premium: 99, coverage_ratio: 0.60, max_payout: 1500, hours_limit: 15 },
          'Regular': { weekly_premium: 179, coverage_ratio: 0.65, max_payout: 2500, hours_limit: 35 },
          'Standard': { weekly_premium: 249, coverage_ratio: 0.70, max_payout: 3500, hours_limit: 55 },
          'Pro': { weekly_premium: 349, coverage_ratio: 0.80, max_payout: 5000, hours_limit: 70 },
        }[plan];

        try {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() + (1 + 7 - startDate.getDay()) % 7); // Next Monday
          await fetch(`http://localhost:8000/api/users/${userId}/plans`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              plan_type: plan,
              status: "active",
              start_date: startDate.toISOString(),
              ...planDetails
            })
          });
          
          SS.set('plan', plan);
          SS.set('platform', platform);
          SS.set('role', 'rider'); // Ensure it's set
          window.location.href = '/worker/app'; // Redirect to worker app
        } catch (err) {
          console.error("Policy error", err);
        }
      } else {
         window.location.href = '/worker/app'; // Redirect to worker app anyway for demo if needed
      }
    }

    setCurrentScreen(nextScreen);
    window.scrollTo(0, 0);
  };

  return (
    <div className="onboarding-wrapper" style={{ flex: 1, position: 'relative' }}>
      <div className="progress-bar"><div className="progress-fill" style={{ width: `${steps[currentScreen]}%` }}></div></div>

      <nav className="nav">
        <div className="nav-logo">Smart<span>Shift+</span></div>
        <div className="step-indicator">Step <span>{currentScreen}</span> of 6</div>
      </nav>

      {currentScreen === 1 && (
        <div className="screen active">
          <div className="hero">
            <div className="hero-icon"></div>
            <h1>Your income,<br/><span>protected.</span></h1>
            <p>SmartShift+ pays you automatically when rain, floods, or outages stop you from working. No claims. No waiting. Money in your UPI in under 30 minutes.</p>
          </div>
          <div className="form-group">            <label className="form-label">Full Name</label>
            <input className="form-input" type="text" placeholder="John Doe" value={name} onChange={handleNameChange} />
          </div>
          <div className="form-group">            <label className="form-label">Mobile Number</label>
            <input className="form-input" type="tel" placeholder="+91 98765 43210" value={phone} onChange={handlePhoneChange} />
          </div>          <div className="form-group">
            <label className="form-label">Select City</label>
            <select className="form-input" value={city} onChange={(e) => {
              setCity(e.target.value);
              setArea(CITY_AREAS[e.target.value][0]); // Reset area when city changes
            }}>
              {Object.keys(CITY_AREAS).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Select Area</label>
            <select className="form-input" value={area} onChange={(e) => setArea(e.target.value)}>
              {CITY_AREAS[city].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>          <button className="cta-btn" onClick={() => handleNext(2)}>Get OTP →</button>
          <div className="info-box"><strong>15M+ delivery workers</strong> lose 20–30% monthly income to weather disruptions. SmartShift+ is built to fix that.</div>          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={{ color: '#5a6070', fontSize: '13px', cursor: 'pointer' }} onClick={() => navigate('/admin-login')}>Are you an Admin? Login here</span>
          </div>        </div>
      )}

      {currentScreen === 2 && (
        <div className="screen active">
          <div className="hero">
            <div className="hero-icon"></div>
            <h1>Verify your<br/><span>number</span></h1>
            <p>OTP sent to {phone}</p>
          </div>
          <div className="form-group">
            <label className="form-label">Enter OTP</label>
            <div className="otp-row">
              {otp.map((val, i) => (
                <input key={i} className="otp-box" maxLength="1" value={val} onChange={(e) => handleOtpChange(i, e.target.value)} />
              ))}
            </div>
          </div>
          <button className="cta-btn" onClick={() => handleNext(3)}> Verify OTP →</button>
          <button className="cta-btn secondary" onClick={() => handleNext(1)}>← Back</button>
        </div>
      )}

      {currentScreen === 3 && (
        <div className="screen active">
          <div className="hero">
            <div className="hero-icon"></div>
            <h1>Link your<br/><span>platform</span></h1>
            <p>SmartShift+ reads your earning history to build your personal protection baseline.</p>
          </div>
          <div className="platform-grid">
            <div className={`platform-btn ${platform === 'swiggy' ? 'selected' : ''}`} onClick={() => setPlatform('swiggy')}>
              <div className="platform-logo"></div>
              <div>
                <div className="platform-name">Swiggy</div>
                <div className="platform-sub">Food delivery partner</div>
              </div>
              <div className="platform-check"></div>
            </div>
            <div className={`platform-btn ${platform === 'zomato' ? 'selected' : ''}`} onClick={() => setPlatform('zomato')}>
              <div className="platform-logo"></div>
              <div>
                <div className="platform-name">Zomato</div>
                <div className="platform-sub">Food delivery partner</div>
              </div>
              <div className="platform-check"></div>
            </div>
            <div className={`platform-btn ${platform === 'zepto' ? 'selected' : ''}`} onClick={() => setPlatform('zepto')}>
              <div className="platform-logo"></div>
              <div>
                <div className="platform-name">Zepto / Blinkit</div>
                <div className="platform-sub">Grocery & Q-Commerce</div>
              </div>
              <div className="platform-check"></div>
            </div>
          </div>
          <button className="cta-btn" onClick={() => handleNext(4)} style={{ marginTop: '20px' }}>Authorize & Continue →</button>
          <button className="cta-btn secondary" onClick={() => handleNext(2)}>← Back</button>
        </div>
      )}

      {currentScreen === 4 && (
        <div className="screen active">
          <div className="hero" style={{ paddingBottom: '12px' }}>
            <div className="hero-icon"></div>
            <h1>Your personal<br/><span>baseline</span></h1>
            <p>AI analyzed 8 weeks of your {platform.charAt(0).toUpperCase() + platform.slice(1)} earnings. Here's what it learned about you.</p>
          </div>
          <div className="peb-card">
            <div className="peb-title"> Personal Earning Baseline (PEB)</div>
            <div className="peb-bars">
              <div className="peb-row">
                <div className="peb-time">9–12 AM</div>
                <div className="peb-bar-track">
                  <div className="peb-bar-fill" style={{ width: '30%' }}>₹270</div>
                </div>
              </div>
              <div className="peb-row">
                <div className="peb-time">12–3 PM</div>
                <div className="peb-bar-track">
                  <div className="peb-bar-fill" style={{ width: '40%' }}>₹360</div>
                </div>
              </div>
              <div className="peb-row">
                <div className="peb-time">3–6 PM</div>
                <div className="peb-bar-track">
                  <div className="peb-bar-fill" style={{ width: '50%' }}>₹450</div>
                </div>
              </div>
              <div className="peb-row">
                <div className="peb-time">6–10 PM</div>
                <div className="peb-bar-track">
                  <div className="peb-bar-fill" style={{ width: '100%' }}>₹900</div>
                </div>
              </div>
              <div className="peb-row">
                <div className="peb-time">10 PM+</div>
                <div className="peb-bar-track">
                  <div className="peb-bar-fill" style={{ width: '25%' }}>₹220</div>
                </div>
              </div>
            </div>
            <div className="peb-insight">
              <strong>AI Insight:</strong> You earn most on <strong>weekday evenings (6–10 PM)</strong> in Koramangala. If a disruption hits in that window, payout is calculated against <strong>₹900</strong> — not a city average.
            </div>
          </div>
          <button className="cta-btn" onClick={() => handleNext(5)}>This looks right →</button>
          <button className="cta-btn secondary" onClick={() => handleNext(3)}>← Back</button>
        </div>
      )}

      {currentScreen === 5 && (
        <div className="screen active">
          <div className="hero" style={{ paddingBottom: '12px' }}>
            <div className="hero-icon"></div>
            <h1>Choose your<br/><span>plan</span></h1>
            <p>AI recommends <strong style={{ color: 'var(--green)' }}>Standard</strong> based on your 55 hrs/week pattern. Pay only for what you need.</p>
          </div>
          <div className="plans">
            {[
              { id: 'Light', desc: 'Up to 15 hrs/week · 60% coverage', price: '₹99' },
              { id: 'Regular', desc: 'Up to 35 hrs/week · 65% coverage', price: '₹179' },
              { id: 'Standard', desc: 'Up to 55 hrs/week · 70% coverage', price: '₹249', rec: true },
              { id: 'Pro', desc: 'Up to 70 hrs/week · 80% coverage', price: '₹349' },
            ].map(p => (
              <div key={p.id} className={`plan-opt ${plan === p.id ? 'selected' : ''} ${p.rec ? 'recommended' : ''}`} onClick={() => setPlan(p.id)}>
                <div className="plan-opt-left">
                  <div className="plan-name-row">
                    <span className="plan-name">{p.id}</span>
                    {p.rec && <span className="plan-rec-badge">AI PICK</span>}
                  </div>
                  <div className="plan-desc">{p.desc}</div>
                </div>
                <div>
                  <div className="plan-price">{p.price}<span>/week</span></div>
                  <div className="plan-radio" style={{ marginLeft: 'auto', marginTop: '6px' }}></div>
                </div>
              </div>
            ))}
          </div>
          <button className="cta-btn" onClick={() => handleNext(6)}>Continue with {plan} →</button>
          <button className="cta-btn secondary" onClick={() => handleNext(4)}>← Back</button>
        </div>
      )}

      {currentScreen === 6 && (
        <div className="screen active">
          <div className="success-hero">
            <div className="success-icon"></div>
            <h1>You're <span>covered!</span></h1>
            <p>SmartShift+ is now protecting your income. Coverage starts Monday.</p>
          </div>

          <div className="kyc-steps">
            <div className="kyc-step done">
              <div className="kyc-icon"></div>
              <div className="kyc-text">
                <div className="kyc-name">Mobile Verified</div>
                <div className="kyc-sub">{phone}</div>
              </div>
              <div className="kyc-status"> Done</div>
            </div>
            <div className="kyc-step done">
              <div className="kyc-icon"></div>
              <div className="kyc-text">
                <div className="kyc-name">Platform Linked</div>
                <div className="kyc-sub">{platform.charAt(0).toUpperCase() + platform.slice(1)} · Koramangala</div>
              </div>
              <div className="kyc-status"> Done</div>
            </div>
            <div className="kyc-step done">
              <div className="kyc-icon"></div>
              <div className="kyc-text">
                <div className="kyc-name">PEB Created</div>
                <div className="kyc-sub">8 weeks analyzed</div>
              </div>
              <div className="kyc-status"> Done</div>
            </div>
            <div className="kyc-step done">
              <div className="kyc-icon"></div>
              <div className="kyc-text">
                <div className="kyc-name">UPI Autopay Set</div>
                <div className="kyc-sub">PhonePe · Every Monday</div>
              </div>
              <div className="kyc-status"> Done</div>
            </div>
          </div>

          <div className="coverage-summary" style={{ marginTop: '16px' }}>
            <div className="coverage-row">
              <span className="coverage-label">Plan</span>
              <span className="coverage-val green">{plan}</span>
            </div>
            <div className="coverage-row">
              <span className="coverage-label">Weekly Premium</span>
              <span className="coverage-val green">₹{plan === 'Light' ? 99 : plan === 'Regular' ? 179 : plan === 'Standard' ? 249 : 349}</span>
            </div>
            <div className="coverage-row">
              <span className="coverage-label">Max Payout</span>
              <span className="coverage-val">₹{plan === 'Light' ? '1,500' : plan === 'Regular' ? '2,500' : plan === 'Standard' ? '3,500' : '5,000'}/week</span>
            </div>
            <div className="coverage-row">
              <span className="coverage-label">First Billing</span>
              <span className="coverage-val">Upcoming Monday — 6:00 AM</span>
            </div>
          </div>

          <div className="upi-confirm">
             UPI Autopay mandate created · PhonePe · ₹{plan === 'Light' ? 99 : plan === 'Regular' ? 179 : plan === 'Standard' ? 249 : 349} every Monday
          </div>

          <button className="cta-btn" style={{ marginTop: '16px' }} onClick={() => navigate('/worker/app')}>Go to Dashboard →</button>
        </div>
      )}
    </div>
  );
}