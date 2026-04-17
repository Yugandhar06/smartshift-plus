from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(15), unique=True, nullable=False, index=True)
    name = Column(String(100))
    city = Column(String(100))
    area = Column(String(100))
    role = Column(String(20), default="rider")  # 'rider', 'admin'
    platform = Column(String(20))  # 'swiggy' or 'zomato'
    platform_user_id = Column(String(100))
    home_zone_id = Column(Integer, ForeignKey("zones.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    policies = relationship("Policy", back_populates="user")
    shifts = relationship("Shift", back_populates="user")
    payouts = relationship("Payout", back_populates="user")
    fraud_logs = relationship("FraudLog", back_populates="user")

    class Config:
        arbitrary_types_allowed = True
