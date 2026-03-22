"""
WaterLevel ORM Model — time-series water level readings.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.database import Base


class WaterLevel(Base):
    __tablename__ = "water_levels"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, index=True, nullable=False)
    latitude = Column(Float)
    longitude = Column(Float)

    water_level_m = Column(Float, nullable=False)
    rate_of_rise_m_per_hr = Column(Float, default=0.0)
    rainfall_intensity_mmph = Column(Float, default=0.0)

    source = Column(String(30), default="model")  # sensor / satellite / crowd_report / model
    recorded_at = Column(DateTime, server_default=func.now(), index=True)
