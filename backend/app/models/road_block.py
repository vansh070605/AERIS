"""
RoadBlock ORM Model — tracks road accessibility during floods.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, JSON
from sqlalchemy.sql import func
from app.database import Base


class RoadBlock(Base):
    __tablename__ = "road_blocks"

    id = Column(Integer, primary_key=True, index=True)

    road_segment_id = Column(String(100), index=True)  # maps to graph edge
    road_name = Column(String(200))

    # Segment endpoints
    from_lat = Column(Float, nullable=False)
    from_lon = Column(Float, nullable=False)
    to_lat = Column(Float, nullable=False)
    to_lon = Column(Float, nullable=False)

    # Flood status
    water_depth_m = Column(Float, default=0.0)
    is_passable = Column(Boolean, default=True)
    passable_by = Column(JSON, default=list)  # ["rescue_boat", "motorized_raft"]

    zone_id = Column(Integer, index=True)
    blocked_since = Column(DateTime)
    last_updated = Column(DateTime, server_default=func.now())
