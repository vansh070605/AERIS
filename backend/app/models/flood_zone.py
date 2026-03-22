"""
FloodZone ORM Model — Chennai flood-prone zones with hydrology data.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean
from sqlalchemy.sql import func
from app.database import Base


class FloodZone(Base):
    __tablename__ = "flood_zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)

    # Geospatial
    center_latitude = Column(Float, nullable=False)
    center_longitude = Column(Float, nullable=False)
    area_km2 = Column(Float)

    # Hydrology / Terrain
    elevation_m = Column(Float, default=5.0)
    drainage_capacity_m3s = Column(Float, default=50.0)
    soil_permeability = Column(Float, default=0.3)  # 0-1
    proximity_to_coast_km = Column(Float)
    proximity_to_river_km = Column(Float)
    historical_flood_frequency = Column(Float, default=2.0)  # events per decade

    # Population
    population = Column(Integer, default=0)
    population_density = Column(Float, default=0.0)

    # Risk Scores
    flood_risk_score = Column(Float, default=0.5)  # 0-1 composite
    current_water_level_m = Column(Float, default=0.0)
    max_recorded_water_level_m = Column(Float, default=0.0)

    # Resources & Shelter
    total_resources = Column(Integer, default=0)
    shelter_capacity = Column(Integer, default=0)
    underserved_score = Column(Float, default=0.0)
    equity_score = Column(Float, default=1.0)

    is_active = Column(Boolean, default=True)
    metadata_json = Column(JSON)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
