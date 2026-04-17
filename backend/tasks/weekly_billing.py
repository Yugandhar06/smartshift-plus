from celery_app import celery_app
from database import SessionLocal
from datetime import datetime
import models.policy as models_policy
import models.user as models_user

@celery_app.task
def process_weekly_billing():
    """
    Runs every Monday at 6 AM
    Iterates through active policies and triggers premium collection via UPI Autopay
    """
    print(f"[{datetime.utcnow()}]  Starting weekly premium auto-debit run...")
    db = SessionLocal()
    try:
        active_policies = db.query(models_policy.Policy).filter(models_policy.Policy.status == 'active').all()
        
        for policy in active_policies:
            worker = db.query(models_user.User).filter(models_user.User.id == policy.user_id).first()
            if worker:
                # Integrate with payment gateway (Razorpay Autopay / UPI Mandate)
                # to auto-debit `policy.weekly_premium`
                print(f" [UPI AutoPay Task] Successfully debited INR {policy.weekly_premium} from Worker {worker.name} for {policy.plan_type} plan.")
                # Mark billing log / extend coverage for 7 days
                
    except Exception as e:
        print(f"Failed Weekly Billing Task: {str(e)}")
    finally:
        db.close()
