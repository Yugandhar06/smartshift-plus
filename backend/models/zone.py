from sqlalchemy import Column, Integer, String, Numeric, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    city = Column(String(50), nullable=False)
    lat_min = Column(Numeric(10, 7), nullable=False)
    lat_max = Column(Numeric(10, 7), nullable=False)
    lng_min = Column(Numeric(10, 7), nullable=False)
    lng_max = Column(Numeric(10, 7), nullable=False)
    risk_multiplier = Column(Numeric(3, 2), default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    shifts = relationship("Shift", back_populates="zone")
    zone_scores = relationship("ZoneScore", back_populates="zone")

    class Config:
        arbitrary_types_allowed = True
