"""
Flood-Aware Geospatial Routing Engine
Routes through Chennai road network with dynamic flood penalties.
Roads blocked by water are removed or penalized. Vehicle-type-aware.
"""

import networkx as nx
import numpy as np
import math
import logging
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger(__name__)

EARTH_RADIUS_KM = 6371.0
AVG_SPEED_KMH = 25.0  # Reduced for flood conditions (from 40)
BOAT_SPEED_KMH = 12.0

CHENNAI_BOUNDS = {
    "lat_min": 12.85, "lat_max": 13.25,
    "lon_min": 80.05, "lon_max": 80.35,
}

GRAPH_CACHE_DIR = Path("app/data")
GRAPH_CACHE_FILE = GRAPH_CACHE_DIR / "chennai_graph.graphml"

# Vehicle max water depth capabilities (meters)
VEHICLE_WATER_LIMITS = {
    "rescue_boat": 999.0,       # no limit
    "motorized_raft": 999.0,    # no limit
    "ambulance": 0.4,
    "relief_truck": 0.5,
    "pump_unit": 0.3,
    "rescue_team": 1.0,         # on foot with gear
}


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = EARTH_RADIUS_KM
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


@dataclass
class RouteResult:
    resource_id: int
    resource_type: str
    distance_km: float
    estimated_time_min: float
    route_nodes: List[str]
    algorithm: str
    score: float
    flood_penalty: float = 0.0


class FloodAwareCityGraph:
    """
    Chennai road network with dynamic flood condition overlays.
    Edge weights incorporate flood risk penalties.
    """

    def __init__(self, grid_size: int = 25, city_bounds: Dict = None):
        self.grid_size = grid_size
        self.city_bounds = city_bounds or CHENNAI_BOUNDS
        self.graph = nx.DiGraph()
        self._node_coords = {}
        self._edge_flood_depths = {}  # edge -> water_depth_m
        self._use_osmnx = False

        self._build_grid_graph()

        if self._try_load_cached_osmnx():
            self._use_osmnx = True
            logger.info("Upgraded to cached OSMnx Chennai road network")

    def _try_load_cached_osmnx(self) -> bool:
        try:
            import osmnx as ox
            GRAPH_CACHE_DIR.mkdir(parents=True, exist_ok=True)
            if not GRAPH_CACHE_FILE.exists():
                logger.info("No cached OSMnx graph — using synthetic grid")
                return False

            G = ox.load_graphml(GRAPH_CACHE_FILE)
            self.graph = nx.DiGraph()
            self._node_coords = {}

            for node, data in G.nodes(data=True):
                node_id = str(node)
                lat = data.get("y", 0)
                lon = data.get("x", 0)
                self.graph.add_node(node_id, lat=lat, lon=lon, pos=(lon, lat))
                self._node_coords[node_id] = (lat, lon)

            for u, v, data in G.edges(data=True):
                src_id, dst_id = str(u), str(v)
                dist_km = data.get("length", 100) / 1000.0
                speed = data.get("speed_kph", AVG_SPEED_KMH)
                if isinstance(speed, list):
                    speed = float(speed[0])
                travel_time = (dist_km / max(speed, 5)) * 60
                self.graph.add_edge(
                    src_id, dst_id,
                    weight=travel_time, distance=dist_km,
                    base_weight=travel_time, flood_depth=0.0
                )

            logger.info(f"OSMnx: {self.graph.number_of_nodes()} nodes, {self.graph.number_of_edges()} edges")
            return True
        except ImportError:
            return False
        except Exception as e:
            logger.warning(f"OSMnx load failed: {e}")
            return False

    def _build_grid_graph(self):
        bounds = self.city_bounds
        lats = np.linspace(bounds["lat_min"], bounds["lat_max"], self.grid_size)
        lons = np.linspace(bounds["lon_min"], bounds["lon_max"], self.grid_size)

        # Assign elevation to nodes (lower in east/coastal, higher inland)
        for i, lat in enumerate(lats):
            for j, lon in enumerate(lons):
                node_id = f"n_{i}_{j}"
                # Elevation decreases toward coast (east = higher lon)
                elev = 15 - (lon - bounds["lon_min"]) / (bounds["lon_max"] - bounds["lon_min"]) * 12
                elev += np.random.normal(0, 1)
                elev = max(1, elev)
                self.graph.add_node(node_id, lat=lat, lon=lon, pos=(lon, lat), elevation=elev)
                self._node_coords[node_id] = (lat, lon)

        directions = [(0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)]
        for i in range(self.grid_size):
            for j in range(self.grid_size):
                src = f"n_{i}_{j}"
                for di, dj in directions:
                    ni, nj = i + di, j + dj
                    if 0 <= ni < self.grid_size and 0 <= nj < self.grid_size:
                        dst = f"n_{ni}_{nj}"
                        dist = haversine_distance(lats[i], lons[j], lats[ni], lons[nj])
                        traffic = np.random.uniform(0.8, 1.5)
                        travel_time = (dist / AVG_SPEED_KMH) * 60 * traffic
                        self.graph.add_edge(
                            src, dst,
                            weight=travel_time, distance=dist,
                            base_weight=travel_time, flood_depth=0.0
                        )

        logger.info(f"Flood-aware grid: {self.graph.number_of_nodes()} nodes, {self.graph.number_of_edges()} edges")

    def update_flood_conditions(self, flood_data: List[Dict[str, Any]]):
        """
        Update edge weights based on flood conditions.
        flood_data: list of {"lat": float, "lon": float, "water_depth_m": float, "radius_km": float}
        """
        updated = 0
        for flood in flood_data:
            f_lat, f_lon = flood["lat"], flood["lon"]
            depth = flood["water_depth_m"]
            radius = flood.get("radius_km", 1.0)

            for u, v, data in self.graph.edges(data=True):
                u_lat, u_lon = self._node_coords.get(u, (0, 0))
                v_lat, v_lon = self._node_coords.get(v, (0, 0))
                mid_lat = (u_lat + v_lat) / 2
                mid_lon = (u_lon + v_lon) / 2
                dist_to_flood = haversine_distance(mid_lat, mid_lon, f_lat, f_lon)

                if dist_to_flood <= radius:
                    # Flood penalty: exponential above 0.3m depth
                    local_depth = depth * max(0, 1 - dist_to_flood / radius)
                    penalty = self._compute_flood_penalty(local_depth)
                    base = data.get("base_weight", data["weight"])
                    data["weight"] = base * (1 + penalty)
                    data["flood_depth"] = local_depth
                    self._edge_flood_depths[(u, v)] = local_depth
                    updated += 1

        logger.info(f"Updated {updated} edges with flood conditions")

    def _compute_flood_penalty(self, water_depth_m: float) -> float:
        """Exponential penalty above 0.3m water depth."""
        if water_depth_m <= 0.1:
            return 0.0
        elif water_depth_m <= 0.3:
            return water_depth_m * 0.5
        else:
            return min(10.0, math.exp(water_depth_m) - 1)

    def reset_flood_conditions(self):
        """Reset all edges to base weights."""
        for u, v, data in self.graph.edges(data=True):
            data["weight"] = data.get("base_weight", data["weight"])
            data["flood_depth"] = 0.0
        self._edge_flood_depths.clear()
        logger.info("Flood conditions reset")

    def find_nearest_node(self, lat: float, lon: float) -> str:
        min_dist = float("inf")
        nearest = None
        for node_id, (n_lat, n_lon) in self._node_coords.items():
            d = (n_lat - lat) ** 2 + (n_lon - lon) ** 2
            if d < min_dist:
                min_dist = d
                nearest = node_id
        return nearest

    def shortest_path_flood_dijkstra(
        self, source: str, target: str, vehicle_type: str = "ambulance"
    ) -> Tuple[float, List[str], float]:
        """Flood-aware Dijkstra. Returns (time_min, path, total_flood_penalty)."""
        max_depth = VEHICLE_WATER_LIMITS.get(vehicle_type, 0.5)
        is_watercraft = vehicle_type in ("rescue_boat", "motorized_raft")

        if is_watercraft:
            # Boats: ignore flood penalties, penalize DRY roads instead
            try:
                path = nx.shortest_path(self.graph, source, target, weight="weight")
                total_time = nx.shortest_path_length(self.graph, source, target, weight="weight")
                speed = BOAT_SPEED_KMH
                # Recalculate with boat speed
                total_time = sum(
                    (self.graph[path[i]][path[i+1]].get("distance", 0.1) / speed) * 60
                    for i in range(len(path) - 1)
                )
                return total_time, path, 0.0
            except nx.NetworkXNoPath:
                pass

        # For ground vehicles: create subgraph excluding edges too deep
        def edge_filter(u, v):
            depth = self.graph[u][v].get("flood_depth", 0)
            return depth <= max_depth

        try:
            # Filter impassable edges
            view = nx.subgraph_view(self.graph, filter_edge=edge_filter)
            path = nx.shortest_path(view, source, target, weight="weight")
            total_time = sum(
                view[path[i]][path[i+1]]["weight"]
                for i in range(len(path) - 1)
            )
            total_penalty = sum(
                self._compute_flood_penalty(view[path[i]][path[i+1]].get("flood_depth", 0))
                for i in range(len(path) - 1)
            )
            return total_time, path, total_penalty
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            # Fallback: direct haversine estimate
            s = self.graph.nodes[source]
            t = self.graph.nodes[target]
            dist = haversine_distance(s["lat"], s["lon"], t["lat"], t["lon"])
            speed = BOAT_SPEED_KMH if is_watercraft else AVG_SPEED_KMH
            return (dist / speed) * 60, [source, target], 5.0


class FloodRoutingService:
    """Flood-aware routing for rescue dispatch in Chennai."""

    _instance: Optional["FloodRoutingService"] = None

    @classmethod
    def get_instance(cls) -> "FloodRoutingService":
        if cls._instance is None:
            cls._instance = FloodRoutingService()
        return cls._instance

    def __init__(self):
        self.city_graph = FloodAwareCityGraph()
        self._cache: Dict[Tuple, Any] = {}
        logger.info("FloodRoutingService initialized (Chennai)")

    def update_flood_conditions(self, flood_data: List[Dict]):
        self.city_graph.update_flood_conditions(flood_data)
        self._cache.clear()

    def reset_flood_conditions(self):
        self.city_graph.reset_flood_conditions()
        self._cache.clear()

    def compute_travel_time(
        self,
        from_lat: float, from_lon: float,
        to_lat: float, to_lon: float,
        vehicle_type: str = "ambulance",
        algorithm: str = "flood_dijkstra"
    ) -> Tuple[float, float, List[str], float]:
        """Returns (distance_km, travel_time_min, route_nodes, flood_penalty)."""
        cache_key = (round(from_lat, 4), round(from_lon, 4), round(to_lat, 4), round(to_lon, 4), vehicle_type)
        if cache_key in self._cache:
            return self._cache[cache_key]

        src = self.city_graph.find_nearest_node(from_lat, from_lon)
        tgt = self.city_graph.find_nearest_node(to_lat, to_lon)

        travel_time, path, penalty = self.city_graph.shortest_path_flood_dijkstra(
            src, tgt, vehicle_type=vehicle_type
        )
        distance = haversine_distance(from_lat, from_lon, to_lat, to_lon)

        result = (distance, travel_time, path, penalty)
        self._cache[cache_key] = result
        return result

    def find_optimal_resource(
        self,
        incident_lat: float,
        incident_lon: float,
        water_depth_at_scene: float,
        severity: str,
        available_resources: List[Dict[str, Any]],
        algorithm: str = "flood_dijkstra"
    ) -> Optional[RouteResult]:
        """Find optimal resource considering flood conditions and vehicle capabilities."""
        if not available_resources:
            return None

        # Severity urgency factor
        urgency = {
            "low": 1.0, "moderate": 1.3, "severe": 1.8, "catastrophic": 2.5
        }.get(severity, 1.0)

        best_result = None
        best_score = float("inf")

        for resource in available_resources:
            r_id = resource["id"]
            r_lat = resource["latitude"]
            r_lon = resource["longitude"]
            r_type = resource["resource_type"]
            r_can_water = resource.get("can_operate_in_water", False)
            r_max_depth = resource.get("max_water_depth_m", 0.5)

            # Skip if vehicle can't handle scene water depth
            if water_depth_at_scene > r_max_depth and not r_can_water:
                continue

            distance, travel_time, path, flood_penalty = self.compute_travel_time(
                r_lat, r_lon, incident_lat, incident_lon,
                vehicle_type=r_type, algorithm=algorithm
            )

            # Capability bonus: water-capable vehicles get bonus for deep water
            capability_bonus = 0.0
            if water_depth_at_scene > 0.5:
                if r_can_water:
                    capability_bonus = -travel_time * 0.2  # 20% bonus
                else:
                    capability_bonus = travel_time * 0.5  # penalty

            score = (travel_time + capability_bonus + flood_penalty * 2) / urgency

            if score < best_score:
                best_score = score
                best_result = RouteResult(
                    resource_id=r_id,
                    resource_type=r_type,
                    distance_km=round(distance, 3),
                    estimated_time_min=round(travel_time, 2),
                    route_nodes=path[:10],
                    algorithm=algorithm,
                    score=round(score, 4),
                    flood_penalty=round(flood_penalty, 4),
                )

        return best_result

    def find_nearest_shelter(
        self,
        from_lat: float, from_lon: float,
        shelters: List[Dict[str, Any]],
        vehicle_type: str = "rescue_boat"
    ) -> Optional[Dict[str, Any]]:
        """Find nearest reachable shelter for evacuation."""
        best = None
        best_time = float("inf")

        for shelter in shelters:
            if not shelter.get("is_active", True):
                continue
            if shelter.get("current_occupancy", 0) >= shelter.get("total_capacity", 200):
                continue

            dist, time, path, penalty = self.compute_travel_time(
                from_lat, from_lon,
                shelter["latitude"], shelter["longitude"],
                vehicle_type=vehicle_type
            )
            if time < best_time:
                best_time = time
                best = {
                    "shelter_id": shelter["id"],
                    "name": shelter["name"],
                    "distance_km": round(dist, 3),
                    "travel_time_min": round(time, 2),
                    "available_capacity": shelter["total_capacity"] - shelter.get("current_occupancy", 0),
                }
        return best


# Global instance
routing_service = FloodRoutingService.get_instance()
