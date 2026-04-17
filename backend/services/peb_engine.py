from sqlalchemy.orm import Session
from sqlalchemy import func
from models.shift import Shift
from database import SessionLocal
import datetime

def calculate_peb(user_id: int) -> float:
    "\"\"
    Personal Earning Baseline (PEB) calculation.
    Analyzes historical shifts in normal conditions to establish
    the dynamically adjusted baseline earning rate per hour, instead
    of a flat guarantee line.
    "\"\"
    db = SessionLocal()
    try:
        # Time window: last 14 days
        cutoff_date = datetime.datetime.utcnow() - datetime.timedelta(days=14)
        
        # We only want past, completed shifts
        historical_shifts = db.query(Shift).filter(
            Shift.user_id == user_id,
            Shift.start_time >= cutoff_date,
            Shift.end_time != None
        ).all()
        
        if not historical_shifts:
            return 8.00 # Minimum basic fallback PEB

        total_earnings = 0.0
        total_hours = 0.0
        
        for shift in historical_shifts:
            if shift.earnings is None:
                continue

            # Calculate duration in hours
            duration = shift.end_time - shift.start_time
            hours = duration.total_seconds() / 3600.0

            if hours > 0.0:
                total_hours += hours
                total_earnings += float(shift.earnings)

        if total_hours == 0:
            return 8.00 # Fallback

        average_hourly_rate = total_earnings / total_hours
        
        # Adjust base slightly downwards (85% of average gives parametric target)
        # We don't insure 100% of their best day, we protect the baseline survival rate
        peb_hourly = average_hourly_rate * 0.85
        
        # Floor/ceiling constraints
        if peb_hourly < 8.00:
            peb_hourly = 8.00
        elif peb_hourly > 25.00:
            peb_hourly = 25.00
            
        return round(peb_hourly, 2)
        
    finally:
        db.close()
