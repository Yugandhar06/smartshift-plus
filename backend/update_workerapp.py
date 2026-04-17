import re

with open('dashboard/src/pages/WorkerApp.jsx', 'r') as f:
    text = f.read()

# 1. State hooks
state_hooks = '''  const [showPlanModal, setShowPlanModal] = useState(false);
  const [activePlan, setActivePlan] = useState(null);
  const [planStatus, setPlanStatus] = useState('Loading...');

  const fetchActivePlan = async () => {
    try {
      const res = await fetch(${API_URL}/users//plans/current);
      if (res.ok) {
        const data = await res.json();
        setActivePlan(data);
        setPlanStatus('Active');
        SS.set('plan', data.plan_type.toUpperCase());
      } else {
        setPlanStatus('Expired');
        setShowPlanModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch plan:', err);
    }
  };

  useEffect(() => {
    fetchActivePlan();
  }, []);
'''

text = re.sub(r"const CURRENT_PLAN = SS\.get\('plan'\) \|\| 'STANDARD';", r"const CURRENT_PLAN = SS.get('plan') || 'STANDARD';\n\n" + state_hooks, text)

# 2. Plan Submission Logic
plan_logic = '''
  const handlePlanSelection = async (planType) => {
    try {
      const planDetails = {
        'light': { weekly_premium: 99, coverage_ratio: 0.60, max_payout: 1500, hours_limit: 15 },
        'regular': { weekly_premium: 179, coverage_ratio: 0.65, max_payout: 2500, hours_limit: 35 },
        'standard': { weekly_premium: 249, coverage_ratio: 0.70, max_payout: 3500, hours_limit: 55 },
        'pro': { weekly_premium: 349, coverage_ratio: 0.80, max_payout: 5000, hours_limit: 70 },
        'max': { weekly_premium: 449, coverage_ratio: 0.90, max_payout: 7000, hours_limit: 9999 }
      }[planType];

      const startDate = new Date();
      // Start today instead of next monday for demo
      const res = await fetch(http://localhost:8000/api/users//plans, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           plan_type: planType,
           weekly_premium: planDetails.weekly_premium,
           coverage_ratio: planDetails.coverage_ratio,
           max_payout: planDetails.max_payout,
           hours_limit: planDetails.hours_limit,
           start_date: startDate.toISOString().split('T')[0]
        })
      });
      if (res.ok) {
        setShowPlanModal(false);
        fetchActivePlan();
      } else {
        const error = await res.json();
        alert(Could not upgrade plan: );
      }
    } catch (err) {
      console.error("Plan Change failed", err);
    }
  };
'''

text = re.sub(r"const toggleShift = async \(\) => \{", plan_logic + "\n  const toggleShift = async () => {", text)

# 3. Modify Plan Card UI
plan_ui_old = '''        {/* PLAN CARD */}
        <div className="plan-card">
          <div className="plan-card-header">
            <div className="plan-card-title">Weekly Coverage Plan</div>
            <div className="plan-tag">STANDARD</div>
          </div>
          <div className="plan-row">
            <span className="plan-row-label">Weekly Premium</span>
            <span className="plan-row-value green">?249 / week</span>
          </div>
          <div className="plan-row">
            <span className="plan-row-label">Coverage Ratio</span>
            <span className="plan-row-value">70% of gap</span>
          </div>
          <div className="plan-row">
            <span className="plan-row-label">Max Weekly Payout</span>
            <span className="plan-row-value blue">?3,500</span>
          </div>
          <div className="plan-row">
            <span className="plan-row-label">Hours Covered</span>
            <span className="plan-row-value">Up to 55 hrs/week</span>
          </div>
          <div className="plan-row">
            <span className="plan-row-label">Next Billing</span>
            <span className="plan-row-value">Monday 6:00 AM</span>
          </div>
        </div>'''

plan_ui_new = '''        {/* PLAN CARD */}
        <div className="plan-card" style={{ border: planStatus === 'Expired' ? '2px solid red' : '1px solid var(--border)' }}>
          <div className="plan-card-header">
            <div className="plan-card-title" style={{ display: 'flex', flexDirection: 'column' }}>
              Weekly Coverage Plan
              {planStatus === 'Expired' && <span style={{ color: '#ff5252', fontSize: '0.8rem', marginTop: '4px' }}>EXPIRED - Action Required</span>}
            </div>
            <div>
              <div className="plan-tag" style={{ border: '1px solid #ffd740', background: 'transparent', cursor: 'pointer', marginBottom: '8px' }} onClick={() => setShowPlanModal(true)}>
                CHANGE
              </div>
              <div className="plan-tag">{activePlan ? activePlan.plan_type.toUpperCase() : 'NO PLAN'}</div>
            </div>
          </div>
          <div className="plan-row">
            <span className="plan-row-label">Weekly Premium</span>
            <span className="plan-row-value green">?{activePlan ? activePlan.weekly_premium : '0.00'} / week</span>
          </div>
          <div className="plan-row">
            <span className="plan-row-label">Coverage Ratio</span>
            <span className="plan-row-value">{activePlan ? (activePlan.coverage_ratio * 100) : 0}% of gap</span>
          </div>
          <div className="plan-row">
            <span className="plan-row-label">Max Weekly Payout</span>
            <span className="plan-row-value blue">?{activePlan ? activePlan.max_payout : '0'}</span>
          </div>
          <div className="plan-row">
            <span className="plan-row-label">Hours Covered</span>
            <span className="plan-row-value">Up to {activePlan ? activePlan.hours_limit : 0} hrs/week</span>
          </div>
          <div className="plan-row">
            <span className="plan-row-label">Plan Status</span>
            <span className="plan-row-value" style={{ color: planStatus === 'Expired' ? '#ff5252' : '#00e676' }}>{planStatus}</span>
          </div>
        </div>'''

text = text.replace(plan_ui_old, plan_ui_new)

# 4. Inject Modal HTML into the end
modal_html = '''

      {/* PLAN CHANGE MODAL */}
      {showPlanModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="plan-modal" style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '8px' }}>Select Weekly Coverage</h3>
            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '20px' }}>Your plan applies to the next 7 days of work.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[{ id: 'light', premium: 99, cov: '60%', max: 1500 },
                { id: 'regular', premium: 179, cov: '65%', max: 2500 },
                { id: 'standard', premium: 249, cov: '70%', max: 3500 },
                { id: 'pro', premium: 349, cov: '80%', max: 5000 },
                { id: 'max', premium: 449, cov: '90%', max: 7000 }].map(p => (
                <div key={p.id} 
                     onClick={() => handlePlanSelection(p.id)}
                     style={{ border: '1px solid #333', borderRadius: '8px', padding: '16px', background: '#252525', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{p.id.toUpperCase()}</span>
                    <span style={{ color: '#00e676', fontWeight: 600 }}>?{p.premium} /wk</span>
                  </div>
                  <div style={{ color: '#888', fontSize: '0.85rem' }}>Covers {p.cov} up to ?{p.max}</div>
                </div>
              ))}
            </div>
            
            {planStatus !== 'Expired' && (
              <button 
                onClick={() => setShowPlanModal(false)}
                style={{ width: '100%', padding: '14px', marginTop: '20px', background: 'transparent', border: '1px solid #555', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
  '''

text = text.replace("</div>\n  );\n};", modal_html + "    </div>\n  );\n};\n")

with open('dashboard/src/pages/WorkerApp.jsx', 'w') as f:
    f.write(text)

print("Successfully updated WorkerApp.jsx!")
