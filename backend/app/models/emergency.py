from sqlalchemy import Column, Integer, String, Float, DateTime, Enum as SAEnum, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class EmergencyType(str, enum.Enum):
    medical = "medical"
    fire = "fire"
    accident = "accident"
    flood = "flood"
    crime = "crime"
    other = "other"


class SeverityLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class EmergencyStatus(str, enum.Enum):
    pending = "pending"
    dispatched = "dispatched"
    in_progress = "in_progress"
    resolved = "resolved"
    cancelled = "cancelled"


class Emergency(Base):
    __tablename__ = "emergencies"

    id = Column(Integer, primary_key=True, index=True)
    emergency_type = Column(String(50), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500))

    # Severity indicators
    injury_level = Column(Integer, default=0)
    people_affected = Column(Integer, default=1)
    hazard_level = Column(Integer, default=0)
    description = Column(Text)

    # ML Outputs
    predicted_severity = Column(String(20), index=True)
    severity_confidence = Column(Float)
    shap_values = Column(JSON)

    # Status
    status = Column(String(30), default="pending", index=True)
    reporter_name = Column(String(100))
    reporter_phone = Column(String(20))
    is_crowd_sourced = Column(Integer, default=0)

    # Zone
    zone_id = Column(Integer)

    # Timestamps
    reported_at = Column(DateTime, server_default=func.now(), index=True)
    dispatched_at = Column(DateTime)
    resolved_at = Column(DateTime)
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    dispatch_logs = relationship("DispatchLog", back_populates="emergency")
