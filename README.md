# SmartShift+ 🛵⚡

### AI-Powered Parametric Income Protection for India's Gig Delivery Workers

> \*\*"When a flood hits Koramangala, SmartShift+ pays Ravi before he even gets home — automatically, fairly, and fraud-free."\*\*

\---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [What SmartShift+ Does](#2-what-smartshift-does)
3. [System Architecture](#3-system-architecture)
4. [How It Works — End-to-End Flow](#4-how-it-works--end-to-end-flow)
5. [SafarScore — Live Risk Engine](#5-safarscore--live-risk-engine)
6. [Weekly Premium Model](#6-weekly-premium-model)
7. [Parametric Triggers \& Payout Engine](#7-parametric-triggers--payout-engine)
8. [AI/ML Layer](#8-aiml-layer)
9. [TrustMesh — Fraud \& Anti-Spoofing Defense](#9-trustmesh--fraud--anti-spoofing-defense)
10. [Real Worker Scenarios](#10-real-worker-scenarios)
11. [Tech Stack](#11-tech-stack)
12. [Project Structure](#12-project-structure)
13. [Setup \& Running the Project](#13-setup--running-the-project)
14. [Financial Model \& Sustainability](#14-financial-model--sustainability)
15. [6-Week Development Roadmap](#15-6-week-development-roadmap)
16. [Design Philosophy](#16-design-philosophy)

\---

## 1\. The Problem

India has **15+ million gig delivery workers** on Zomato, Swiggy, Zepto, and Amazon. They earn per delivery — no delivery means no income. When external disruptions strike, workers absorb the full financial loss with zero safety net.

|Disruption|Example|Income Impact|
|:-:|:-:|:-:|
|**Environmental**|Heavy rain (>15mm/hr), floods, AQI >300, extreme heat (>43°C)|Deliveries halt entirely|
|**Platform**|App outages, zone restrictions|No orders despite worker being active|
|**Social**|Curfews, strikes, market closures|No access to pickup/drop zones|

Workers lose **20–30% of monthly earnings** from these events. Existing options — traditional insurance, platform welfare, personal savings — all fail: too slow, too expensive, or simply absent.

**SmartShift+ is the safety net that didn't exist.**

> \*\*Scope:\*\* SmartShift+ covers \*\*income loss only\*\*. We strictly exclude health insurance, life insurance, accident cover, and vehicle repair — in full compliance with the DEVTrails 2026 problem statement.

\---

## 2\. What SmartShift+ Does

SmartShift+ is a **parametric income insurance platform**: when a verified external disruption causes a gig worker to earn less than their personal baseline, the system pays the gap — automatically, in under 30 minutes, via UPI.

### Three Core Pillars

```
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│     SAFARSCORE       │  │     MICROSHIELD       │  │     PEB ENGINE       │
│                      │  │                       │  │                      │
│  Live 0–100 zone     │  │  Weekly shift         │  │  Personal Earning    │
│  risk score updated  │  │  coverage plans       │  │  Baseline built from │
│  every 15 minutes    │  │  billed every Monday  │  │  8 weeks of each     │
│  from 10 signals     │  │  via UPI Autopay      │  │  worker's history    │
└──────────┬───────────┘  └──────────┬────────────┘  └──────────┬───────────┘
           └─────────────────────────┼───────────────────────────┘
                                     ▼
                      ┌──────────────────────────────┐
                      │     3-SIGNAL VALIDATION      │
                      │   (2 of 3 must confirm)      │
                      └──────────────┬───────────────┘
                                     ▼
                      ┌──────────────────────────────┐
                      │    TRUSTMESH ANTI-FRAUD      │
                      │  Behavioral Presence Score   │
                      │    (BPS) — 6 sub-signals     │
                      └──────────────┬───────────────┘
                                     ▼
                      ┌──────────────────────────────┐
                      │  AUTOMATIC UPI PAYOUT        │
                      │  (PEB − Actual) × Coverage   │
                      │  × Confidence  < 30 minutes  │
                      └──────────────────────────────┘
```

\---

## 3\. System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        SMARTSHIFT+ PLATFORM                          │
│                                                                      │
│  ┌──────────────┐     ┌─────────────────────┐   ┌────────────────┐  │
│  │  MOBILE APP  │     │      BACKEND        │   │ ADMIN DASHBOARD│  │
│  │ React Native │◄───►│  FastAPI + Celery   │◄─►│   React.js     │  │
│  │  (Workers)   │     │  + Redis + Postgres │   │  (Operations)  │  │
│  └──────────────┘     └──────────┬──────────┘   └────────────────┘  │
│                                  │                                   │
│            ┌─────────────────────┼─────────────────────┐            │
│            ▼                     ▼                     ▼            │
│   ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│   │  EXTERNAL APIs   │  │   AI/ML LAYER   │  │ PAYMENT GATEWAY  │  │
│   │                  │  │                 │  │                  │  │
│   │  OpenWeatherMap  │  │  SafarScore     │  │  Razorpay        │  │
│   │  IMD / CPCB AQI  │  │  PEB Model      │  │  UPI Autopay     │  │
│   │  Google Maps     │  │  TrustMesh BPS  │  │  Sandbox         │  │
│   │  News NLP Feed   │  │  Plan Recommender│  │                  │  │
│   │  Mock Swiggy /   │  │  48-hr Forecast │  │                  │  │
│   │  Zomato APIs     │  └─────────────────┘  └──────────────────┘  │
│   └──────────────────┘                                              │
└──────────────────────────────────────────────────────────────────────┘
```

### Data Flow Summary

```
External Event Occurs (Rain / Outage / Strike)
              │
              ▼
SafarScore recalculates every 15 mins via Celery
              │
        Score > 60?
        NO ──→ Continue monitoring
        YES ▼
3-Signal Validation fires automatically:
  Signal 1: Real external disruption? (Weather / AQI / Platform API)
  Signal 2: Worker physically present? (TrustMesh BPS — 6 sub-signals)
  Signal 3: Zone demand dropped >40%? (Platform API or peer proxy)
              │
        2 of 3 confirmed? (Signal 1 is mandatory)
        NO ──→ No payout. Event logged.
        YES ▼
Payout = (PEB − Actual Earnings) × Coverage Ratio × Signal Confidence
              │
              ▼
UPI transfer via Razorpay → Worker's phone in < 30 minutes ✅
```

\---

## 4\. How It Works — End-to-End Flow

### Onboarding (One Time, \~3 Minutes)

```
Worker downloads SmartShift+ app
  → Mobile OTP login
  → Links Swiggy / Zomato account via OAuth
  → AI analyzes 8 weeks of earning history
  → Personal Earning Baseline (PEB) created per time slot and zone
  → Home zone detected via GPS
  → AI recommends best weekly plan based on shift pattern
  → Aadhaar KYC completed (mock/sandbox)
  → UPI Autopay mandate set for Monday billing
  → Coverage active immediately
```

### Every Week (Fully Automatic)

```
MONDAY 6 AM   Weekly premium auto-debited via UPI Autopay
              Coverage active for 7 days

DURING WEEK   Worker taps "Start Shift" to activate session
              SafarScore monitored every 15 minutes
              Hours counted against weekly plan limit

IF DISRUPTION Payout triggered automatically — no claim form needed
              Money arrives in < 30 minutes

SUNDAY 8 PM   Weekly summary delivered to worker:
              Premium paid | Payouts received | Hours covered | Net position
```

### When Disruption Hits (Zero Touch Required)

```
SafarScore crosses 60  →  TrustMesh BPS runs (<10 seconds)
       →  3-Signal Validation checks all sources independently
       →  Dynamic Effort Rule verified (flood = 0 orders; light rain = 1 order)
       →  Payout calculated from worker's personal PEB
       →  UPI transfer initiated
       →  Money in worker's account
```

\---

## 5\. SafarScore — Live Risk Engine

The **SafarScore** is a 0–100 zone risk index — the heartbeat of SmartShift+. Every premium, payout trigger, and fraud decision runs through it. Updated every 15 minutes per 1km × 1km delivery zone.

### Score Bands

|Score|Level|Color|Payout Triggers?|Min Orders to Qualify|
|:-:|:-:|:-:|:-:|:-:|
|0–30|Low|🟢 Green|No|—|
|31–60|Medium|🟡 Yellow|No|—|
|61–80|High|🔴 Red|**Yes**|1 order|
|81–100|Extreme|⚫ Black|**Yes**|0 — GPS presence only|

> \*\*Trigger threshold: Score > 60\*\* with shift active and weekly plan current.

### 10 Input Signals

|Signal|Source|Weight|
|:-:|:-:|:-:|
|Rainfall (mm/hr)|IMD / OpenWeatherMap|20%|
|AQI level|CPCB / AirVisual|15%|
|Platform order volume drop|Mock Platform API|15%|
|Road / traffic conditions|Google Maps API|10%|
|Extreme temperature|OpenWeatherMap|10%|
|Strike / curfew alerts|News NLP + Govt API|10%|
|Historical disruption data|Internal DB|5%|
|Wind speed|OpenWeatherMap|5%|
|Seasonal risk baseline|ML model|5%|
|Flood / disaster alerts|IMD + News NLP|5%|

### Score in Motion — Visual Example

```
SafarScore — Koramangala, Wednesday Evening

  100 |
   80 |                        ▓▓▓▓▓▓▓▓
   60 |────────────────────────────────────  ← PAYOUT TRIGGER LINE
   40 |                ▓▓▓▓▓▓▓▓
   20 |▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
    0 └────────────────────────────────────▶ Time
      6:00  6:15  6:30  6:45  7:00  7:15

  6:00 PM  Score 28 🟢  Clear, normal orders
  6:30 PM  Score 48 🟡  Light rain begins
  6:45 PM  Score 63 🔴  Heavy rain — TRIGGER FIRES → Auto-payout initiated
  7:00 PM  Score 78 🔴  Flooding confirmed
  7:15 PM  Score 65 🔴  Rain easing
```

**Key Thresholds:**

* **Score 45** → 48-hour advance alert sent to workers. Tier upgrade window closes.
* **Score 60** → Payout trigger fires. TrustMesh BPS runs.
* **Score 75** → Leniency rule activates for veteran workers.
* **Score 80** → Zero orders required. GPS presence alone is sufficient.

\---

## 6\. Weekly Premium Model

> \*\*Why weekly?\*\* Gig platforms pay workers weekly. SmartShift+ aligns its billing cycle to match — so workers fund protection from regular income, not savings.

### The Pricing Formula

```
Final Weekly Premium = Base Plan Rate × Zone Risk Multiplier × Claim History Factor
```

### Weekly Shift Plans

Workers choose a plan matching their typical hours per week. AI recommends the best fit at onboarding.

|Plan|Covered Hrs/Week|Base Premium|Coverage Ratio|Max Weekly Payout|
|:-:|:-:|:-:|:-:|:-:|
|**Light**|Up to 15 hrs|₹99|60% of gap|₹1,000|
|**Regular**|Up to 35 hrs|₹179|65% of gap|₹2,000|
|**Standard**|Up to 55 hrs|₹249|70% of gap|₹3,500|
|**Pro**|Up to 70 hrs|₹349|80% of gap|₹5,000|
|**Max**|Unlimited|₹449|90% of gap|₹7,000|

### Zone Risk Multiplier

Based on 12-week average SafarScore of the worker's primary zone:

|Zone History|Multiplier|Effect on Standard (₹249)|
|:-:|:-:|:-:|
|Low risk|0.9×|₹224/week|
|Medium risk|1.0×|₹249/week|
|High risk|1.15×|₹286/week|
|Extreme risk|1.3×|₹324/week|

### Claim History Factor

Rewards honest workers and disfavours repeat flagged claimants:

|90-Day Record|Factor|Effect on ₹249|
|:-:|:-:|:-:|
|Zero claims (no disruptions)|0.9×|₹224 — loyalty discount|
|Clean approved claims|1.0×|₹249 — no change|
|1 flagged claim|1.1×|₹274|
|2+ flagged / rejected|1.2×|₹299|

### Real Worker Premium Examples

|Worker|Plan|Zone|Final Weekly Premium|Max Payout|
|:-:|:-:|:-:|:-:|:-:|
|Ravi — full-time, 55 hrs, medium zone|Standard|Medium|**₹249**|₹3,500|
|Priya — part-time, 10 hrs, loyalty discount|Light|Medium|**₹89**|₹1,000|
|Ahmed — full-time, 60 hrs, high-risk zone|Pro|High|**₹401**|₹5,000|
|Vikram — part-time, 15 hrs, low-risk, clean record|Light|Low|**₹80**|₹1,000|

### Weekly Billing Cycle Rules

```
MONDAY      → Premium auto-debited. Coverage activates immediately.
DURING WEEK → Start / End Shift toggle activates sessions within plan hour limit.
SUNDAY      → Weekly summary delivered. Unused hours do NOT carry forward.
UPGRADE     → Only before Monday debit. Blocked within 6 hrs of predicted disruption.
DOWNGRADE   → Anytime, effective next Monday. No penalty.
```

> Upgrade lockout prevents last-minute tier switching to inflate payouts — a key parametric insurance fraud vector.

\---

## 7\. Parametric Triggers \& Payout Engine

### Trigger Condition

```
SafarScore > 60   AND   Shift is active   AND   Weekly plan is current
```

### 3-Signal Validation Engine

When the trigger fires, three independent signals are checked simultaneously:

|Signal|Source|What It Verifies|
|:-:|:-:|:-:|
|**Signal 1 — External Event** *(mandatory)*|Weather / AQI / Platform API|Is there a real external disruption?|
|**Signal 2 — Worker Presence**|TrustMesh BPS (6 sub-signals)|Is the worker genuinely in the zone?|
|**Signal 3 — Zone Demand Drop**|Platform API / peer proxy|Have orders dropped >40% in this zone?|

**Rule: Minimum 2 of 3 must confirm. Signal 1 is always required — no payout without a real external event.**

> \*\*API Fallback:\*\* If Signal 1's primary source is down, substitutes activate automatically: news NLP (flood/strike keyword detection), historical anomaly detection (score deviation >2σ from zone baseline), or peer-network confirmation (multiple workers in same zone reporting zero orders). Real disruptions are never blocked by API downtime.

> \*\*On platform APIs:\*\* Direct order-volume data from Swiggy/Zomato is not publicly available. In the prototype this is simulated via mock servers. In production, proxy signals substitute: GPS movement logs, app-open frequency, and cross-worker demand aggregation within the zone.

### Dynamic Effort Rule

Workers must show pre-disruption effort proportional to event severity:

|Score|Severity|Min Orders|Rationale|
|:-:|:-:|:-:|:-:|
|61–80|High|1 order|Major disruption — minimal proof of intent|
|81–100|Extreme|0 orders|Crisis — GPS presence alone sufficient|

### Disruption Thresholds

|Disruption|Trigger Condition|Source|
|:-:|:-:|:-:|
|Heavy rainfall|> 15 mm/hr|IMD / OpenWeatherMap|
|Flooding|IMD flood alert issued|IMD + News NLP|
|Extreme heat|> 43°C + Govt advisory|OpenWeatherMap|
|Poor AQI|> 300|CPCB API|
|Platform outage|0 orders in zone > 20 mins|Platform monitor|
|Strike / curfew|Govt alert + NLP keyword match|News API|

### Payout Formula

```
Payout = (PEB − Actual Earnings) × Coverage Ratio × Signal Confidence

  PEB              = AI-learned earning baseline for this worker, day, and time slot
  Actual Earnings  = Confirmed via platform API or proxy during disruption window
  Coverage Ratio   = 60% to 90% based on plan tier
  Signal Confidence= 100% (3/3 confirmed) or 85% (2/3 confirmed)

Example — Ravi, Wednesday Rain:
  PEB: ₹900  |  Actual: ₹300  |  Gap: ₹600
  Standard plan 70%  ×  3/3 confidence 100%
  → Payout: ₹420 in 18 minutes ✅
```

\---

## 8\. AI/ML Layer

> \*\*Prototype scope:\*\* For the 6-week build, simplified rule-based models and linear regression are used throughout. Advanced models (LSTM, ARIMA, collaborative filtering) are the production roadmap. The architecture is designed to swap models without changing any system logic.

|Layer|What It Does|Prototype|Production Roadmap|
|:-:|:-:|:-:|:-:|
|**PEB — Personal Earning Baseline**|Learns each worker's expected earnings by time, zone, day, and weather. Output: `PEB\[worker]\[day]\[slot]` in ₹.|Linear regression|ARIMA per worker|
|**SafarScore Engine**|Combines 10 signals into a live 0–100 zone risk score via weighted aggregation.|Rule-based weights|Gradient Boosted Trees|
|**48-Hour Disruption Forecast**|Predicts zone scores 48 hours ahead. Sends advance alerts so workers can prepare.|IMD rule thresholds|LSTM sequence model|
|**Weekly Plan Recommender**|Recommends the right weekly plan at onboarding based on work pattern and zone.|Hours-to-plan rules|Collaborative filtering|
|**TrustMesh BPS**|Composite behavioral presence score replacing raw GPS. 6 sub-signals. See Section 9.|Weighted rule scoring|Isolation Forest + Random Forest|
|**News \& Alert NLP**|Parses live news feeds for strike, curfew, flood keywords as Signal 1 fallback.|spaCy keyword match|Fine-tuned BERT (Indian news)|

\---

## 9\. TrustMesh — Fraud \& Anti-Spoofing Defense

> ⚠️ \*\*This section was designed proactively\*\* before the DEVTrails 24-hour adversarial challenge was announced. The exact attack described — a 500-worker Telegram syndicate using GPS spoofing apps — is the scenario TrustMesh was built to defeat.

### The Attack Vector

```
500 workers organized via Telegram
  → All install GPS spoofing app
  → Fake location into Red Zone (score > 60)
  → Activate shift from home
  → Old system: GPS ✅ → 2/3 signals pass → Liquidity pool drained
```

**Root cause:** Raw GPS is a single fakeable point. SmartShift+ replaces it with the **Behavioral Presence Score (BPS)** — a composite of 6 signals that cannot all be faked simultaneously.

### BPS — 6 Sub-Signals

|Sub-Signal|How Detected|Genuine Worker|GPS Spoofer|
|:-:|:-:|:-:|:-:|
|Mock location flag absent|`location.mocked` API|✅ +20 pts|Hard block|
|GPS noise variance natural|StdDev of last 50 GPS readings|✅ +15 pts|−30 pts (too perfect: 0.000)|
|Accelerometer motion present|Road vibration on moving bike|✅ +15 pts|−15 pts (flat sofa readings)|
|Velocity continuity passed|Speed vs confirmed last delivery|✅ +15 pts|Hard block (teleportation)|
|Pre-disruption activity exists|Orders completed in zone in last 4 hrs|✅ +20 pts|−50 pts (never worked here)|
|Not in activation ring cluster|SQL clustering on zone activations|✅ +15 pts|−40 pts|
|**Max BPS — genuine worker**||**100**||
|**Typical BPS — GPS spoofer**|||**0–15**|

### BPS Decision Tiers

```
BPS 75–100  →  Signal 2 CONFIRMED   →  Auto-payout < 30 min         ✅
BPS 50–74   →  Soft flag            →  10-minute fast-track          ⚠️
BPS 25–49   →  Hard flag            →  2-hour human review           🔍
BPS 0–24    →  Rejected             →  Hard block, logged            🚫
Ring alert  →  Zone-wide hold       →  All claims paused ≤ 2 hours   🛑
```

> \*\*Important:\*\* BPS never directly rejects a payout. A low score triggers a delay or review — never an automatic rejection. Final rejection requires multiple confirming signals, historical trust score, and human review. This protects honest workers with older phones, weak network, or sensor issues.

### Ring Detection — Catching Telegram Syndicates

```python
def ring\_detection(zone\_id, trigger\_time):
    recent\_activations = get\_activations(zone\_id, last\_15\_minutes=True)
    new\_to\_zone = \[w for w in recent\_activations if no\_prior\_zone\_history(w)]
    new\_pct = len(new\_to\_zone) / len(recent\_activations)

    if len(recent\_activations) > 20 and new\_pct > 0.60:
        # 20+ activations with 60% having no zone history = coordinated ring
        trigger\_ring\_alert(zone\_id)
        hold\_all\_claims(zone\_id, hours=2)
        # Legitimate workers: fast-tracked with ₹75 inconvenience credit
```

### UX for Flagged-but-Honest Workers

|Situation|Message to Worker|Resolution|
|:-:|:-:|:-:|
|BPS 50–74|"Verifying your claim — \~10 minutes. This is NOT your fault. Your payout will NOT be reduced."|Auto-resolved if last order confirmed or 30-day clean record|
|BPS 25–49 or Ring|"Our team contacts you within 2 hours. Approved claims receive full payout + ₹75 credit."|Human review, ₹75 inconvenience credit on approval|
|Score >80 + veteran worker|Leniency rule: BPS threshold drops 25 points|Benefit of the doubt in genuine disasters|

\---

## 10\. Real Worker Scenarios

### Ravi — Full-Time, Bengaluru (Standard Plan, ₹249/week)

*Swiggy delivery, Koramangala zone, avg ₹4,500/week*

**Heavy Rain Disruption — Payout Triggered**

```
6:00 PM  Shift starts. Score: 38 (Medium).
7:15 PM  Rainfall: 22mm/hr. Score rises to 65. TRIGGER FIRES.

TrustMesh BPS: 91
  ✅ Real GPS + natural variance + motion detected + 3 prior orders
3/3 Signals confirmed. Confidence: 100%.

PEB: ₹900  |  Actual earned: ₹300  |  Gap: ₹600
Payout: ₹600 × 70% × 100% = ₹420

7:38 PM — ₹420 credited to Ravi's PhonePe. Time elapsed: 18 minutes. ✅
Week-end summary: Paid ₹249 premium. Received ₹420. Net position: +₹171.
```

**Fraud Attempt — Sunny Day**

```
Ravi stays home. Score: 22. Shift not active.
Tries to manually submit a claim.
Signal 1 ❌  Signal 2 ❌  Signal 3 ❌  →  0/3.  Blocked automatically. ₹0.
```

\---

### Priya — Part-Time, Mumbai (Light Plan, ₹89/week)

*Zepto grocery, works Tue/Fri only, \~10 hrs/week*

Full-time Standard Plan would cost ₹249/week — she would overpay by ₹160. Light Plan covers her exact pattern. Same 3-signal validation, same UPI payout speed. MicroShield fairness in practice.

\---

### GPS Spoofer — Hard Blocked

```
Spoofing app fakes location to Red Zone.
  mock location flag: DETECTED → Hard block in < 1 second. ₹0. 🚫

Even if mock flag bypassed:
  GPS variance: 0.000 (perfect) → −30 pts
  Accelerometer: flat readings  → −15 pts
  Zone orders history: zero     → −50 pts
  BPS: 0–5. Signal 2 rejected. Hard block. Logged.
```

\---

### Telegram Ring of 500 — Caught in 90 Seconds

```
200 simultaneous zone activations in 8 minutes.
62% of activators have zero prior delivery history in this zone.
Ring detection fires. Zone-wide 2-hour hold activated.
Legitimate workers: fast-tracked with ₹75 inconvenience credit. ✅
Liquidity pool: protected.
```

\---

## 11\. Tech Stack

### Mobile App — Worker Facing

|Layer|Technology|
|:-:|:-:|
|Framework|React Native (iOS + Android)|
|Location \& Maps|Expo Location + Google Maps SDK|
|Sensors|Expo Sensors (Accelerometer, Gyroscope)|
|Push Notifications|Firebase Cloud Messaging|
|State Management|Redux Toolkit|
|Payments|Razorpay React Native SDK (UPI Autopay)|

### Backend

|Layer|Technology|
|:-:|:-:|
|API Server|Python FastAPI|
|Task Scheduling|Celery + Redis (score updates every 15 min; billing every Monday 6 AM)|
|Database|PostgreSQL (primary) + Redis (live score cache)|
|Real-time Push|WebSockets — live score stream to mobile app|
|Auth|JWT + Aadhaar OTP (mock for prototype)|

### AI / ML

|Model|Prototype|Production Roadmap|
|:-:|:-:|:-:|
|PEB (earning baseline)|Linear regression|ARIMA per worker|
|SafarScore engine|Weighted rule-based|Gradient Boosted Trees|
|48-hr forecast|IMD threshold rules|LSTM sequence model|
|TrustMesh BPS|Weighted rule scoring|Isolation Forest + Random Forest|
|Plan recommender|Rule-based hour brackets|Collaborative filtering|
|News NLP|spaCy keyword match|Fine-tuned BERT (Indian news)|

### Admin Dashboard

|Layer|Technology|
|:-:|:-:|
|Framework|React.js|
|Charts|Recharts + Chart.js|
|Maps|Google Maps JS API|
|Styling|Tailwind CSS|

### External APIs

|API|Purpose|Access|
|:-:|:-:|:-:|
|OpenWeatherMap|Rain, temperature, wind|Free tier|
|CPCB AQI|Air quality index|Free — Government|
|IMD Forecast|48-hr weather prediction|Free — Government|
|Google Maps|Traffic conditions|Free tier|
|Swiggy / Zomato|Order volume|**Simulated mock server**|
|Razorpay|UPI Autopay + payouts|Free sandbox|
|Firebase|Push notifications|Free tier|

\---

## 12\. Project Structure

```
smartshift-plus/
│
├── mobile/                        # React Native — worker app
│   └── src/
│       ├── screens/
│       │   ├── Onboarding.jsx     # Signup, OAuth, KYC
│       │   ├── PlanSelector.jsx   # Weekly plan + AI recommendation
│       │   ├── Dashboard.jsx      # Zone score + shift toggle
│       │   ├── ShiftActive.jsx    # Live shift session
│       │   ├── WeeklySummary.jsx  # Sunday report screen
│       │   └── Payouts.jsx        # Payout history
│       ├── components/
│       │   ├── ZoneScore.jsx      # 0–100 score ring (color-coded)
│       │   ├── ShiftToggle.jsx    # Start / End Shift button
│       │   └── PayoutCard.jsx     # Payout confirmation card
│       └── services/
│           ├── api.js             # Backend API calls
│           ├── websocket.js       # Live score stream
│           ├── gps.js             # Location + BPS signals
│           └── sensors.js         # Accelerometer listener
│
├── backend/                       # Python FastAPI server
│   ├── api/
│   │   ├── auth.py                # OTP + JWT + Aadhaar
│   │   ├── score.py               # SafarScore endpoints
│   │   ├── policy.py              # Weekly plan management
│   │   ├── billing.py             # Monday auto-debit scheduler
│   │   ├── payout.py              # Trigger + UPI payout
│   │   └── fraud.py               # TrustMesh + BPS engine
│   ├── services/
│   │   ├── score\_engine.py        # 10-signal aggregator
│   │   ├── peb\_engine.py          # Personal baseline calculator
│   │   ├── premium\_engine.py      # Weekly premium calculator
│   │   ├── plan\_recommender.py    # Plan suggestion logic
│   │   ├── payout\_engine.py       # Gap calculation + UPI call
│   │   ├── trustmesh.py           # BPS scorer + ring detection
│   │   └── velocity\_check.py      # Impossibility engine
│   └── tasks/
│       ├── score\_updater.py       # Celery: every 15 minutes
│       ├── weekly\_billing.py      # Celery: Monday 6 AM
│       ├── weekly\_summary.py      # Celery: Sunday 8 PM
│       └── ring\_detector.py       # Celery: every 5 minutes
│
├── ml/                            # AI / ML models
│   ├── peb\_model/                 # Earning baseline
│   ├── score\_predictor/           # 48-hr zone forecast
│   ├── fraud\_detector/            # BPS + anomaly scoring
│   └── plan\_recommender/          # Weekly plan suggestion
│
├── dashboard/                     # React.js admin panel
│   └── src/pages/
│       ├── ZoneMap.jsx            # Live color-coded zone map
│       ├── Payouts.jsx            # Real-time payout log
│       ├── FraudAlerts.jsx        # Ring detections + BPS flags
│       ├── PlanAnalytics.jsx      # Weekly plan distribution
│       └── Analytics.jsx          # Weekly financial summary
│
├── mock\_apis/
│   ├── swiggy\_mock.py             # Simulated order volume API
│   └── zomato\_mock.py
│
├── docker-compose.yml
├── .env.example
└── README.md
```

\---

## 13\. Setup \& Running the Project

### Prerequisites

```
Node.js >= 18   |   Python >= 3.10   |   Docker + Docker Compose   |   Expo CLI
```

### Step 1 — Clone \& Configure

```bash
git clone https://github.com/your-team/smartshift-plus.git
cd smartshift-plus
cp .env.example .env
```

Fill in `.env`:

```env
OPENWEATHER\_API\_KEY=...          # openweathermap.org — free tier
GOOGLE\_MAPS\_API\_KEY=...          # console.cloud.google.com — free tier
RAZORPAY\_KEY\_ID=...              # razorpay.com — free sandbox
RAZORPAY\_KEY\_SECRET=...
FIREBASE\_SERVER\_KEY=...          # console.firebase.google.com — free
POSTGRES\_URL=postgresql://user:password@localhost:5432/smartshift
REDIS\_URL=redis://localhost:6379
JWT\_SECRET=your\_secret\_here
```

### Step 2 — Start All Services (One Command)

```bash
docker-compose up --build
# Backend API     → http://localhost:8000
# Admin Dashboard → http://localhost:3000
# Mock APIs       → http://localhost:8001
```

### Step 3 — Run Mobile App

```bash
cd mobile \&\& npm install \&\& npx expo start
# Scan QR code with Expo Go  OR  press 'a' for Android emulator
```

### Step 4 — Seed Demo Data \& Train Models

```bash
# Seed demo worker profiles (Ravi, Priya, Ahmed)
cd backend \&\& python manage.py seed\_mock\_data

# Train models on mock data
cd ml \&\& python peb\_model/train.py
cd ml \&\& python fraud\_detector/train.py
```

### Step 5 — Run Tests

```bash
cd backend  \&\& pytest tests/ -v
cd mobile   \&\& npm test
cd ml       \&\& python run\_tests.py
```

\---

## 14\. Financial Model \& Sustainability

### Weekly Revenue — 3,000 Workers Per City

|Plan|Workers|Weekly Premium|Weekly Revenue|
|:-:|:-:|:-:|:-:|
|Light (15%)|450|₹99|₹44,550|
|Regular (20%)|600|₹179|₹1,07,400|
|Standard (40%)|1,200|₹249|₹2,98,800|
|Pro (20%)|600|₹349|₹2,09,400|
|Max (5%)|150|₹449|₹67,350|
|**Total**|**3,000**||**₹7,27,500 / week**|

### Payout Pool

```
Disruption events per week (city average):    2
Workers affected per event:                   15–20% of active workers (\~600)
Average payout per affected worker:           ₹380
Weekly payout total:                          ₹4,56,000
Weekly operating margin:                      ₹2,71,500  (37%)
```

> \*\*Sustainability:\*\* Not every worker gets a payout every week. Only 15–20% are affected per event, and not every week has a disruption. Per-plan payout caps, zone risk multipliers, and cross-zone risk pooling control the loss ratio. Expected loss ratio is managed via caps, multipliers, and risk pooling — keeping the platform solvent even in high-disruption weeks.

### Unit Economics Per Worker (Annual)

|Metric|Value|
|:-:|:-:|
|Avg weekly premium|₹249|
|Avg annual premium paid|₹12,948|
|Avg annual payouts received|₹9,880|
|Worker's net annual cost|₹3,068 (\~₹256/month)|
|SmartShift+ margin per worker|₹4,774/year|

### Break-Even

```
Monthly fixed costs per city:
  Infrastructure (AWS):  ₹15,000
  Operations (2 staff):  ₹80,000
  API costs:              ₹5,000
  Total:                 ₹1,00,000

Monthly revenue per Standard worker: ₹249 × 4.3 = ₹1,071
Break-even: 1,00,000 ÷ 1,071 = 94 workers

With 3,000 workers: 32× above break-even.
```

\---

## 15\. 6-Week Development Roadmap

|Week|Theme|Key Deliverables|
|:-:|:-:|:-:|
|**Week 1**|Foundation|Worker onboarding, OAuth, Aadhaar KYC, zone map, weekly plan selector, Razorpay UPI Autopay setup|
|**Week 2**|SafarScore Engine|10-signal aggregator, 1km zone grid, Celery 15-min updater, Redis caching, zone risk multiplier|
|**Week 3**|AI + Billing|PEB model (linear regression), plan recommender, Monday billing scheduler, 48-hr alert push notifications, Sunday summary|
|**Week 4**|Payout Engine|3-signal validation, dynamic effort rule, payout calculator, UPI transfer via Razorpay sandbox, claim history factor|
|**Week 5**|TrustMesh + Dashboard|All 6 BPS sub-signals, ring detection (SQL clustering), 3-tier UX flow, admin dashboard (zone map, fraud feed, plan analytics)|
|**Week 6**|Polish + Demo|3-scene demo script, realistic seed data, pitch deck, demo video, bug fixes, performance tuning|

> \*\*Prototype:\*\* Rule-based and regression models throughout. LSTM, ARIMA, and collaborative filtering are the production roadmap. Architecture decouples models from system logic for clean upgrades.

\---

## 16\. Design Philosophy

SmartShift+ is built on one core principle: **every honest worker gets paid, every fraudulent claim gets blocked — automatically, with no exceptions in either direction.**

This shapes every decision in the system:

**Progressive trust, not binary judgment.**
BPS scores delay or flag claims — they never unilaterally reject. Every low-confidence case has a human fallback path and a ₹75 inconvenience credit for honest workers caught in the process.

**Personalized fairness over flat averages.**
Ravi's payout is calculated from Ravi's 8-week earning baseline — not a city average that underpays top earners and overpays casual workers.

**Aligned incentives.**
Workers pay weekly because they earn weekly. Plans scale to actual shift hours. Loyalty discounts reward honest claimants. Upgrade lockouts prevent gaming.

**Layered fraud defense.**
No single signal triggers a payout. All three validation signals must align — and Signal 2 (BPS) requires six corroborating data points that no GPS spoofing app can simultaneously fake.

**Resilient by design.**
Every critical data source has a fallback. A failed weather API cannot block a legitimate payout. Real disruptions always find a confirmation path.

\---

> \*\*SmartShift+ is a progressive trust system — not a binary approve/reject engine — ensuring fairness under uncertainty. Every decision has a fallback. Every flag has a human override path. Every honest worker gets paid.\*\*

\---

*Built for DEVTrails 2026 — AI-Powered Insurance for India's Gig Economy
Persona: Food delivery partners (Zomato / Swiggy) | Coverage: Income loss only | Pricing: Weekly
All APIs use free tiers or sandbox/mock environments. Fully scoped to build and demo within 6 weeks.*

