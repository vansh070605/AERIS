"""
DispatchLog ORM Model — records flood rescue dispatch events.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class DispatchLog(Base):
    __tablename__ = "dispatch_logs"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(Integer, ForeignKey("flood_incidents.id"), nullable=False, index=True)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False, index=True)
    dispatcher_id = Column(Integer, ForeignKey("users.id"))

    # Routing
    route_distance_km = Column(Float)
    estimated_travel_time_min = Column(Float)
    actual_travel_time_min = Column(Float)
    routing_algorithm = Column(String(50), default="flood_dijkstra")

    # Flood context
    water_depth_at_scene_m = Column(Float, default=0.0)
    route_flood_penalty = Column(Float, default=0.0)
    shelter_id = Column(Integer)  # if evacuating to shelter

    # Status
    dispatch_status = Column(String(30), default="dispatched")
    dispatch_type = Column(String(30), default="rescue")  # rescue / evacuate / relief
    notes = Column(Text)

    # Timestamps
    dispatched_at = Column(DateTime, server_default=func.now(), index=True)
    arrived_at = Column(DateTime)
    completed_at = Column(DateTime)

    # Relationships
    flood_incident = relationship("FloodIncident", back_populates="dispatch_logs")
    resource = relationship("Resource", back_populates="dispatch_logs")
    dispatcher = relationship("User", back_populates="dispatch_logs")
