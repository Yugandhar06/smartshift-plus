from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Policy(Base):
    __tablename__ = "policies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_type = Column(String(20), nullable=False)  # 'light', 'regular', 'standard', 'pro', 'max'
    weekly_premium = Column(Numeric(10, 2), nullable=False)
    coverage_ratio = Column(Numeric(3, 2), nullable=False)
    max_payout = Column(Numeric(10, 2))
    hours_limit = Column(Integer)
    start_date = Column(Date, nullable=False)
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="policies")

    class Config:
        arbitrary_types_allowed = True
