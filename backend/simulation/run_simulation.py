"""
Flood Scenario Simulator — tests the flood response pipeline end-to-end.
Generates monsoon rainfall events, simulates flood spread, dispatches resources,
and compares optimal (Hungarian) vs greedy allocation.
"""

import sys
import time
import json
import random
import asyncio
import logging
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, List

# Add parent dir
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.ml_service import FloodMLService, train_flood_models
from app.services.routing_service import FloodRoutingService
from app.services.resource_allocation_service import ResourceAllocationService
from app.services.flood_simulation_service import FloodSimulationService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Chennai zone data (subset for simulation)
SIMULATION_ZONES = [
    {"id": 1, "name": "Velachery",  "elevation_m": 3.5, "drainage_capacity_m3s": 30, "area_km2": 28, "population": 550000, "center_latitude": 12.9815, "center_longitude": 80.2180},
    {"id": 2, "name": "Tambaram",   "elevation_m": 4.0, "drainage_capacity_m3s": 35, "area_km2": 42, "population": 420000, "center_latitude": 12.9249, "center_longitude": 80.1278},
    {"id": 3, "name": "Adyar",      "elevation_m": 3.0, "drainage_capacity_m3s": 25, "area_km2": 20, "population": 380000, "center_latitude": 13.0012, "center_longitude": 80.2565},
    {"id": 4, "name": "T. Nagar",   "elevation_m": 8.0, "drainage_capacity_m3s": 55, "area_km2": 15, "population": 530000, "center_latitude": 13.0418, "center_longitude": 80.2341},
    {"id": 5, "name": "Mudichur",   "elevation_m": 3.0, "drainage_capacity_m3s": 20, "area_km2": 30, "population": 180000, "center_latitude": 12.9050, "center_longitude": 80.0680},
    {"id": 6, "name": "Perungudi",  "elevation_m": 3.5, "drainage_capacity_m3s": 22, "area_km2": 18, "population": 280000, "center_latitude": 12.9630, "center_longitude": 80.2420},
    {"id": 7, "name": "Anna Nagar", "elevation_m": 10.0, "drainage_capacity_m3s": 60, "area_km2": 22, "population": 465000, "center_latitude": 13.0850, "center_longitude": 80.2100},
    {"id": 8, "name": "Egmore",     "elevation_m": 9.0, "drainage_capacity_m3s": 50, "area_km2": 10, "population": 310000, "center_latitude": 13.0732, "center_longitude": 80.2609},
]

SIMULATION_RESOURCES = [
    {"id": 1, "name": "NDRF Boat Alpha", "resource_type": "rescue_boat", "latitude": 13.07, "longitude": 80.25, "can_operate_in_water": True, "max_water_depth_m": 999},
    {"id": 2, "name": "SDRF Boat Tambaram", "resource_type": "rescue_boat", "latitude": 12.94, "longitude": 80.13, "can_operate_in_water": True, "max_water_depth_m": 999},
    {"id": 3, "name": "Navy Boat Marina", "resource_type": "rescue_boat", "latitude": 13.05, "longitude": 80.28, "can_operate_in_water": True, "max_water_depth_m": 999},
    {"id": 4, "name": "Fire Boat Velachery", "resource_type": "rescue_boat", "latitude": 12.98, "longitude": 80.22, "can_operate_in_water": True, "max_water_depth_m": 999},
    {"id": 5, "name": "Raft Mudichur", "resource_type": "motorized_raft", "latitude": 12.905, "longitude": 80.07, "can_operate_in_water": True, "max_water_depth_m": 999},
    {"id": 6, "name": "Ambulance Egmore", "resource_type": "ambulance", "latitude": 13.06, "longitude": 80.278, "can_operate_in_water": False, "max_water_depth_m": 0.4},
    {"id": 7, "name": "Ambulance T. Nagar", "resource_type": "ambulance", "latitude": 13.006, "longitude": 80.22, "can_operate_in_water": False, "max_water_depth_m": 0.4},
    {"id": 8, "name": "Relief Truck ANG", "resource_type": "relief_truck", "latitude": 13.086, "longitude": 80.213, "can_operate_in_water": False, "max_water_depth_m": 0.5},
    {"id": 9, "name": "Pump Velachery", "resource_type": "pump_unit", "latitude": 12.983, "longitude": 80.219, "can_operate_in_water": False, "max_water_depth_m": 0.3},
    {"id": 10, "name": "Rescue Team Egmore", "resource_type": "rescue_team", "latitude": 13.07, "longitude": 80.25, "can_operate_in_water": True, "max_water_depth_m": 1.5},
]


def generate_flood_incidents(zones: list, n: int) -> list:
    """Generate synthetic flood incidents across zones."""
    incidents = []
    for i in range(n):
        zone = random.choice(zones)
        water_level = round(random.uniform(0.3, 4.0), 2)
        severity = "low" if water_level < 0.8 else "moderate" if water_level < 1.5 else "severe" if water_level < 2.5 else "catastrophic"

        incidents.append({
            "id": i + 1,
            "latitude": zone["center_latitude"] + random.uniform(-0.01, 0.01),
            "longitude": zone["center_longitude"] + random.uniform(-0.01, 0.01),
            "water_level_m": water_level,
            "predicted_severity": severity,
            "people_stranded": random.randint(0, 30),
            "zone_name": zone["name"],
        })
    return incidents


def run_simulation(scenario: str = "moderate_monsoon", n_incidents: int = 500):
    """Run complete flood scenario simulation."""
    print("=" * 70)
    print("  AERIS — Urban Flood Response Simulator (Chennai)")
    print("=" * 70)
    print(f"  Scenario: {scenario}")
    print(f"  Zones: {len(SIMULATION_ZONES)}")
    print(f"  Resources: {len(SIMULATION_RESOURCES)}")
    print(f"  Incidents to simulate: {n_incidents}")
    print("=" * 70)

    # 1. Flood Simulation
    print("\n[1/5] Running flood spread simulation...")
    flood_sim = FloodSimulationService()
    flood_sim.initialize_zones(SIMULATION_ZONES)
    sim_result = flood_sim.run_full_simulation(scenario=scenario, duration_hours=6)

    print(f"  Peak rainfall: {sim_result['peak_rainfall_mmph']:.1f} mm/hr")
    print(f"  Zones flooded (>0.3m): {sim_result['zones_flooded']} / {sim_result['total_zones']}")
    print(f"  Roads blocked: {sim_result['roads_blocked']}")
    print(f"  Final water levels:")
    for wl in sim_result["final_water_levels"]:
        bar = "█" * int(wl["water_level_m"] * 10)
        print(f"    {wl['zone_name']:15s}: {wl['water_level_m']:.2f}m {bar}")

    # 2. Flood Prediction
    print("\n[2/5] Running ML flood severity predictions...")
    ml = FloodMLService.get_instance()
    incidents = generate_flood_incidents(SIMULATION_ZONES, n_incidents)
    predictions = {"low": 0, "moderate": 0, "severe": 0, "catastrophic": 0}

    for inc in incidents:
        try:
            pred = ml.predict(
                rainfall_intensity_mmph=random.uniform(20, 120),
                cumulative_rainfall_24h_mm=random.uniform(100, 400),
                elevation_m=random.choice([3, 4, 5, 8, 10, 12]),
                drainage_capacity_ratio=random.uniform(0.1, 0.8),
                current_water_level_m=inc["water_level_m"],
            )
            inc["predicted_severity"] = pred["severity"]
            predictions[pred["severity"]] += 1
        except Exception:
            pass

    print(f"  Predictions: {dict(predictions)}")

    # 3. Flood-Aware Routing
    print("\n[3/5] Computing flood-aware routes...")
    routing = FloodRoutingService()
    flood_data = flood_sim.get_flood_data_for_routing()
    routing.update_flood_conditions(flood_data)

    routing_times = []
    for inc in incidents[:50]:
        res = random.choice(SIMULATION_RESOURCES)
        _, travel_time, _, penalty = routing.compute_travel_time(
            res["latitude"], res["longitude"],
            inc["latitude"], inc["longitude"],
            vehicle_type=res["resource_type"],
        )
        routing_times.append(travel_time)

    print(f"  Sample routing (50 incidents):")
    print(f"    Avg travel time: {np.mean(routing_times):.1f} min")
    print(f"    P95 travel time: {np.percentile(routing_times, 95):.1f} min")

    # 4. Optimal vs Greedy Allocation
    print("\n[4/5] Comparing allocation strategies...")
    allocator = ResourceAllocationService()
    test_incidents = incidents[:min(len(SIMULATION_RESOURCES), 10)]

    # Optimal (Hungarian)
    optimal = allocator.compute_allocation(test_incidents, SIMULATION_RESOURCES)

    # Greedy (nearest first)
    import copy
    greedy_cost = np.full((len(SIMULATION_RESOURCES), len(test_incidents)), 1e6)
    for r_idx, res in enumerate(SIMULATION_RESOURCES):
        for i_idx, inc in enumerate(test_incidents):
            _, t, _, _ = routing.compute_travel_time(
                res["latitude"], res["longitude"],
                inc["latitude"], inc["longitude"],
                vehicle_type=res["resource_type"],
            )
            greedy_cost[r_idx][i_idx] = t
    greedy = allocator._greedy_allocation(test_incidents, SIMULATION_RESOURCES, greedy_cost)

    print(f"  OPTIMAL (Hungarian):")
    print(f"    Assignments: {len(optimal['assignments'])}")
    print(f"    Total response time: {optimal['total_response_time_min']:.1f} min")
    print(f"    Avg response time: {optimal['avg_response_time_min']:.1f} min")
    print(f"  GREEDY (nearest-first):")
    print(f"    Assignments: {len(greedy['assignments'])}")
    print(f"    Total response time: {greedy['total_response_time_min']:.1f} min")
    print(f"    Avg response time: {greedy['avg_response_time_min']:.1f} min")

    improvement = 0
    if greedy["avg_response_time_min"] > 0 and optimal["avg_response_time_min"] > 0:
        improvement = (1 - optimal["avg_response_time_min"] / greedy["avg_response_time_min"]) * 100

    print(f"\n  📈 IMPROVEMENT: {improvement:.1f}% reduction in avg response time with optimal allocation")

    # 5. Summary
    print("\n[5/5] Complete.")
    print("=" * 70)
    print("  SIMULATION SUMMARY")
    print(f"  Scenario: {scenario}")
    print(f"  Incidents generated: {n_incidents}")
    print(f"  Zones flooded: {sim_result['zones_flooded']}")
    print(f"  Roads blocked: {sim_result['roads_blocked']}")
    print(f"  Severity distribution: {dict(predictions)}")
    print(f"  Optimal vs Greedy improvement: {improvement:.1f}%")
    print("=" * 70)

    return {
        "simulation": sim_result,
        "predictions": predictions,
        "routing": {"avg_time": np.mean(routing_times), "p95_time": np.percentile(routing_times, 95)},
        "optimal_allocation": optimal,
        "greedy_allocation": greedy,
        "improvement_pct": improvement,
    }


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="AERIS Flood Response Simulator")
    parser.add_argument("--scenario", default="moderate_monsoon", choices=["light_rain", "moderate_monsoon", "heavy_monsoon", "chennai_2015", "coastal_surge"])
    parser.add_argument("--n", type=int, default=500, help="Number of incidents")
    args = parser.parse_args()

    result = run_simulation(scenario=args.scenario, n_incidents=args.n)
