from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ==================== ENUMS ====================

class EmergencyTypeEnum(str, Enum):
    medical = "medical"
    fire = "fire"
    accident = "accident"
    flood = "flood"
    crime = "crime"
    other = "other"


class SeverityEnum(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class EmergencyStatusEnum(str, Enum):
    pending = "pending"
    dispatched = "dispatched"
    in_progress = "in_progress"
    resolved = "resolved"
    cancelled = "cancelled"


class ResourceTypeEnum(str, Enum):
    ambulance = "ambulance"
    fire_truck = "fire_truck"
    police_unit = "police_unit"
    rescue_team = "rescue_team"
    hazmat_unit = "hazmat_unit"


class ResourceStatusEnum(str, Enum):
    available = "available"
    busy = "busy"
    maintenance = "maintenance"
    offline = "offline"


class UserRoleEnum(str, Enum):
    admin = "admin"
    dispatcher = "dispatcher"
    viewer = "viewer"


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


# ==================== EMERGENCY SCHEMAS ====================

class EmergencyCreate(BaseModel):
    emergency_type: EmergencyTypeEnum
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: Optional[str] = None
    injury_level: int = Field(default=0, ge=0, le=10)
    people_affected: int = Field(default=1, ge=1, le=10000)
    hazard_level: int = Field(default=0, ge=0, le=10)
    description: Optional[str] = Field(None, max_length=1000)
    reporter_name: Optional[str] = None
    reporter_phone: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "emergency_type": "medical",
                "latitude": 28.6139,
                "longitude": 77.2090,
                "address": "Connaught Place, New Delhi",
                "injury_level": 7,
                "people_affected": 3,
                "hazard_level": 2,
                "description": "Road accident with multiple injuries",
                "reporter_name": "Amit Kumar",
                "reporter_phone": "+91-9876543210"
            }
        }


class CrowdSourcedReport(BaseModel):
    """Optional crowd-sourced incident input schema."""
    emergency_type: EmergencyTypeEnum
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    description: str = Field(..., min_length=10, max_length=500)
    reporter_name: Optional[str] = None
    reporter_phone: Optional[str] = None
    photo_url: Optional[str] = None
    people_affected: int = Field(default=1, ge=1)


class SHAPValue(BaseModel):
    emergency_type_encoded: float = 0.0
    injury_level: float = 0.0
    people_affected: float = 0.0
    hazard_level: float = 0.0
    hour_of_day: float = 0.0
    day_of_week: float = 0.0
    is_weekend: float = 0.0


class MLPredictionResult(BaseModel):
    severity: SeverityEnum
    confidence: float
    class_probabilities: Dict[str, float]
    shap_values: Dict[str, float]
    feature_importance: Dict[str, float]


class EmergencyResponse(BaseModel):
    id: int
    emergency_type: str
    latitude: float
    longitude: float
    address: Optional[str]
    injury_level: int
    people_affected: int
    hazard_level: int
    description: Optional[str]
    predicted_severity: Optional[str]
    severity_confidence: Optional[float]
    shap_values: Optional[Dict[str, float]]
    status: str
    reporter_name: Optional[str]
    reporter_phone: Optional[str]
    is_crowd_sourced: int
    zone_id: Optional[int]
    reported_at: Optional[datetime]
    dispatched_at: Optional[datetime]
    resolved_at: Optional[datetime]
    ml_prediction: Optional[MLPredictionResult] = None

    class Config:
        from_attributes = True


class EmergencyListResponse(BaseModel):
    items: List[EmergencyResponse]
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
    vehicle_id: Optional[str] = None
    zone_id: Optional[int] = None


class ResourceUpdate(BaseModel):
    status: Optional[ResourceStatusEnum] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


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
    vehicle_id: Optional[str]
    current_emergency_id: Optional[int]
    zone_id: Optional[int]
    is_active: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ==================== DISPATCH SCHEMAS ====================

class DispatchRequest(BaseModel):
    emergency_id: int
    algorithm: str = Field(default="dijkstra", pattern="^(dijkstra|astar)$")
    manual_resource_id: Optional[int] = None


class DispatchResponse(BaseModel):
    success: bool
    emergency_id: int
    severity: Optional[str]
    confidence: Optional[float]
    resource: Optional[Dict[str, Any]]
    route: Optional[Dict[str, Any]]
    dispatch_log_id: Optional[int]
    message: Optional[str]


class DispatchLogResponse(BaseModel):
    id: int
    emergency_id: int
    resource_id: int
    dispatcher_id: Optional[int]
    route_distance_km: Optional[float]
    estimated_travel_time_min: Optional[float]
    actual_travel_time_min: Optional[float]
    routing_algorithm: Optional[str]
    dispatch_status: str
    dispatched_at: Optional[datetime]
    arrived_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ==================== ANALYTICS SCHEMAS ====================

class HeatmapPoint(BaseModel):
    id: int
    lat: float
    lon: float
    intensity: float
    type: str
    severity: str
    status: str
    people_affected: Optional[int]
    reported_at: Optional[str]


class ZoneMetric(BaseModel):
    zone_id: Optional[int]
    zone_name: str
    zone_code: str
    center_lat: float
    center_lon: float
    avg_response_time_min: float
    total_dispatches: int
    total_resources: int
    equity_score: float
    underserved_score: float
    risk_level: str
    is_underserved: bool


class EquityResponse(BaseModel):
    zone_metrics: List[ZoneMetric]
    summary: Dict[str, Any]
    underserved_zones: List[ZoneMetric]


class DashboardStats(BaseModel):
    emergencies: Dict[str, Any]
    resources: Dict[str, Any]
    performance: Dict[str, Any]
