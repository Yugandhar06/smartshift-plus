from celery_app import celery_app
from database import SessionLocal
import models.payout as models_payout
import models.policy as models_policy
import models.user as models_user
from sqlalchemy import func
from datetime import datetime, timedelta

@celery_app.task
def send_weekly_summaries():
    """
    Runs every Sunday at 8 PM
    Delivers weekly reports: Premium paid | Payouts received | Net position
    """
    print(f"[{datetime.utcnow()}]  Generating weekly worker summaries...")
    db = SessionLocal()
    try:
        # Get last 7 days range
        one_week_ago = datetime.utcnow() - timedelta(days=7)
        
        workers = db.query(models_user.User).filter(models_user.User.role == 'rider').all()
        for worker in workers:
            policy = db.query(models_policy.Policy).filter(
                models_policy.Policy.user_id == worker.id, 
                models_policy.Policy.status == 'active'
            ).first()
            premium_paid = float(policy.weekly_premium) if policy else 0.0
            
            payouts_sum = db.query(func.sum(models_payout.Payout.payout_amount)).filter(
                models_payout.Payout.user_id == worker.id,
                models_payout.Payout.status == 'approved',
                models_payout.Payout.created_at >= one_week_ago
            ).scalar() or 0.0

            net_position = float(payouts_sum) - premium_paid

            # Deliver push notification to Worker's App / WhatsApp
            print(f" [WhatsApp API Stub] Sent Weekly Summary to {worker.phone}: ")
            print(f"   Premium Paid: INR {premium_paid}")
            print(f"   Payouts Won : INR {payouts_sum}")
            print(f"   Net Position: INR {round(net_position, 2)}")
            print("-" * 30)

    except Exception as e:
         print(f"Error Generating Summaries: {str(e)}")
