import os
import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models.shift as models_shift
import models.user as models_user
import models.zone as models_zone
import models.fraud_log as models_fraud_log
from schemas.schemas import ShiftStart, ShiftEnd
from datetime import datetime

router = APIRouter(prefix="/api/shift", tags=["Shifts"])

# For demonstration, hardcoding user_id=1 since we don't have full JWT auth middleware yet
DEMO_USER_ID = 1

def check_trustmesh_velocity(start_lat, start_lng, end_lat, end_lng, db, zone_id):
    """
    Calls Google Maps Routes API to check if the distance covered is physically possible.
    If it is impossible, flags it as VELOCITY_FAIL.
    """
    key = os.getenv('GOOGLE_MAPS_API_KEY')
    if not key:
        return
        
    url = 'https://routes.googleapis.com/directions/v2:computeRoutes'
    headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters'
    }
    payload = {
      'origin': { 'location': { 'latLng': { 'latitude': start_lat, 'longitude': start_lng } } },
      'destination': {  'location': { 'latLng': { 'latitude': end_lat, 'longitude': end_lng } } },
      'travelMode': 'DRIVE'
    }
    
    try:
        res = requests.post(url, json=payload, headers=headers, timeout=5)
        if res.status_code == 200:
            data = res.json()
            if 'routes' in data and len(data['routes']) > 0:
                dist_meters = data['routes'][0].get('distanceMeters', 0)
                # Parse duration like '1504s'
                dur_str = data['routes'][0].get('duration', '0s')
                dur_seconds = int(dur_str.replace('s', '')) if 's' in dur_str else 0
                
                # TrustMesh Logic: if speed > 100km/h in city limits => Fake GPS
                if dur_seconds > 0:
                    speed_mps = dist_meters / dur_seconds
                    speed_kmh = speed_mps * 3.6
                    if speed_kmh > 100:
                        flag = models_fraud_log.FraudLog(
                            user_id=DEMO_USER_ID,
                            zone_id=zone_id,
                            flag_type="VELOCITY_FAIL",
                            description=f"Impossible velocity detected: {speed_kmh:.1f} km/h between orders",
                            timestamp=datetime.utcnow()
                        )
                        db.add(flag)
                        db.commit()
    except Exception as e:
        print(f"Google Maps API err: {e}")


@router.post("/start")
def start_shift(data: ShiftStart, db: Session = Depends(get_db)):
    # Find Zone ID from name
    zone = db.query(models_zone.Zone).filter(models_zone.Zone.name == data.zone).first()
    if not zone:
        # Default to first zone if not exact match for the demo
        zone = db.query(models_zone.Zone).first()

    new_shift = models_shift.Shift(
        user_id=data.user_id,
        zone_id=zone.id,
        start_time=datetime.utcnow(),
        orders_completed=0
    )
    db.add(new_shift)
    db.commit()
    db.refresh(new_shift)
    
    return {
        "shift_id": new_shift.id,
        "started_at": new_shift.start_time.isoformat()
    }


@router.post("/end")
def end_shift(data: ShiftEnd, db: Session = Depends(get_db)):
    shift = db.query(models_shift.Shift).filter(models_shift.Shift.id == data.shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
        
    shift.end_time = datetime.utcnow()
    shift.orders_completed = data.orders_completed
    shift.earnings = data.earned
    
    # Calculate hours worked
    delta = shift.end_time - shift.start_time
    hours = round(delta.total_seconds() / 3600, 2)
    shift.hours_worked = hours
    
    db.commit()
    
    # Kick off TrustMesh velocity check in background or inline
    # Assuming start/end of shift acts as origin/destination for demo sake
    # In real world, this would happen per-order delivery callback
    # Provide synthetic coordinates for demo if lat/lng weren't supplied in shift_end
    check_trustmesh_velocity(12.93, 77.62, 12.97, 77.59, db, shift.zone_id)
    
    return {
        "hours": hours,
        "summary": {
            "orders": shift.orders_completed,
            "earned": float(shift.earnings)
        }
    }