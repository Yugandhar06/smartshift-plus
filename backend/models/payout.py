from sqlalchemy import Column, Integer, Numeric, DateTime, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Payout(Base):
    __tablename__ = "payouts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shift_id = Column(Integer, ForeignKey("shifts.id"))
    peb_amount = Column(Numeric(10, 2))  # Personal Earning Baseline
    actual_amount = Column(Numeric(10, 2))
    gap_amount = Column(Numeric(10, 2))
    coverage_ratio = Column(Numeric(3, 2))
    signal_confidence = Column(Numeric(3, 2))
    payout_amount = Column(Numeric(10, 2))
    status = Column(String(20), default="pending")  # 'pending', 'approved', 'rejected'
    bps_score = Column(Integer)  # TrustMesh score
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)

    # Relationships
    user = relationship("User", back_populates="payouts")
    shift = relationship("Shift", back_populates="payouts")

    class Config:
        arbitrary_types_allowed = True
