from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models.zone as models_zone
import models.zone_score as models_zone_score
from schemas.schemas import Zone, ZoneCreate, ZoneScore
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/zones", tags=["Zones"])

@router.get("", response_model=List[dict])
def get_all_zones(db: Session = Depends(get_db)):
    """Return all zones with latest scores for Dashboard Map"""
    zones = db.query(models_zone.Zone).all()
    results = []
    for zone in zones:
        # Get latest score for this zone
        latest_score = db.query(models_zone_score.ZoneScore).filter(
            models_zone_score.ZoneScore.zone_id == zone.id
        ).order_by(models_zone_score.ZoneScore.timestamp.desc()).first()
        
        results.append({
            "id": zone.id,
            "name": zone.name,
            "city": zone.city,
            "lat": float((zone.lat_max + zone.lat_min) / 2) if zone.lat_max and zone.lat_min else None,
            "lng": float((zone.lng_max + zone.lng_min) / 2) if zone.lng_max and zone.lng_min else None,
            "score": latest_score.score if latest_score else 0,
            "timestamp": latest_score.timestamp if latest_score else datetime.utcnow(),
            "signals": latest_score.signals if latest_score else {}
        })
    return results

@router.get("/scores", response_model=List[dict])
def get_all_zone_scores(db: Session = Depends(get_db)):
    """Special endpoint for dashboard polling"""
    return get_all_zones(db)

@router.get("/{zone_id}/score", response_model=dict)
def get_zone_score(zone_id: int, db: Session = Depends(get_db)):
    latest_score = db.query(models_zone_score.ZoneScore).filter(
        models_zone_score.ZoneScore.zone_id == zone_id
    ).order_by(models_zone_score.ZoneScore.timestamp.desc()).first()
    
    if not latest_score:
        raise HTTPException(status_code=404, detail="No score found for this zone")
    
    return {
        "zone_id": zone_id,
        "score": latest_score.score,
        "signals": latest_score.signals,
        "timestamp": latest_score.timestamp
    }

@router.post("/{zone_id}/score")
def set_zone_score(zone_id: int, score: int, signals: dict = None, db: Session = Depends(get_db)):
    """Admin override for testing"""
    new_score = models_zone_score.ZoneScore(
        zone_id=zone_id,
        score=score,
        signals=signals or {"manual_override": True},
        timestamp=datetime.utcnow()
    )
    db.add(new_score)
    db.commit()
    db.refresh(new_score)
    return {"status": "success", "new_score": score}

@router.post("", response_model=Zone)
def create_zone(zone: ZoneCreate, db: Session = Depends(get_db)):
    db_zone = models_zone.Zone(**zone.dict())
    db.add(db_zone)
    db.commit()
    db.refresh(db_zone)
    return db_zone
