"""
Flood Simulation Service — Simulates flood spread across Chennai zones.
Uses simplified hydrological model: water accumulates where drainage is exceeded,
flows from high to low elevation, and blocks roads dynamically.
"""

import numpy as np
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime

logger = logging.getLogger(__name__)


@dataclass
class ZoneFloodState:
    zone_id: int
    zone_name: str
    elevation_m: float
    drainage_capacity_m3s: float
    area_km2: float
    current_water_level_m: float = 0.0
    inflow_rate_m3s: float = 0.0
    population: int = 0
    lat: float = 0.0
    lon: float = 0.0


@dataclass
class SimulationState:
    is_running: bool = False
    current_hour: int = 0
    total_hours: int = 6
    zones: List[ZoneFloodState] = field(default_factory=list)
    road_blocks: List[Dict[str, Any]] = field(default_factory=list)
    incidents_generated: int = 0
    water_level_history: List[Dict[str, Any]] = field(default_factory=list)


# Chennai monsoon rainfall profiles (mm/hr)
RAINFALL_SCENARIOS = {
    "light_rain": {"peak_mmph": 15, "duration_h": 4, "profile": "steady"},
    "moderate_monsoon": {"peak_mmph": 45, "duration_h": 6, "profile": "bell_curve"},
    "heavy_monsoon": {"peak_mmph": 80, "duration_h": 8, "profile": "bell_curve"},
    "chennai_2015": {"peak_mmph": 180, "duration_h": 12, "profile": "double_peak"},
    "coastal_surge": {"peak_mmph": 60, "duration_h": 6, "profile": "rising"},
}


class FloodSimulationService:
    """
    Simulates urban flood spread across Chennai zones.
    Simplified shallow-water model with zone-level granularity.
    """

    _instance: Optional["FloodSimulationService"] = None
    _state: SimulationState

    @classmethod
    def get_instance(cls) -> "FloodSimulationService":
        if cls._instance is None:
            cls._instance = FloodSimulationService()
        return cls._instance

    def __init__(self):
        self._state = SimulationState()

    @property
    def state(self) -> SimulationState:
        return self._state

    def initialize_zones(self, zones: List[Dict[str, Any]]):
        """Load zone data for simulation."""
        self._state.zones = [
            ZoneFloodState(
                zone_id=z["id"],
                zone_name=z.get("name", ""),
                elevation_m=z.get("elevation_m", 5.0),
                drainage_capacity_m3s=z.get("drainage_capacity_m3s", 50.0),
                area_km2=z.get("area_km2", 20.0),
                population=z.get("population", 100000),
                lat=z.get("center_latitude", 13.0),
                lon=z.get("center_longitude", 80.2),
            )
            for z in zones
        ]

    def get_rainfall_profile(self, scenario: str, total_hours: int) -> List[float]:
        """Generate hourly rainfall intensity profile."""
        config = RAINFALL_SCENARIOS.get(scenario, RAINFALL_SCENARIOS["moderate_monsoon"])
        peak = config["peak_mmph"]
        profile_type = config["profile"]

        hours = list(range(total_hours))

        if profile_type == "steady":
            return [peak * 0.8] * total_hours
        elif profile_type == "bell_curve":
            mid = total_hours / 2
            return [peak * np.exp(-0.5 * ((h - mid) / (total_hours / 4)) ** 2) for h in hours]
        elif profile_type == "double_peak":
            p1 = total_hours * 0.3
            p2 = total_hours * 0.7
            return [
                peak * max(
                    np.exp(-0.5 * ((h - p1) / 2) ** 2),
                    np.exp(-0.5 * ((h - p2) / 2) ** 2) * 0.8
                )
                for h in hours
            ]
        elif profile_type == "rising":
            return [peak * (h / total_hours) ** 1.5 for h in hours]
        else:
            return [peak * 0.5] * total_hours

    def simulate_hour(self, rainfall_mmph: float) -> Dict[str, Any]:
        """
        Simulate one hour of flood progression.
        Water accumulates where rainfall exceeds drainage capacity.
        Inter-zone flow from high water to low elevation.
        """
        hour_result = {
            "hour": self._state.current_hour,
            "rainfall_mmph": round(rainfall_mmph, 1),
            "zones": [],
            "new_road_blocks": [],
        }

        zone_states = self._state.zones

        for zone in zone_states:
            # Rainfall volume (m³/s) = mm/hr * area_km² * 1000 / 3600
            rain_inflow = rainfall_mmph * zone.area_km2 * 1000 / 3600

            # Drainage outflow
            drainage_factor = max(0.2, 1.0 - zone.current_water_level_m * 0.3)  # capacity drops when flooded
            drain_outflow = zone.drainage_capacity_m3s * drainage_factor

            # Net accumulation
            net_flow = rain_inflow - drain_outflow

            # Water level change (simplified: volume / area)
            area_m2 = zone.area_km2 * 1e6
            delta_level = (net_flow * 3600) / area_m2  # per hour

            # Elevation effect: lower zones accumulate more
            elevation_factor = max(0.5, 1.5 - zone.elevation_m / 15)
            delta_level *= elevation_factor

            # Natural seepage
            seepage = 0.02 * zone.current_water_level_m  # 2% per hour

            zone.current_water_level_m = max(0, zone.current_water_level_m + delta_level - seepage)
            zone.inflow_rate_m3s = net_flow

            # Generate road blocks for zones with significant water
            if zone.current_water_level_m > 0.3:
                n_blocked = int(zone.current_water_level_m * 3)
                for _ in range(min(n_blocked, 5)):
                    block = {
                        "zone_id": zone.zone_id,
                        "water_depth_m": round(zone.current_water_level_m * np.random.uniform(0.5, 1.2), 2),
                        "lat": zone.lat + np.random.uniform(-0.02, 0.02),
                        "lon": zone.lon + np.random.uniform(-0.02, 0.02),
                        "is_passable": zone.current_water_level_m < 0.5,
                    }
                    hour_result["new_road_blocks"].append(block)

            zone_data = {
                "zone_id": zone.zone_id,
                "zone_name": zone.zone_name,
                "water_level_m": round(zone.current_water_level_m, 3),
                "delta_level_m": round(delta_level, 4),
                "net_flow_m3s": round(net_flow, 1),
                "elevation_m": zone.elevation_m,
            }
            hour_result["zones"].append(zone_data)

        # Inter-zone flow: water flows from high-water zones to lower-elevation neighbors
        sorted_zones = sorted(zone_states, key=lambda z: z.current_water_level_m, reverse=True)
        for i, src in enumerate(sorted_zones[:len(sorted_zones)//2]):
            if src.current_water_level_m > 0.5:
                for dst in sorted_zones[len(sorted_zones)//2:]:
                    if dst.elevation_m < src.elevation_m and dst.current_water_level_m < src.current_water_level_m:
                        transfer = min(0.05, (src.current_water_level_m - dst.current_water_level_m) * 0.1)
                        src.current_water_level_m -= transfer
                        dst.current_water_level_m += transfer
                        break

        self._state.road_blocks.extend(hour_result["new_road_blocks"])
        self._state.current_hour += 1

        return hour_result

    def run_full_simulation(
        self,
        scenario: str = "moderate_monsoon",
        duration_hours: int = 6,
    ) -> Dict[str, Any]:
        """Run complete flood simulation."""
        self._state.is_running = True
        self._state.current_hour = 0
        self._state.total_hours = duration_hours
        self._state.road_blocks = []
        self._state.water_level_history = []
        self._state.incidents_generated = 0

        # Reset water levels
        for zone in self._state.zones:
            zone.current_water_level_m = 0.0

        rainfall_profile = self.get_rainfall_profile(scenario, duration_hours)
        hourly_results = []

        for hour, rainfall in enumerate(rainfall_profile):
            result = self.simulate_hour(rainfall)
            hourly_results.append(result)

            # Record water levels
            for z in result["zones"]:
                self._state.water_level_history.append({
                    "hour": hour,
                    "zone_id": z["zone_id"],
                    "zone_name": z["zone_name"],
                    "water_level_m": z["water_level_m"],
                    "rainfall_mmph": rainfall,
                })

            # Count incidents (zones with water > 0.5m and population)
            for zone in self._state.zones:
                if zone.current_water_level_m > 0.5:
                    self._state.incidents_generated += max(1, int(zone.current_water_level_m * 2))

        self._state.is_running = False

        zones_flooded = sum(1 for z in self._state.zones if z.current_water_level_m > 0.3)

        return {
            "scenario": scenario,
            "duration_hours": duration_hours,
            "peak_rainfall_mmph": round(max(rainfall_profile), 1),
            "zones_flooded": zones_flooded,
            "total_zones": len(self._state.zones),
            "roads_blocked": len(self._state.road_blocks),
            "incidents_generated": self._state.incidents_generated,
            "hourly_results": hourly_results,
            "water_level_history": self._state.water_level_history,
            "final_water_levels": [
                {
                    "zone_id": z.zone_id,
                    "zone_name": z.zone_name,
                    "water_level_m": round(z.current_water_level_m, 3),
                    "elevation_m": z.elevation_m,
                }
                for z in self._state.zones
            ],
        }

    def get_current_status(self) -> Dict[str, Any]:
        return {
            "is_running": self._state.is_running,
            "current_hour": self._state.current_hour,
            "total_hours": self._state.total_hours,
            "zones_flooded": sum(1 for z in self._state.zones if z.current_water_level_m > 0.3),
            "roads_blocked": len(self._state.road_blocks),
            "incidents_generated": self._state.incidents_generated,
            "water_levels": [
                {
                    "zone_id": z.zone_id,
                    "zone_name": z.zone_name,
                    "water_level_m": round(z.current_water_level_m, 3),
                    "lat": z.lat,
                    "lon": z.lon,
                }
                for z in self._state.zones
            ],
        }

    def get_road_blocks(self) -> List[Dict[str, Any]]:
        return self._state.road_blocks

    def get_flood_data_for_routing(self) -> List[Dict[str, Any]]:
        """Get flood data formatted for routing service update."""
        return [
            {
                "lat": z.lat,
                "lon": z.lon,
                "water_depth_m": z.current_water_level_m,
                "radius_km": max(1.0, z.area_km2 ** 0.5),
            }
            for z in self._state.zones
            if z.current_water_level_m > 0.1
        ]


flood_simulation_service = FloodSimulationService.get_instance()
