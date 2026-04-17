from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import models.user as models_user
from schemas.schemas import User, UserCreate
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/signup", response_model=User)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """Create a new worker and signup"""
    db_user = db.query(models_user.User).filter(models_user.User.phone == user_data.phone).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    new_user = models_user.User(**user_data.dict(), created_at=datetime.utcnow())
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=User)
def login(phone: str, db: Session = Depends(get_db)):
    """Simple login - for now return user based on phone"""
    if phone == "admin":
        raise HTTPException(status_code=403, detail="Admins must use admin-login endpoint")
    db_user = db.query(models_user.User).filter(models_user.User.phone == phone).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

from pydantic import BaseModel
class AdminLogin(BaseModel):
    username: str
    password: str

@router.post("/admin-login")
def admin_login(creds: AdminLogin):
    if creds.username == "admin" and creds.password == "admin123":
        return {"token": "mock-admin-jwt-token", "role": "admin", "name": "System Admin"}
    raise HTTPException(status_code=401, detail="Invalid admin credentials")

router_users = APIRouter(prefix="/api/users", tags=["Users"])

@router_users.get("/{user_id}", response_model=User)
def get_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(models_user.User).filter(models_user.User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

import models.shift as models_shift
from sqlalchemy import func
from datetime import timedelta

@router_users.get('/{user_id}/performance')
def get_user_performance(user_id: int, db: Session = Depends(get_db)):
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    today_shifts = db.query(models_shift.Shift).filter(
        models_shift.Shift.user_id == user_id,
        models_shift.Shift.start_time >= today_start
    ).all()
    
    hours_today = sum([float(s.hours_worked or 0) for s in today_shifts])
    orders_today = sum([s.orders_completed or 0 for s in today_shifts])
    earned_today = sum([float(s.earnings or 0) for s in today_shifts])
    
    week_logs = []
    days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    
    for i in range(6, -1, -1):
        target_date = today_start - timedelta(days=i)
        next_date = target_date + timedelta(days=1)
        
        day_shifts = db.query(models_shift.Shift).filter(
            models_shift.Shift.user_id == user_id,
            models_shift.Shift.start_time >= target_date,
            models_shift.Shift.start_time < next_date
        ).all()
        
        day_h = sum([float(s.hours_worked or 0) for s in day_shifts])
        day_e = sum([float(s.earnings or 0) for s in day_shifts])
        
        week_logs.append({
            'day': days[target_date.weekday()],
            'h': f'{day_h:.1f}',
            'e': f'Rs {day_e:.0f}'
        })
        
    return {
        'hoursToday': round(hours_today, 1),
        'ordersToday': orders_today,
        'earnedToday': round(earned_today, 2),
        'weeklyLogs': week_logs
    }

