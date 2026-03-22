"""
Pydantic Schemas — Urban Flood Disaster Response Optimization System
All schemas are flood-specific. No generic emergency types remain.
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ==================== ENUMS ====================

class FloodTypeEnum(str, Enum):
    riverine = "riverine"
    pluvial = "pluvial"
    coastal = "coastal"
    storm_surge = "storm_surge"


class FloodSeverityEnum(str, Enum):
    low = "low"
    moderate = "moderate"
    severe = "severe"
    catastrophic = "catastrophic"


class DrainageStatusEnum(str, Enum):
    functional = "functional"
    partial = "partial"
    overwhelmed = "overwhelmed"
    collapsed = "collapsed"


class IncidentStatusEnum(str, Enum):
    pending = "pending"
    dispatched = "dispatched"
    in_progress = "in_progress"
    evacuating = "evacuating"
    resolved = "resolved"
    cancelled = "cancelled"


class ResourceTypeEnum(str, Enum):
    rescue_boat = "rescue_boat"
    motorized_raft = "motorized_raft"
    ambulance = "ambulance"
    relief_truck = "relief_truck"
    pump_unit = "pump_unit"
    rescue_team = "rescue_team"


class ResourceStatusEnum(str, Enum):
    available = "available"
    busy = "busy"
    maintenance = "maintenance"
    offline = "offline"


class UserRoleEnum(str, Enum):
    admin = "admin"
    dispatcher = "dispatcher"
    viewer = "viewer"


class WaterLevelSourceEnum(str, Enum):
    sensor = "sensor"
    satellite = "satellite"
    crowd_report = "crowd_report"
    model = "model"


class DispatchTypeEnum(str, Enum):
    rescue = "rescue"
    evacuate = "evacuate"
    relief = "relief"


# ==================== AUTH SCHEMAS ====================

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None
    role: UserRoleEnum = UserRoleEnum.viewer


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str
    is_active: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


# ==================== FLOOD INCIDENT SCHEMAS ====================

class FloodIncidentCreate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None
    flood_type: FloodTypeEnum = FloodTypeEnum.pluvial
    water_level_m: float = Field(default=0.0, ge=0.0)
    rainfall_intensity_mmph: float = Field(default=0.0, ge=0.0)
    drainage_status: DrainageStatusEnum = DrainageStatusEnum.functional
    people_stranded: int = Field(default=0, ge=0)
    people_affected: int = Field(default=1, ge=1)
    structures_affected: int = Field(default=0, ge=0)
    is_road_blocked: bool = False
    description: Optional[str] = Field(None, max_length=1000)
    reporter_name: Optional[str] = None
    reporter_phone: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "latitude": 13.0418,
                "longitude": 80.2341,
                "address": "T. Nagar, Chennai",
                "flood_type": "pluvial",
                "water_level_m": 1.2,
                "rainfall_intensity_mmph": 45.0,
                "drainage_status": "overwhelmed",
                "people_stranded": 15,
                "people_affected": 50,
                "structures_affected": 8,
                "is_road_blocked": True,
                "description": "Heavy waterlogging in T. Nagar. Multiple families stranded on rooftops.",
                "reporter_name": "Ravi Kumar",
                "reporter_phone": "+91-9876543210"
            }
        }


class CrowdFloodReport(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    water_level_m: float = Field(default=0.0, ge=0.0)
    is_road_blocked: bool = False
    description: str = Field(..., min_length=10, max_length=500)
    reporter_name: Optional[str] = None
    reporter_phone: Optional[str] = None
    photo_url: Optional[str] = None


class MLFloodPrediction(BaseModel):
    severity: FloodSeverityEnum
    confidence: float
    inundation_risk_score: float
    predicted_water_level_1h: float
    predicted_water_level_6h: float
    risk_hotspot_score: float
    class_probabilities: Dict[str, float]
    shap_values: Dict[str, float]
    feature_importance: Dict[str, float]


class FloodIncidentResponse(BaseModel):
    id: int
    latitude: float
    longitude: float
    address: Optional[str]
    zone_id: Optional[int]
    flood_type: Optional[str]
    water_level_m: Optional[float]
    rainfall_intensity_mmph: Optional[float]
    drainage_status: Optional[str]
    people_stranded: Optional[int]
    people_affected: Optional[int]
    structures_affected: Optional[int]
    is_road_blocked: Optional[bool]
    description: Optional[str]
    predicted_severity: Optional[str]
    severity_confidence: Optional[float]
    inundation_risk_score: Optional[float]
    predicted_water_level_1h: Optional[float]
    predicted_water_level_6h: Optional[float]
    risk_hotspot_score: Optional[float]
    shap_values: Optional[Dict[str, float]]
    status: str
    reporter_name: Optional[str]
    reporter_phone: Optional[str]
    is_crowd_sourced: Optional[bool]
    reported_at: Optional[datetime]
    dispatched_at: Optional[datetime]
    resolved_at: Optional[datetime]
    ml_prediction: Optional[MLFloodPrediction] = None

    class Config:
        from_attributes = True


class FloodIncidentListResponse(BaseModel):
    items: List[FloodIncidentResponse]
    total: int
    page: int
    page_size: int


# ==================== RESOURCE SCHEMAS ====================

class ResourceCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    resource_type: ResourceTypeEnum
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    base_station: Optional[str] = None
    capacity: int = Field(default=1, ge=1)
    crew_count: int = Field(default=2, ge=1)
    passenger_capacity: int = Field(default=6, ge=1)
    vehicle_id: Optional[str] = None
    zone_id: Optional[int] = None
    can_operate_in_water: bool = False
    max_water_depth_m: float = Field(default=0.5, ge=0.0)


class ResourceUpdate(BaseModel):
    status: Optional[ResourceStatusEnum] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    fuel_hours_remaining: Optional[float] = None


class ResourceResponse(BaseModel):
    id: int
    name: str
    resource_type: str
    status: str
    latitude: float
    longitude: float
    base_station: Optional[str]
    capacity: int
    crew_count: int
    passenger_capacity: Optional[int]
    vehicle_id: Optional[str]
    can_operate_in_water: Optional[bool]
    max_water_depth_m: Optional[float]
    fuel_hours_remaining: Optional[float]
    current_incident_id: Optional[int]
    zone_id: Optional[int]
    is_active: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ==================== DISPATCH SCHEMAS ====================

class DispatchRequest(BaseModel):
    incident_id: int
    algorithm: str = Field(default="flood_dijkstra", pattern="^(flood_dijkstra|flood_astar)$")
    manual_resource_id: Optional[int] = None
    dispatch_type: DispatchTypeEnum = DispatchTypeEnum.rescue
    shelter_id: Optional[int] = None


class DispatchResponse(BaseModel):
    success: bool
    incident_id: int
    severity: Optional[str]
    confidence: Optional[float]
    resource: Optional[Dict[str, Any]]
    route: Optional[Dict[str, Any]]
    dispatch_log_id: Optional[int]
    shelter: Optional[Dict[str, Any]] = None
    message: Optional[str]


class DispatchLogResponse(BaseModel):
    id: int
    incident_id: int
    resource_id: int
    dispatcher_id: Optional[int]
    route_distance_km: Optional[float]
    estimated_travel_time_min: Optional[float]
    actual_travel_time_min: Optional[float]
    routing_algorithm: Optional[str]
    water_depth_at_scene_m: Optional[float]
    route_flood_penalty: Optional[float]
    shelter_id: Optional[int]
    dispatch_status: str
    dispatch_type: Optional[str]
    dispatched_at: Optional[datetime]
    arrived_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ==================== SHELTER SCHEMAS ====================

class ShelterResponse(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    address: Optional[str]
    zone_id: Optional[int]
    total_capacity: int
    current_occupancy: int
    occupancy_pct: Optional[float] = None
    has_medical_facility: bool
    has_food_supply: bool
    has_water_supply: bool
    has_power_backup: bool
    elevation_m: Optional[float]
    is_active: bool

    class Config:
        from_attributes = True


class ShelterOccupancyUpdate(BaseModel):
    current_occupancy: int = Field(..., ge=0)


# ==================== FLOOD ZONE SCHEMAS ====================

class FloodZoneResponse(BaseModel):
    id: int
    name: str
    code: str
    center_latitude: float
    center_longitude: float
    area_km2: Optional[float]
    elevation_m: Optional[float]
    drainage_capacity_m3s: Optional[float]
    flood_risk_score: Optional[float]
    current_water_level_m: Optional[float]
    max_recorded_water_level_m: Optional[float]
    population: Optional[int]
    population_density: Optional[float]
    total_resources: Optional[int]
    shelter_capacity: Optional[int]
    underserved_score: Optional[float]
    equity_score: Optional[float]

    class Config:
        from_attributes = True


# ==================== WATER LEVEL SCHEMAS ====================

class WaterLevelReading(BaseModel):
    zone_id: int
    water_level_m: float
    rate_of_rise_m_per_hr: float = 0.0
    rainfall_intensity_mmph: float = 0.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    source: WaterLevelSourceEnum = WaterLevelSourceEnum.model


class WaterLevelResponse(BaseModel):
    id: int
    zone_id: int
    water_level_m: float
    rate_of_rise_m_per_hr: Optional[float]
    rainfall_intensity_mmph: Optional[float]
    source: Optional[str]
    recorded_at: Optional[datetime]

    class Config:
        from_attributes = True


# ==================== ROAD BLOCK SCHEMAS ====================

class RoadBlockResponse(BaseModel):
    id: int
    road_segment_id: Optional[str]
    road_name: Optional[str]
    from_lat: float
    from_lon: float
    to_lat: float
    to_lon: float
    water_depth_m: float
    is_passable: bool
    passable_by: Optional[list]
    zone_id: Optional[int]
    blocked_since: Optional[datetime]

    class Config:
        from_attributes = True


# ==================== SIMULATION SCHEMAS ====================

class FloodSimulationRequest(BaseModel):
    rainfall_intensity_mmph: float = Field(default=40.0, ge=0.0)
    duration_hours: int = Field(default=6, ge=1, le=48)
    scenario: str = Field(default="moderate_monsoon")


class FloodSimulationStatus(BaseModel):
    is_running: bool
    current_hour: int
    total_hours: int
    zones_flooded: int
    roads_blocked: int
    incidents_generated: int
    water_levels: List[Dict[str, Any]]


# ==================== ANALYTICS SCHEMAS ====================

class FloodHeatmapPoint(BaseModel):
    zone_id: int
    zone_name: str
    lat: float
    lon: float
    water_level_m: float
    flood_risk_score: float
    severity: str
    population: Optional[int]


class ZoneRiskMetric(BaseModel):
    zone_id: int
    zone_name: str
    code: str
    center_lat: float
    center_lon: float
    flood_risk_score: float
    current_water_level_m: float
    elevation_m: float
    drainage_capacity_m3s: float
    avg_response_time_min: float
    total_dispatches: int
    total_resources: int
    shelter_capacity: int
    population: int
    underserved_score: float
    is_underserved: bool


class DashboardStats(BaseModel):
    flood_incidents: Dict[str, Any]
    resources: Dict[str, Any]
    shelters: Dict[str, Any]
    performance: Dict[str, Any]
    water_levels: Dict[str, Any]
