"""
FloodIncident ORM Model — replaces generic Emergency.
Represents a flood emergency incident with water-level and drainage context.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base


class FloodType(str, enum.Enum):
    riverine = "riverine"
    pluvial = "pluvial"
    coastal = "coastal"
    storm_surge = "storm_surge"


class DrainageStatus(str, enum.Enum):
    functional = "functional"
    partial = "partial"
    overwhelmed = "overwhelmed"
    collapsed = "collapsed"


class FloodSeverity(str, enum.Enum):
    low = "low"
    moderate = "moderate"
    severe = "severe"
    catastrophic = "catastrophic"


class IncidentStatus(str, enum.Enum):
    pending = "pending"
    dispatched = "dispatched"
    in_progress = "in_progress"
    evacuating = "evacuating"
    resolved = "resolved"
    cancelled = "cancelled"


class FloodIncident(Base):
    __tablename__ = "flood_incidents"

    id = Column(Integer, primary_key=True, index=True)

    # Location
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500))
    zone_id = Column(Integer, index=True)

    # Flood Context
    flood_type = Column(String(30), default="pluvial", index=True)
    water_level_m = Column(Float, default=0.0)
    rainfall_intensity_mmph = Column(Float, default=0.0)
    drainage_status = Column(String(30), default="functional")

    # Impact
    people_stranded = Column(Integer, default=0)
    people_affected = Column(Integer, default=1)
    structures_affected = Column(Integer, default=0)
    is_road_blocked = Column(Boolean, default=False)
    description = Column(Text)

    # ML Outputs
    predicted_severity = Column(String(20), index=True)
    severity_confidence = Column(Float)
    inundation_risk_score = Column(Float)
    predicted_water_level_1h = Column(Float)
    predicted_water_level_6h = Column(Float)
    risk_hotspot_score = Column(Float)
    shap_values = Column(JSON)

    # Status
    status = Column(String(30), default="pending", index=True)

    # Reporter
    reporter_name = Column(String(100))
    reporter_phone = Column(String(20))
    is_crowd_sourced = Column(Boolean, default=False)

    # Timestamps
    reported_at = Column(DateTime, server_default=func.now(), index=True)
    dispatched_at = Column(DateTime)
    resolved_at = Column(DateTime)
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    dispatch_logs = relationship("DispatchLog", back_populates="flood_incident")
