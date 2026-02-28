from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean
from sqlalchemy.sql import func
from app.database import Base


class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)

    # Geospatial (stored as floats in SQLite mode)
    center_latitude = Column(Float, nullable=False)
    center_longitude = Column(Float, nullable=False)
    area_km2 = Column(Float)

    # Population
    population = Column(Integer)
    population_density = Column(Float)

    # Metrics
    avg_response_time_min = Column(Float, default=0.0)
    total_emergencies = Column(Integer, default=0)
    total_resources = Column(Integer, default=0)
    underserved_score = Column(Float, default=0.0)
    equity_score = Column(Float, default=1.0)
    risk_level = Column(String(20), default="low")

    is_active = Column(Boolean, default=True)
    metadata_json = Column(JSON)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
