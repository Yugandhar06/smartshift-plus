from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models.shift as models_shift
import models.payout as models_payout
import models.zone_score as models_zone_score
import models.policy as models_policy
from typing import List, Optional
from datetime import datetime, date

router = APIRouter(prefix="/api/payouts", tags=["Payouts"])


@router.post("/trigger")
def trigger_payout(shift_id: int, db: Session = Depends(get_db)):
    """
    3-Signal Validation + Payout Calculation
    """
    shift = db.query(models_shift.Shift).filter(models_shift.Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Signal 1: External disruption?
    latest_zone_score = db.query(models_zone_score.ZoneScore).filter(
        models_zone_score.ZoneScore.zone_id == shift.zone_id
    ).order_by(models_zone_score.ZoneScore.timestamp.desc()).first()
    
    if not latest_zone_score:
        raise HTTPException(status_code=400, detail="No zone score data available")
        
    # 3-Signal Validation Engine
    # Signal 1: External Disruption (Mandatory)
    zone_disruption = latest_zone_score.score > 60
    
    # Signal 2: Worker Presence (BPS via TrustMesh)
    # Get the latest heartbeat shift data (simulated for now, would come from mobile)
    shift_data = {
        "mock_location_detected": False,
        "gps_variance": 0.005,
        "accel_stddev": 0.8,
        "distance_km": 4.5,
        "time_hrs": 2.0,
        "orders_last_4hrs": shift.orders_completed or 0,
        "nearby_workers": 5
    }
    from services.trustmesh import calculate_bps
    bps = calculate_bps(shift_data)
    presence_passed = bps >= 75
    
    # Signal 3: Zone Demand Drop (>40% drop)
    demand_drop = (latest_zone_score.signals or {}).get("order_drop", 0) >= 40
    
    # Dynamic Effort Rule Logic
    # 61-80 Score requires min 1 order. 81-100 Requires zero orders.
    min_orders_required = 1 if (latest_zone_score.score <= 80) else 0
    actual_orders = shift.orders_completed or 0
    effort_satisfied = actual_orders >= min_orders_required

    # Validation: Mandatory Signal 1 + at least 1 other signal
    signals_passed_count = sum([zone_disruption, presence_passed, demand_drop])
    
    if not (zone_disruption and signals_passed_count >= 2) or not effort_satisfied:
        reason = "No disruption (Score <= 60)" if not zone_disruption else \
                 "Insufficient effort/presence" if not effort_satisfied else \
                 "Signal validation failed (< 2 signals)"
                 
        # Create rejected payout record
        new_payout = models_payout.Payout(
            user_id=shift.user_id,
            shift_id=shift.id,
            status="rejected",
            bps_score=bps,
            created_at=datetime.utcnow()
        )
        db.add(new_payout)
        db.commit()
        return {"status": "rejected", "reason": reason}
    
    # Calculate payout
    # Payout = (PEB − Actual) × Coverage Ratio × Confidence
    # PEB baseline for Standard worker
    peb = 900.0  
    gap_amount = peb - float(shift.earnings)
    
    if gap_amount <= 0:
        return {"status": "rejected", "reason": "No earnings gap"}
    
    # Get active policy for the user
    policy = db.query(models_policy.Policy).filter(
        models_policy.Policy.user_id == shift.user_id,
        models_policy.Policy.status == "active"
    ).order_by(models_policy.Policy.created_at.desc()).first()
    
    if not policy:
        raise HTTPException(status_code=400, detail="No active policy found for worker")
    
    # Calculation Logic
    coverage_ratio = float(policy.coverage_ratio)
    confidence = 1.0 if signals_passed_count == 3 else 0.85
    payout_amount = (gap_amount * coverage_ratio) * confidence
    
    # Limit to max_payout if defined
    if policy.max_payout:
        payout_amount = min(payout_amount, float(policy.max_payout))
    
    # Create approved payout record
    new_payout = models_payout.Payout(
        user_id=shift.user_id,
        shift_id=shift.id,
        peb_amount=peb,
        actual_amount=shift.earnings,
        gap_amount=gap_amount,
        coverage_ratio=coverage_ratio,
        signal_confidence=confidence,
        payout_amount=payout_amount,
        status="approved",
        bps_score=bps,
        created_at=datetime.utcnow(),
        processed_at=datetime.utcnow()
    )
    db.add(new_payout)
    db.commit()
    db.refresh(new_payout)
    
    # Store verification signals for the dashboard
    from models.fraud_log import FraudLog # Assuming we track signal proof
    new_log = FraudLog(
        user_id=shift.user_id,
        shift_id=shift.id,
        details=shift_data, # Sensor telemetry
        bps_score=bps,
        flag_type="SIGNAL_CLEAR"
    )
    db.add(new_log)
    db.commit()

    return {"status": "approved", "amount": round(payout_amount, 2), "payout_id": new_payout.id}

@router.get("")
def get_all_payouts(db: Session = Depends(get_db)):
    """Return all payouts for dashboard monitor"""
    payouts = db.query(models_payout.Payout).order_by(models_payout.Payout.created_at.desc()).all()
    return [{"id": p.id, "user_id": p.user_id, "shift_id": p.shift_id, "payout_amount": float(p.payout_amount) if p.payout_amount is not None else 0.0, "status": p.status, "created_at": p.created_at, "bps_score": p.bps_score, "coverage_ratio": float(p.coverage_ratio) if p.coverage_ratio is not None else None} for p in payouts]
