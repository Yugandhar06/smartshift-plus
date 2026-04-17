from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
import models.policy as models_policy
import models.zone_score as models_zone_score
import models.user as models_user
from models.payout import Payout
from schemas.schemas import Policy, PolicyCreate
from typing import List
from datetime import datetime, date, timedelta

router = APIRouter(prefix="/api/users", tags=["Plans/Policies"])

# README Specifications
PLANS = {
    'light': {'base_premium': 99, 'hours_limit': 15, 'coverage_ratio': 0.60, 'max_payout': 1000},
    'regular': {'base_premium': 179, 'hours_limit': 35, 'coverage_ratio': 0.65, 'max_payout': 2000},
    'standard': {'base_premium': 249, 'hours_limit': 55, 'coverage_ratio': 0.70, 'max_payout': 3500},
    'pro': {'base_premium': 349, 'hours_limit': 70, 'coverage_ratio': 0.80, 'max_payout': 5000},
    'max': {'base_premium': 449, 'hours_limit': 9999, 'coverage_ratio': 0.90, 'max_payout': 7000}
}

@router.post("/{user_id}/plans", response_model=Policy)
def create_plan(user_id: int, plan: PolicyCreate, db: Session = Depends(get_db)):
    """Calculate premium and create an active policy for the user"""

    user = db.query(models_user.User).filter(models_user.User.id == user_id).first()

    # WEEKLY PREMIUM MODEL CALCULATION
    plan_key = plan.plan_type.lower()
    if plan_key not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan type")        

    base_data = PLANS[plan_key]
    new_base_premium = float(base_data['base_premium'])

    # Determine if this is an upgrade from an existing plan
    current_policy = db.query(models_policy.Policy).filter(
        models_policy.Policy.user_id == user_id,
        models_policy.Policy.status == "active"
    ).order_by(models_policy.Policy.created_at.desc()).first()

    is_upgrade = False
    if current_policy:
        current_base_premium = float(PLANS.get(current_policy.plan_type.lower(), {}).get('base_premium', 0))
        if new_base_premium > current_base_premium:
            is_upgrade = True

    # 2. CLAIM HISTORY FACTOR (Calculate early for Trust Score)
    ninety_days_ago = datetime.utcnow() - timedelta(days=90)
    claims = db.query(Payout).filter(
        Payout.user_id == user_id,
        Payout.created_at >= ninety_days_ago
    ).all()

    history_factor = 0.9  # Loyalty discount default (0 claims)
    flagged_count = 0
    if claims:
        flagged_count = sum(1 for c in claims if c.status == 'rejected')        
        if flagged_count == 0:
            history_factor = 1.0  # Clean approved claims
        elif flagged_count == 1:
            history_factor = 1.1  # 1 flagged
        else:
            history_factor = 1.3  # 2+ flagged (Low Trust Factor)

    # UPGRADE LOCKOUT RULES
    if is_upgrade:
        now = datetime.utcnow()
        # Rule 1: No upgrades from Friday to Sunday before Monday billing
        if now.weekday() in [4, 5, 6]:
            raise HTTPException(status_code=400, detail="Upgrades are blocked from Friday to Sunday before Monday billing.")

        # Rule 2 & 3: Score thresholds based on Trust Factor
        score_limit = 30 if history_factor >= 1.3 else 45

        if user and user.home_zone_id:
            recent_max_score = db.query(func.max(models_zone_score.ZoneScore.score)).filter(
                models_zone_score.ZoneScore.zone_id == user.home_zone_id,
                models_zone_score.ZoneScore.timestamp >= datetime.utcnow() - timedelta(hours=6)
            ).scalar()

            if recent_max_score and recent_max_score >= score_limit:
                msg = f"Predicted disruption detected. Plan changes locked."
                if history_factor >= 1.3:
                    msg = "Suspicious account history detected. Upgrade locked due to current zone risk."
                raise HTTPException(status_code=400, detail=msg)

    base_premium = new_base_premium

    # 1. ZONE RISK MULTIPLIER (Based on Home Zone history)
    zone_multiplier = 1.0
    if user and user.home_zone_id:
        avg_score = db.query(func.avg(models_zone_score.ZoneScore.score)).filter(
            models_zone_score.ZoneScore.zone_id == user.home_zone_id,
            models_zone_score.ZoneScore.timestamp >= datetime.utcnow() - timedelta(weeks=12)
        ).scalar() or 0

        if avg_score <= 30: zone_multiplier = 0.9
        elif avg_score <= 60: zone_multiplier = 1.0
        elif avg_score <= 80: zone_multiplier = 1.15
        else: zone_multiplier = 1.3

    # FINAL PREMIUM: Base Plan Rate * Zone Risk * Claim History
    final_premium = round(base_premium * zone_multiplier * history_factor, 2)   

    db_policy = models_policy.Policy(
        user_id=user_id,
        plan_type=plan_key,
        weekly_premium=final_premium,
        coverage_ratio=base_data['coverage_ratio'],
        max_payout=base_data['max_payout'],
        hours_limit=base_data['hours_limit'],
        start_date=plan.start_date,
        status="active",
        created_at=datetime.utcnow()
    )

    db.add(db_policy)
    db.commit()
    db.refresh(db_policy)
    return db_policy

@router.get("/{user_id}/plans/current", response_model=Policy)
def get_current_plan(user_id: int, db: Session = Depends(get_db)):
    """Return the active policy for the user"""
    policy = db.query(models_policy.Policy).filter(
        models_policy.Policy.user_id == user_id,
        models_policy.Policy.status == "active"
    ).order_by(models_policy.Policy.created_at.desc()).first()
    
    if not policy:
        raise HTTPException(status_code=404, detail="No active plan found for this user")
    
    # Expiration logic: Valid for 7 days
    if policy.created_at + timedelta(days=7) < datetime.utcnow():
        policy.status = "expired"
        db.commit()
        raise HTTPException(status_code=404, detail="Plan expired. Select a new plan for this week.")

