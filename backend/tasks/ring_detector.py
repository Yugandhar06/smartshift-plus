from celery import shared_task
from sqlalchemy.orm import Session
from database import SessionLocal
from models.shift import Shift
from models.fraud_log import FraudLog
import datetime
import json

@shared_task(name="ring_detector")
def detect_telegram_syndicates(zone_id: int):
    "\"\"
    TrustMesh Anti-Spoofing Defense
    Identifies sudden influx of users into high-risk zones without prior delivery history.
    This pattern strongly indicates coordinated Telegram rings using GPS spoofing apps.
    "\"\"
    db = SessionLocal()
    try:
        current_time = datetime.datetime.utcnow()
        # Look back 15 minutes
        time_window = current_time - datetime.timedelta(minutes=15)
        
        # Get all shift activations in this zone inside the window
        recent_activations = db.query(Shift).filter(
            Shift.zone_id == zone_id,
            Shift.start_time >= time_window
        ).all()
        
        activation_count = len(recent_activations)
        if activation_count < 20: 
            return # Too small to trigger ring alert

        # Evaluate the 'stranger' ratio (workers with no history in this zone)
        strangers = 0
        for shift in recent_activations:
            prior_history = db.query(Shift).filter(
                Shift.user_id == shift.user_id,
                Shift.zone_id == zone_id,
                Shift.start_time < time_window
            ).count()
            
            if prior_history == 0:
                strangers += 1

        stranger_ratio = strangers / activation_count

        # Condition for Ring Detection:
        # 20+ activations simultaneously with > 60% having no zone history
        if stranger_ratio > 0.60:
            _trigger_zone_hold(db, zone_id, current_time)

    finally:
        db.close()

def _trigger_zone_hold(db: Session, zone_id: int, current_time: datetime.datetime):
    "\"\"
    A Ring Alert fires. Zone-wide hold activated for <= 2 hours.
    All payouts in this zone are placed to 'review' status, protecting the liquidity pool.
    "\"\"
    fraud_log = FraudLog(
        zone_id=zone_id,
        flag_type="ring_alert",
        bps_score=0,
        details={"message": "Coordinated ring detected. Ratio of new-to-zone GPS activations >60%."},
        timestamp=current_time
    )
    db.add(fraud_log)
    db.commit()
    
    # In reality, this sets a Redis flag 'zone_hold_123: True'
    # which the PayoutEngine checks before transferring money.
