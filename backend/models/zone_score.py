from sqlalchemy import Column, Integer, DateTime, ForeignKey, JSON, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class ZoneScore(Base):
    __tablename__ = "zone_scores"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    score = Column(Integer, CheckConstraint("score BETWEEN 0 AND 100"))
    signals = Column(JSON)  # Store all 10 signal values
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    zone = relationship("Zone", back_populates="zone_scores")

    class Config:
        arbitrary_types_allowed = True
