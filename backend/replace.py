import re

with open('backend/routers/policy.py', 'r') as f:
    content = f.read()

new_create_plan = '''def create_plan(user_id: int, plan: PolicyCreate, db: Session = Depends(get_db)):
    \"\"\"Calculate premium and create an active policy for the user\"\"\"

    user = db.query(models_user.User).filter(models_user.User.id == user_id).first()

    # WEEKLY PREMIUM MODEL CALCULATION
    plan_key = plan.plan_type.lower()
    if plan_key not in PLANS:
        raise HTTPException(status_code=400, detail=\"Invalid plan type\")        

    base_data = PLANS[plan_key]
    new_base_premium = float(base_data['base_premium'])

    # Determine if this is an upgrade from an existing plan
    current_policy = db.query(models_policy.Policy).filter(
        models_policy.Policy.user_id == user_id,
        models_policy.Policy.status == \"active\"
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
            raise HTTPException(status_code=400, detail=\"Upgrades are blocked from Friday to Sunday before Monday billing.\")

        # Rule 2 & 3: Score thresholds based on Trust Factor
        score_limit = 30 if history_factor >= 1.3 else 45

        if user and user.home_zone_id:
            recent_max_score = db.query(func.max(models_zone_score.ZoneScore.score)).filter(
                models_zone_score.ZoneScore.zone_id == user.home_zone_id,
                models_zone_score.ZoneScore.timestamp >= datetime.utcnow() - timedelta(hours=6)
            ).scalar()

            if recent_max_score and recent_max_score >= score_limit:
                msg = f\"Predicted disruption detected. Plan changes locked.\"
                if history_factor >= 1.3:
                    msg = \"Suspicious account history detected. Upgrade locked due to current zone risk.\"
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
        status=\"active\",
        created_at=datetime.utcnow()
    )

    db.add(db_policy)
    db.commit()
    db.refresh(db_policy)
    return db_policy'''

start_idx = content.find('def create_plan')
end_idx = content.find('def get_current_plan')

if start_idx != -1 and end_idx != -1:
    new_content = content[:start_idx] + new_create_plan + '\n\n@router.get' + content[end_idx + len('def get_current_plan'):]
    with open('backend/routers/policy.py', 'w') as f:
        f.write(new_content)
    print('Replaced successfully')
else:
    print('Could not find targets')

