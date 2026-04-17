import requests
import os
from models.zone_score import ZoneScore
from models.shift import Shift
from models.fraud_log import FraudLog
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

def get_order_volume_drop(db: Session, zone_id: int) -> int:
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    prev_24h = now - timedelta(hours=48)

    recent_orders = db.query(func.avg(Shift.orders_completed)).filter(
        Shift.zone_id == zone_id,
        Shift.start_time >= last_24h
    ).scalar() or 0

    prev_orders = db.query(func.avg(Shift.orders_completed)).filter(
        Shift.zone_id == zone_id,
        Shift.start_time >= prev_24h,
        Shift.start_time < last_24h
    ).scalar() or 0

    if prev_orders == 0:
        return 0

    drop = ((prev_orders - recent_orders) / prev_orders) * 100
    return int(max(0, drop))


def get_real_weather_aqi(lat: float, lon: float):
    # Use actual APIs from the README
    rainfall = 0.0
    aqi = 50
    weather_key = os.getenv('OPENWEATHER_API_KEY')
    # Default openweather params
    try:
        if weather_key:
            # OpenWeatherMap API for rain
            w_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={weather_key}"
            w_res = requests.get(w_url, timeout=5)
            if w_res.status_code == 200:
                w_data = w_res.json()
                if 'rain' in w_data and '1h' in w_data['rain']:
                    rainfall = float(w_data['rain']['1h'])
        
        # CPCB India Government API for AQI
        cpcb_url = 'https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69?api-key=579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b&format=json&filters[city]=Bengaluru'
        a_res = requests.get(cpcb_url, timeout=5)
        if a_res.status_code == 200:
            a_data = a_res.json()
            records = a_data.get('records', [])
            aqi_records = [int(r['avg_value']) for r in records if r.get('pollutant_id') in ('PM2.5', 'AQI') and r.get('avg_value', '').isdigit()]
            if aqi_records:
                aqi = sum(aqi_records) // len(aqi_records)
    except Exception as e:
        print(f"Weather/AQI API Error: {e}")

    return rainfall, aqi


def get_fraud_signals(db: Session, zone_id: int):
    now = datetime.utcnow()
    last_1h = now - timedelta(hours=1)

    mock_gps = db.query(func.count(FraudLog.id)).filter(
        FraudLog.zone_id == zone_id,
        FraudLog.timestamp >= last_1h,
        FraudLog.flag_type == "MOCK_GPS"
    ).scalar() or 0

    velocity_fails = db.query(func.count(FraudLog.id)).filter(
        FraudLog.zone_id == zone_id,
        FraudLog.timestamp >= last_1h,
        FraudLog.flag_type == "VELOCITY_FAIL"
    ).scalar() or 0

    return mock_gps, velocity_fails


def calculate_safarscore(db: Session, zone_id: int) -> int:
    LAT, LON = 12.9716, 77.5946

    # Try to grab zone specific coordinates if you had them
    # But applying the default coordinates for Bengaluru

    rainfall, aqi = get_real_weather_aqi(LAT, LON)
    order_drop = get_order_volume_drop(db, zone_id)
    mock_gps, velocity_fails = get_fraud_signals(db, zone_id)

    # 1. Rainfall (20%)
    rain_score = min((rainfall / 15.0) * 100, 100)
    # 2. AQI Level (15%)
    aqi_score = min((aqi / 300.0) * 100, 100)
    # 3. Platform order volume drop (15%)
    order_drop_score = min(order_drop * 2, 100)
    # 4. Road / traffic conditions (10%)
    traffic_score = 40  # Mocked from Google Maps Distance Matrix
    # 5. Extreme temperature (10%)
    temp_score = 30     # Mocked OpenWeather Temp
    # 6. Strike / curfew alerts (10%)
    strike_score = 0    # Mocked News NLP/Govt API
    # 7. Historical disruption data (5%)
    historical_score = 25 # Mocked DB lookup
    # 8. Wind speed (5%)
    wind_score = 15     # Mocked OpenWeather Wind
    # 9. Seasonal risk baseline (5%)
    seasonal_score = 45 # Mocked ML model (monsoon vs dry)
    # 10. Flood / disaster alerts (5%)
    flood_score = 0     # Mocked IMD/NLP alerts

    final_score = int(
        rain_score * 0.20 +
        aqi_score * 0.15 +
        order_drop_score * 0.15 +
        traffic_score * 0.10 +
        temp_score * 0.10 +
        strike_score * 0.10 +
        historical_score * 0.05 +
        wind_score * 0.05 +
        seasonal_score * 0.05 +
        flood_score * 0.05
    )

    final_score = min(max(final_score, 0), 100)

    # Key Threshold Alerts
    if final_score >= 45 and final_score < 60:
        print(f"️ [SCORE 45 TRIPPED] 48-hour advance alert pushed to workers. Tier upgrade window closed.")
    if final_score >= 75:
        print(f" [SCORE 75 TRIPPED] Leniency Rule Activated for Veteran Workers.")

    signals_dict = {
        "rainfall_mm_hr": round(rainfall, 2),
        "aqi_level": aqi,
        "order_volume_drop_pct": order_drop,
        "traffic_index": traffic_score,
        "temperature_index": temp_score,
        "strike_curfew": strike_score,
        "historical_risk": historical_score,
        "wind_speed": wind_score,
        "seasonal_baseline": seasonal_score,
        "flood_alert": flood_score,
        "mock_gps_detected": mock_gps,
        "velocity_fail_rate": velocity_fails
    }

    new_zone_score = ZoneScore(
        zone_id=zone_id,
        score=final_score,
        signals=signals_dict,
        timestamp=datetime.utcnow()
    )

    db.add(new_zone_score)
    db.commit()
    db.refresh(new_zone_score)

    return final_score