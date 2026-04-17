from database import SessionLocal
from models.policy import Policy
from models.shift import Shift
from sqlalchemy import desc
import datetime

def calculate_weekly_premium(user_id: int, plan_type: str, zone_id: int) -> float:
    "\"\"
    Uses historical risk events in the assigned zone combined with user's specific behaviors
    to dynamically generate their weekly premium for SmartShift+.
    "\"\"
    db = SessionLocal()
    try:
        # Base Plan Rates
        base_rates = {
            "basic": 4.50,
            "pro": 8.00,
            "max": 12.50
        }
        premium = base_rates.get(plan_type, 4.50)

        # Retrieve zone context constraints (example rule)
        # If zone 2 is high-rainfall (implied context) and plan covers weather risk
        if zone_id == 2 and plan_type in ["pro", "max"]:
            premium += 2.00 # Risk adjustment

        # Check worker loyalty (discount active workers)
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=30)
        recent_shifts = db.query(Shift).filter(
            Shift.user_id == user_id,
            Shift.start_time >= cutoff,
            Shift.end_time != None
        ).count()

        # Over 50 shifts in last 30 days = loyal veteran
        if recent_shifts > 50:
            premium *= 0.85 # 15% discount
            
        return round(premium, 2)
        
    finally:
        db.close()
