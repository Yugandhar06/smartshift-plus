from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import random

from database import get_db
from models.payout import Payout
from models.policy import Policy

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/")
def get_analytics(db: Session = Depends(get_db)):
    # Calculate "This Week" (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    # Get actual payouts for this week
    actual_payouts_sum = db.query(func.sum(Payout.payout_amount)).filter(
        Payout.created_at >= seven_days_ago,
        Payout.status == 'approved'
    ).scalar() or 0.0

    # Get actual revenue (mock revenue by sum of policy premium prices that were created this week)
    # Assuming each policy generates 499 INR revenue.
    policies_this_week_count = db.query(Policy).filter(
        Policy.created_at >= seven_days_ago
    ).count()
    actual_revenue = policies_this_week_count * 499

    # Build the 4-week chart (Mocking the first 3 weeks to show history, using real DB for Week 4)
    data = [
        {"name": "Week 1", "revenue": 4200, "payouts": 2100},
        {"name": "Week 2", "revenue": 3800, "payouts": 1400},
        {"name": "Week 3", "revenue": 4500, "payouts": 900},
        {
            "name": "Week 4 (Current)", 
            "revenue": float(actual_revenue) + 3000, # Base revenue + actuals
            "payouts": float(actual_payouts_sum) + 500 # Base payouts + actuals
        },
    ]

    return {"chart_data": data}