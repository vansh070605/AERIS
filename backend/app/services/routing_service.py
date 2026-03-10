"""
Geospatial Routing Engine
Uses NetworkX + Dijkstra/A* to compute optimal resource dispatch routes.
Supports OSMnx real road network for Chennai or falls back to synthetic grid.
"""

import networkx as nx
import numpy as np
import math
import os
import logging
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass
from geopy.distance import geodesic
from pathlib import Path

logger = logging.getLogger(__name__)

EARTH_RADIUS_KM = 6371.0
AVG_SPEED_KMH = 40.0  # Average emergency vehicle speed in Chennai traffic

# Chennai bounding box
CHENNAI_BOUNDS = {
    "lat_min": 12.85, "lat_max": 13.25,
    "lon_min": 80.05, "lon_max": 80.35,
}

GRAPH_CACHE_DIR = Path("app/data")
GRAPH_CACHE_FILE = GRAPH_CACHE_DIR / "chennai_graph.graphml"


@dataclass
class Location:
    lat: float
    lon: float
    node_id: Optional[str] = None

    @property
    def coords(self) -> Tuple[float, float]:
        return (self.lat, self.lon)


@dataclass
class RouteResult:
    resource_id: int
    resource_type: str
    distance_km: float
    estimated_time_min: float
    route_nodes: List[str]
    algorithm: str
    score: float  # Combined dispatch score


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two points in km."""
    R = EARTH_RADIUS_KM
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


class CityGraph:
    """
    Chennai road network graph.
    Attempts to load real road data via OSMnx, falls back to synthetic grid.
    """

    def __init__(self, grid_size: int = 25, city_bounds: Dict = None):
        self.grid_size = grid_size
        self.city_bounds = city_bounds or CHENNAI_BOUNDS
        self.graph = nx.DiGraph()
        self._node_coords = {}  # node_id -> (lat, lon) for fast lookup
        self._use_osmnx = False

        # Always build grid first (instant, ~0.3s)
        self._build_grid_graph()

        # If a cached OSMnx graph exists on disk, load it (no download)
        if self._try_load_cached_osmnx():
            self._use_osmnx = True
            logger.info("Upgraded to cached OSMnx Chennai road network")

    def _try_load_cached_osmnx(self) -> bool:
        """Load OSMnx graph ONLY from a pre-cached file. Never downloads."""
        try:
            import osmnx as ox

            GRAPH_CACHE_DIR.mkdir(parents=True, exist_ok=True)

            if not GRAPH_CACHE_FILE.exists():
                logger.info("No cached OSMnx graph found — using synthetic grid")
                logger.info("Run 'python -m app.services.routing_service' to download the graph")
                return False

            logger.info(f"Loading cached Chennai graph from {GRAPH_CACHE_FILE}")
            G = ox.load_graphml(GRAPH_CACHE_FILE)

            # Replace the grid graph with the real road network
            self.graph = nx.DiGraph()
            self._node_coords = {}

            for node, data in G.nodes(data=True):
                node_id = str(node)
                lat = data.get("y", 0)
                lon = data.get("x", 0)
                self.graph.add_node(node_id, lat=lat, lon=lon, pos=(lon, lat))
                self._node_coords[node_id] = (lat, lon)

            for u, v, data in G.edges(data=True):
                src_id = str(u)
                dst_id = str(v)
                dist_m = data.get("length", 100)
                dist_km = dist_m / 1000.0
                speed = data.get("speed_kph", AVG_SPEED_KMH)
                if isinstance(speed, list):
                    speed = float(speed[0])
                travel_time = (dist_km / max(speed, 10)) * 60
                self.graph.add_edge(src_id, dst_id, weight=travel_time, distance=dist_km)

            logger.info(
                f"OSMnx graph loaded: {self.graph.number_of_nodes()} nodes, "
                f"{self.graph.number_of_edges()} edges"
            )
            return True

        except ImportError:
            return False
        except Exception as e:
            logger.warning(f"Failed to load cached graph: {e} — keeping grid")
            return False

    def _build_grid_graph(self):
        """Build a grid-based road network graph for Chennai."""
        bounds = self.city_bounds
        lats = np.linspace(bounds["lat_min"], bounds["lat_max"], self.grid_size)
        lons = np.linspace(bounds["lon_min"], bounds["lon_max"], self.grid_size)

        # Add nodes
        for i, lat in enumerate(lats):
            for j, lon in enumerate(lons):
                node_id = f"n_{i}_{j}"
                self.graph.add_node(node_id, lat=lat, lon=lon, pos=(lon, lat))
                self._node_coords[node_id] = (lat, lon)

        # Add edges (8-directional connectivity)
        directions = [(0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)]
        for i in range(self.grid_size):
            for j in range(self.grid_size):
                src = f"n_{i}_{j}"
                src_lat, src_lon = lats[i], lons[j]
                for di, dj in directions:
                    ni, nj = i + di, j + dj
                    if 0 <= ni < self.grid_size and 0 <= nj < self.grid_size:
                        dst = f"n_{ni}_{nj}"
                        dst_lat, dst_lon = lats[ni], lons[nj]
                        dist = haversine_distance(src_lat, src_lon, dst_lat, dst_lon)
                        # Add traffic factor (random 0.8 - 1.5)
                        traffic = np.random.uniform(0.8, 1.5)
                        travel_time = (dist / AVG_SPEED_KMH) * 60 * traffic
                        self.graph.add_edge(src, dst, weight=travel_time, distance=dist)

        logger.info(f"Synthetic Chennai grid built: {self.graph.number_of_nodes()} nodes, {self.graph.number_of_edges()} edges")

    def find_nearest_node(self, lat: float, lon: float) -> str:
        """Find the nearest graph node to a geographic coordinate."""
        min_dist = float("inf")
        nearest = None

        # If we have precomputed coords, use them for speed
        if self._node_coords:
            for node_id, (n_lat, n_lon) in self._node_coords.items():
                d = (n_lat - lat) ** 2 + (n_lon - lon) ** 2
                if d < min_dist:
                    min_dist = d
                    nearest = node_id
        else:
            for node, data in self.graph.nodes(data=True):
                d = (data["lat"] - lat) ** 2 + (data["lon"] - lon) ** 2
                if d < min_dist:
                    min_dist = d
                    nearest = node

        return nearest

    def shortest_path_dijkstra(
        self, source: str, target: str
    ) -> Tuple[float, List[str]]:
        """Compute shortest path using Dijkstra's algorithm (travel time in minutes)."""
        try:
            path = nx.shortest_path(self.graph, source, target, weight="weight")
            total_time = nx.shortest_path_length(self.graph, source, target, weight="weight")
            return total_time, path
        except nx.NetworkXNoPath:
            src_data = self.graph.nodes[source]
            tgt_data = self.graph.nodes[target]
            dist = haversine_distance(src_data["lat"], src_data["lon"], tgt_data["lat"], tgt_data["lon"])
            return (dist / AVG_SPEED_KMH) * 60, [source, target]

    def shortest_path_astar(
        self, source: str, target: str
    ) -> Tuple[float, List[str]]:
        """Compute shortest path using A* algorithm with heuristic."""
        def heuristic(n1, n2):
            d1 = self.graph.nodes[n1]
            d2 = self.graph.nodes[n2]
            return haversine_distance(d1["lat"], d1["lon"], d2["lat"], d2["lon"]) / AVG_SPEED_KMH * 60

        try:
            path = nx.astar_path(self.graph, source, target, heuristic=heuristic, weight="weight")
            total_time = sum(
                self.graph[path[i]][path[i + 1]]["weight"]
                for i in range(len(path) - 1)
            )
            return total_time, path
        except nx.NetworkXNoPath:
            src_data = self.graph.nodes[source]
            tgt_data = self.graph.nodes[target]
            dist = haversine_distance(src_data["lat"], src_data["lon"], tgt_data["lat"], tgt_data["lon"])
            return (dist / AVG_SPEED_KMH) * 60, [source, target]


class RoutingService:
    """
    Main routing service for emergency dispatch.
    Selects optimal resource based on routing + load balancing.
    """

    _instance: Optional["RoutingService"] = None

    @classmethod
    def get_instance(cls) -> "RoutingService":
        if cls._instance is None:
            cls._instance = RoutingService()
        return cls._instance

    def __init__(self):
        self.city_graph = CityGraph()
        self._travel_time_cache: Dict[Tuple, float] = {}
        logger.info("RoutingService initialized (Chennai)")

    def compute_travel_time(
        self,
        from_lat: float, from_lon: float,
        to_lat: float, to_lon: float,
        algorithm: str = "dijkstra"
    ) -> Tuple[float, float, List[str]]:
        """
        Compute travel time from resource to emergency.
        Returns (distance_km, travel_time_min, route_nodes).
        """
        cache_key = (round(from_lat, 4), round(from_lon, 4), round(to_lat, 4), round(to_lon, 4))

        if cache_key in self._travel_time_cache:
            return self._travel_time_cache[cache_key]

        # Map to graph nodes
        src_node = self.city_graph.find_nearest_node(from_lat, from_lon)
        tgt_node = self.city_graph.find_nearest_node(to_lat, to_lon)

        if algorithm == "astar":
            travel_time, path = self.city_graph.shortest_path_astar(src_node, tgt_node)
        else:
            travel_time, path = self.city_graph.shortest_path_dijkstra(src_node, tgt_node)

        # Compute actual distance
        distance = haversine_distance(from_lat, from_lon, to_lat, to_lon)

        result = (distance, travel_time, path)
        self._travel_time_cache[cache_key] = result
        return result

    def find_optimal_resource(
        self,
        emergency_lat: float,
        emergency_lon: float,
        emergency_type: str,
        severity: str,
        available_resources: List[Dict[str, Any]],
        algorithm: str = "dijkstra"
    ) -> Optional[RouteResult]:
        """
        Find the optimal resource for dispatch using composite scoring.
        Factors: distance, travel time, resource type match, load balance.
        """
        if not available_resources:
            return None

        # Type preference mapping
        type_preference = {
            "medical": ["ambulance", "rescue_team"],
            "fire": ["fire_truck", "hazmat_unit", "rescue_team"],
            "accident": ["ambulance", "fire_truck", "police_unit"],
            "flood": ["rescue_team", "fire_truck", "ambulance"],
            "crime": ["police_unit", "ambulance"],
            "other": ["ambulance", "police_unit", "fire_truck"],
        }

        preferred_types = type_preference.get(emergency_type, ["ambulance"])

        # Severity urgency factor
        urgency = {
            "low": 1.0, "medium": 1.2, "high": 1.5, "critical": 2.0
        }.get(severity, 1.0)

        best_result = None
        best_score = float("inf")

        for resource in available_resources:
            r_id = resource["id"]
            r_lat = resource["latitude"]
            r_lon = resource["longitude"]
            r_type = resource["resource_type"]

            distance, travel_time, path = self.compute_travel_time(
                r_lat, r_lon,
                emergency_lat, emergency_lon,
                algorithm=algorithm
            )

            # Type match bonus (lower is better)
            type_penalty = 0.0 if r_type in preferred_types else 0.3 * travel_time

            # Composite score (lower = better dispatch priority)
            score = (travel_time + type_penalty) / urgency

            if score < best_score:
                best_score = score
                best_result = RouteResult(
                    resource_id=r_id,
                    resource_type=r_type,
                    distance_km=round(distance, 3),
                    estimated_time_min=round(travel_time, 2),
                    route_nodes=path[:10],  # Return first 10 nodes as representative
                    algorithm=algorithm,
                    score=round(score, 4),
                )

        return best_result

    def compute_travel_time_matrix(
        self,
        resources: List[Dict[str, Any]],
        emergencies: List[Dict[str, Any]]
    ) -> np.ndarray:
        """
        Precompute travel time matrix between all resources and emergencies.
        Returns matrix of shape (len(resources), len(emergencies)).
        """
        matrix = np.zeros((len(resources), len(emergencies)))
        for i, r in enumerate(resources):
            for j, e in enumerate(emergencies):
                _, time, _ = self.compute_travel_time(
                    r["latitude"], r["longitude"],
                    e["latitude"], e["longitude"]
                )
                matrix[i, j] = time
        return matrix


# Global routing service instance
routing_service = RoutingService.get_instance()
