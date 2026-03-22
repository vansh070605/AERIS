"""
Shelter ORM Model — flood relief camps and evacuation shelters.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.sql import func
from app.database import Base


class Shelter(Base):
    __tablename__ = "shelters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500))
    zone_id = Column(Integer, index=True)

    # Capacity
    total_capacity = Column(Integer, default=200)
    current_occupancy = Column(Integer, default=0)

    # Facilities
    has_medical_facility = Column(Boolean, default=False)
    has_food_supply = Column(Boolean, default=True)
    has_water_supply = Column(Boolean, default=True)
    has_power_backup = Column(Boolean, default=False)

    # Terrain
    elevation_m = Column(Float, default=10.0)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
