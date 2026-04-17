from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class FraudLog(Base):
    __tablename__ = "fraud_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    shift_id = Column(Integer)
    zone_id = Column(Integer)
    bps_score = Column(Integer)
    flag_type = Column(String(50))  # 'mock_gps', 'ring_alert', 'velocity_fail'
    details = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="fraud_logs")

    class Config:
        arbitrary_types_allowed = True
