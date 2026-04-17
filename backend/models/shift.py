from sqlalchemy import Column, Integer, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime)
    hours_worked = Column(Numeric(4, 2))
    earnings = Column(Numeric(10, 2))
    orders_completed = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="shifts")
    zone = relationship("Zone", back_populates="shifts")
    payouts = relationship("Payout", back_populates="shift")

    class Config:
        arbitrary_types_allowed = True
