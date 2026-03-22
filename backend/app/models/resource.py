"""
Resource ORM Model — flood rescue resources (boats, rafts, pumps, teams).
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=False, index=True)
    # Types: rescue_boat, motorized_raft, ambulance, relief_truck, pump_unit, rescue_team
    status = Column(String(30), default="available", index=True)

    # Location
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    base_station = Column(String(200))

    # Capacity & Capability
    capacity = Column(Integer, default=1)
    crew_count = Column(Integer, default=2)
    passenger_capacity = Column(Integer, default=6)
    vehicle_id = Column(String(50), unique=True)

    # Flood-specific capabilities
    can_operate_in_water = Column(Boolean, default=False)
    max_water_depth_m = Column(Float, default=0.5)  # max depth it can traverse
    fuel_hours_remaining = Column(Float, default=8.0)

    # Assignment
    current_incident_id = Column(Integer)
    zone_id = Column(Integer)

    # Metadata
    is_active = Column(Boolean, default=True)
    last_maintenance = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    dispatch_logs = relationship("DispatchLog", back_populates="resource")
