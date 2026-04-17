-- SmartShift+ Database Schema
-- MySQL Setup

-- 1. Users (workers)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(100),
    platform VARCHAR(20), -- 'swiggy' or 'zomato'
    platform_user_id VARCHAR(100),
    home_zone_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Zones (1km x 1km delivery zones)
CREATE TABLE zones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    city VARCHAR(50),
    lat_min DECIMAL(10,7),
    lat_max DECIMAL(10,7),
    lng_min DECIMAL(10,7),
    lng_max DECIMAL(10,7),
    risk_multiplier DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Weekly Plans
CREATE TABLE policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT REFERENCES users(id),
    plan_type VARCHAR(20), -- 'light', 'regular', 'standard', 'pro', 'max'
    weekly_premium DECIMAL(10,2),
    coverage_ratio DECIMAL(3,2),
    max_payout DECIMAL(10,2),
    hours_limit INT,
    start_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Shifts (worker sessions)
CREATE TABLE shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT REFERENCES users(id),
    zone_id INT REFERENCES zones(id),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    hours_worked DECIMAL(4,2),
    earnings DECIMAL(10,2),
    orders_completed INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. SafarScore History
CREATE TABLE zone_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    zone_id INT REFERENCES zones(id),
    score INT CHECK (score BETWEEN 0 AND 100),
    signals JSON, -- Store all 10 signal values
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Payouts
CREATE TABLE payouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT REFERENCES users(id),
    shift_id INT REFERENCES shifts(id),
    peb_amount DECIMAL(10,2),      -- Personal Earning Baseline
    actual_amount DECIMAL(10,2),
    gap_amount DECIMAL(10,2),
    coverage_ratio DECIMAL(3,2),
    signal_confidence DECIMAL(3,2),
    payout_amount DECIMAL(10,2),
    status VARCHAR(20),             -- 'pending', 'approved', 'rejected'
    bps_score INT,                  -- TrustMesh score
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL
);

-- 7. Fraud Logs
CREATE TABLE fraud_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT REFERENCES users(id),
    shift_id INT,
    zone_id INT,
    bps_score INT,
    flag_type VARCHAR(50),          -- 'mock_gps', 'ring_alert', 'velocity_fail'
    details JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_platform_user_id ON users(platform_user_id);
CREATE INDEX idx_policies_user_id ON policies(user_id);
CREATE INDEX idx_shifts_user_id ON shifts(user_id);
CREATE INDEX idx_shifts_zone_id ON shifts(zone_id);
CREATE INDEX idx_payouts_user_id ON payouts(user_id);
CREATE INDEX idx_payouts_shift_id ON payouts(shift_id);
CREATE INDEX idx_fraud_logs_user_id ON fraud_logs(user_id);
CREATE INDEX idx_zone_scores_zone_id ON zone_scores(zone_id);
