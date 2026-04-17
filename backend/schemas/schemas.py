from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime
from decimal import Decimal

# Zone Schemas
class ZoneBase(BaseModel):
    name: str
    city: str
    lat_min: Decimal
    lat_max: Decimal
    lng_min: Decimal
    lng_max: Decimal
    risk_multiplier: Optional[Decimal] = 1.0

class ZoneCreate(ZoneBase):
    pass

class Zone(ZoneBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ZoneScoreBase(BaseModel):
    zone_id: int
    score: int
    signals: Dict[str, Any]

class ZoneScore(ZoneScoreBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

# User/Auth Schemas
class UserBase(BaseModel):
    phone: str
    name: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None
    role: str = "rider"
    platform: Optional[str] = None
    platform_user_id: Optional[str] = None
    home_zone_id: Optional[int] = None

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Policy/Plan Schemas
class PolicyBase(BaseModel):
    plan_type: str
    weekly_premium: Decimal
    coverage_ratio: Decimal
    max_payout: Optional[Decimal] = None
    hours_limit: Optional[int] = None
    start_date: datetime
    status: str = "active"

class PolicyCreate(PolicyBase):
    user_id: int

class Policy(PolicyBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

from pydantic import BaseModel
from typing import Optional

class ShiftStart(BaseModel):
    user_id: int
    zone: str
    lat: float
    lng: float

class ShiftEnd(BaseModel):
    shift_id: int
    orders_completed: int
    earned: float
