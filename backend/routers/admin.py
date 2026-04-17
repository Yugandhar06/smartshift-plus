from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models.zone as models_zone
import models.user as models_user
import models.shift as models_shift
from services.score_engine import calculate_safarscore
from datetime import datetime

from sqlalchemy import func
import models.policy as models_policy
import models.payout as models_payout

router = APIRouter(prefix="/api/admin", tags=["Admin Tools"])

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """Get live metrics for the Admin Dashboard"""
    workers_count = db.query(models_user.User).count()
    
    # Calculate total revenue from active policies
    revenue_sum = db.query(func.sum(models_policy.Policy.weekly_premium)).filter(
        models_policy.Policy.status == "active"
    ).scalar() or 0.0

    # Calculate total payouts approved
    payouts_sum = db.query(func.sum(models_payout.Payout.payout_amount)).filter(
        models_payout.Payout.status == "approved"
    ).scalar() or 0.0

    # Fraud blocked
    fraud_blocked = db.query(models_payout.Payout).filter(
        models_payout.Payout.status == "rejected"
    ).count()

    # Calculate loss ratio
    loss_ratio = 0
    if revenue_sum > 0:
        loss_ratio = int((float(payouts_sum) / float(revenue_sum)) * 100)

    # Format revenue for display
    def format_money(amount):
        amount = float(amount)
        if amount >= 100000:
            return f"{amount/100000:.2f}L"
        elif amount >= 1000:
            return f"{amount/1000:.1f}k"
        return str(int(amount))

    return {
        "workers": workers_count,
        "revenue": format_money(revenue_sum),
        "lossRatio": loss_ratio,
        "payoutsSum": float(payouts_sum),
        "fraudBlocked": fraud_blocked
    }

@router.post("/seed")
def seed_data(db: Session = Depends(get_db)):
    """Seed initial data for testing (Zones, Users, & Scores)"""
    # 1. Seed Zones
    zones_to_create = [
        {"name": "Indiranagar", "city": "Bangalore", "lat_min": 12.9716, "lat_max": 12.9816, "lng_min": 77.6412, "lng_max": 77.6512},
        {"name": "Koramangala", "city": "Bangalore", "lat_min": 12.9279, "lat_max": 12.9379, "lng_min": 77.6271, "lng_max": 77.6371},
        {"name": "HSR Layout", "city": "Bangalore", "lat_min": 12.9141, "lat_max": 12.9241, "lng_min": 77.6369, "lng_max": 77.6469}
    ]
    
    db_zones = []
    for z in zones_to_create:
        zone = db.query(models_zone.Zone).filter(models_zone.Zone.name == z["name"]).first()
        if not zone:
            zone = models_zone.Zone(**z)
            db.add(zone)
            db.commit()
            db.refresh(zone)
        db_zones.append(zone)

    # 2. Seed Users
    users_to_create = [
        {"phone": "9876543210", "name": "Akash Kumar", "platform": "swiggy"},
        {"phone": "8765432109", "name": "Priya Sharma", "platform": "zomato"}
    ]
    
    for u in users_to_create:
        user = db.query(models_user.User).filter(models_user.User.phone == u["phone"]).first()
        if not user:
            user = models_user.User(**u, created_at=datetime.utcnow(), home_zone_id=db_zones[0].id)
            db.add(user)
            db.commit()
            db.refresh(user)

    # 3. Trigger Initial Scores
    for zone in db_zones:
        calculate_safarscore(db, zone.id)
        
    return {"status": "success", "message": "Data seeded successfully"}

@router.post("/simulate/shift")
def simulate_shift(user_id: int, zone_id: int, hours_worked: int, earnings: float, orders_completed: int, db: Session = Depends(get_db)):
    """Add a real shift with real parameters sent by the client"""
    new_shift = models_shift.Shift(
        user_id=user_id,
        zone_id=zone_id,
        start_time=datetime.utcnow(),
        hours_worked=hours_worked,
        earnings=earnings,
        orders_completed=orders_completed,
        created_at=datetime.utcnow()
    )
    db.add(new_shift)
    db.commit()
    db.refresh(new_shift)
    return {"status": "success", "shift_id": new_shift.id, "earnings": float(new_shift.earnings)}

@router.get("/raiders-by-area")
def get_raiders_by_area(city: str, area: str, db: Session = Depends(get_db)):
    """Search for riders strictly located in a particular city and area"""
    workers = db.query(models_user.User).filter(
        models_user.User.role == 'rider',
        models_user.User.city == city,
        models_user.User.area == area
    ).all()

    return {
        "count": len(workers),
        "city": city,
        "area": area,
        "workers": [
            {
                "id": w.id,
                "name": w.name,
                "phone": w.phone,
                "platform": w.platform,
                "joined": w.created_at
            } for w in workers
        ]
    }

@router.post("/raiders")
def create_raider(phone: str, name: str, platform: str, city: str, area: str, db: Session = Depends(get_db)):
    existing_user = db.query(models_user.User).filter(models_user.User.phone == phone).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Phone number already exists")
    
    new_user = models_user.User(
        phone=phone,
        name=name,
        platform=platform,
        city=city,
        area=area,
        role="rider",
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"status": "success", "raider": new_user}

@router.put("/raiders/{raider_id}")
def update_raider(raider_id: int, phone: str = None, name: str = None, platform: str = None, city: str = None, area: str = None, db: Session = Depends(get_db)):
    user = db.query(models_user.User).filter(models_user.User.id == raider_id, models_user.User.role == 'rider').first()
    if not user:
        raise HTTPException(status_code=404, detail="Raider not found")
        
    if phone: user.phone = phone
    if name: user.name = name
    if platform: user.platform = platform
    if city: user.city = city
    if area: user.area = area
    
    db.commit()
    db.refresh(user)
    return {"status": "success", "raider": user}

@router.delete("/raiders/{raider_id}")
def delete_raider(raider_id: int, db: Session = Depends(get_db)):
    user = db.query(models_user.User).filter(models_user.User.id == raider_id, models_user.User.role == 'rider').first()
    if not user:
        raise HTTPException(status_code=404, detail="Raider not found")
        
    import models.fraud_log as models_fraud
    # Safely cascade delete all related database records first
    db.query(models_payout.Payout).filter(models_payout.Payout.user_id == raider_id).delete()
    db.query(models_fraud.FraudLog).filter(models_fraud.FraudLog.user_id == raider_id).delete()
    db.query(models_shift.Shift).filter(models_shift.Shift.user_id == raider_id).delete()
    db.query(models_policy.Policy).filter(models_policy.Policy.user_id == raider_id).delete()


    db.delete(user)
    db.commit()
    return {"status": "success"}
