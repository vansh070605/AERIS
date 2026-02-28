from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class DispatchLog(Base):
    __tablename__ = "dispatch_logs"

    id = Column(Integer, primary_key=True, index=True)
    emergency_id = Column(Integer, ForeignKey("emergencies.id"), nullable=False, index=True)
    resource_id = Column(Integer, ForeignKey("resources.id"), nullable=False, index=True)
    dispatcher_id = Column(Integer, ForeignKey("users.id"))

    # Routing
    route_distance_km = Column(Float)
    estimated_travel_time_min = Column(Float)
    actual_travel_time_min = Column(Float)
    routing_algorithm = Column(String(50), default="dijkstra")

    # Status
    dispatch_status = Column(String(30), default="dispatched")
    notes = Column(Text)

    # Timestamps
    dispatched_at = Column(DateTime, server_default=func.now(), index=True)
    arrived_at = Column(DateTime)
    completed_at = Column(DateTime)

    # Relationships
    emergency = relationship("Emergency", back_populates="dispatch_logs")
    resource = relationship("Resource", back_populates="dispatch_logs")
    dispatcher = relationship("User", back_populates="dispatch_logs")
