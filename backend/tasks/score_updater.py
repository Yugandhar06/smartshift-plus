from celery_app import celery_app
from services.score_engine import calculate_safarscore
from services.payout_engine import PayoutEngine
from database import SessionLocal
import models.zone as models_zone
from datetime import datetime

@celery_app.task
def update_all_zone_scores():
    """
    Runs every 15 minutes to refresh SafarScores for all active zones.
    If Score > 60, triggers 3-Signal Validation for Payouts.
    """
    db = SessionLocal()
    try:
        zones = db.query(models_zone.Zone).all()
        payout_engine = PayoutEngine(db)

        for zone in zones:
            # calculate_safarscore handles the logic of gathering signals and
            # updating the zone_scores table
            score = calculate_safarscore(db, zone.id)
            print(f"[{datetime.utcnow()}] Zone {zone.name} (ID: {zone.id}) - Updated Score: {score}")
            
            # TRIGGER CONDITION: If SafarScore breaches 60, execute payout logic
            if score > 60:
                print(f"️ SafarScore breach ({score}) in Zone {zone.id}! Alerting Payout Engine...")
                payout_engine.process_disruption_trigger(zone.id, score)
        print(f"Error updating zone scores: {e}")
    finally:
        db.close()
