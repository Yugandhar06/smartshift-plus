import pandas as pd
from sklearn.linear_model import LinearRegression
import joblib
import os
from database import SessionLocal
import models.shift as models_shift
from datetime import datetime, timedelta

MODEL_DIR = "c:/Users/23000/Desktop/ssp/backend/ml/models"
os.makedirs(MODEL_DIR, exist_ok=True)

def train_peb_model(user_id: int):
    """
    Train a Personal Earning Baseline (PEB) model on user's shift data
    """
    db = SessionLocal()
    try:
        # Fetch 8 weeks of data
        eight_weeks_ago = datetime.utcnow() - timedelta(weeks=8)
        shifts = db.query(models_shift.Shift).filter(
            models_shift.Shift.user_id == user_id,
            models_shift.Shift.created_at >= eight_weeks_ago
        ).all()
        
        if len(shifts) < 5: # Minimum data threshold
            return None
            
        data = []
        for s in shifts:
            dt = s.created_at
            data.append({
                'day_of_week': dt.weekday(),
                'hour': dt.hour,
                'zone_id': s.zone_id,
                'earnings': float(s.earnings)
            })
            
        df = pd.DataFrame(data)
        X = df[['day_of_week', 'hour', 'zone_id']]
        y = df['earnings']
        
        model = LinearRegression()
        model.fit(X, y)
        
        model_path = os.path.join(MODEL_DIR, f'peb_user_{user_id}.pkl')
        joblib.dump(model, model_path)
        return model
    finally:
        db.close()

def predict_peb(user_id: int, zone_id: int, dt: datetime):
    """
    Predict expected earnings for a given time/zone
    """
    model_path = os.path.join(MODEL_DIR, f'peb_user_{user_id}.pkl')
    
    if not os.path.exists(model_path):
        # Fallback to a default baseline if no model exists for this specific user
        return 800.0 
        
    model = joblib.load(model_path)
    features = pd.DataFrame([{
        'day_of_week': dt.weekday(),
        'hour': dt.hour,
        'zone_id': zone_id
    }])
    
    peb = model.predict(X=features)[0]
    return max(0, peb)
