"""
AEIRAS Simulation Engine
Generates 1000 synthetic emergencies, tests the dispatch system,
and outputs comprehensive performance metrics.

Usage:
    python -m simulation.run_simulation --n 1000 --output simulation_results.json
"""

import asyncio
import random
import time
import json
import argparse
import logging
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any
from pathlib import Path

# Add backend to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.ml_service import ml_service
from app.services.routing_service import routing_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("simulation")

EMERGENCY_TYPES = ["medical", "fire", "accident", "flood", "crime", "other"]

# Delhi NCR bounding box
LAT_RANGE = (28.38, 28.88)
LON_RANGE = (76.84, 77.52)

# Resource positions (from seed data)
MOCK_RESOURCES = [
    {"id": 1, "latitude": 28.6448, "longitude": 77.2167, "resource_type": "ambulance"},
    {"id": 2, "latitude": 28.7041, "longitude": 77.1025, "resource_type": "ambulance"},
    {"id": 3, "latitude": 28.5245, "longitude": 77.2066, "resource_type": "ambulance"},
    {"id": 4, "latitude": 28.6282, "longitude": 77.3285, "resource_type": "ambulance"},
    {"id": 5, "latitude": 28.5355, "longitude": 77.3910, "resource_type": "ambulance"},
    {"id": 6, "latitude": 28.6339, "longitude": 77.2090, "resource_type": "fire_truck"},
    {"id": 7, "latitude": 28.6517, "longitude": 77.0880, "resource_type": "fire_truck"},
    {"id": 8, "latitude": 28.4595, "longitude": 77.0266, "resource_type": "fire_truck"},
    {"id": 9, "latitude": 28.6592, "longitude": 77.2276, "resource_type": "police_unit"},
    {"id": 10, "latitude": 28.7086, "longitude": 77.1324, "resource_type": "police_unit"},
    {"id": 11, "latitude": 28.5244, "longitude": 77.1855, "resource_type": "police_unit"},
    {"id": 12, "latitude": 28.4089, "longitude": 77.3178, "resource_type": "police_unit"},
    {"id": 13, "latitude": 28.6139, "longitude": 77.2090, "resource_type": "rescue_team"},
    {"id": 14, "latitude": 28.5700, "longitude": 77.3200, "resource_type": "rescue_team"},
    {"id": 15, "latitude": 28.6800, "longitude": 77.1500, "resource_type": "hazmat_unit"},
]


def generate_synthetic_emergency() -> Dict[str, Any]:
    """Generate a single synthetic emergency."""
    etype = random.choice(EMERGENCY_TYPES)

    # Time-based variation (rush hours more accidents)
    hour = random.randint(0, 23)
    day_of_week = random.randint(0, 6)

    # Weighted injury levels by type
    injury_weights = {
        "medical": (5, 4), "fire": (4, 3), "accident": (6, 3),
        "flood": (3, 3), "crime": (3, 4), "other": (2, 2)
    }
    mean_inj, std_inj = injury_weights[etype]

    return {
        "emergency_type": etype,
        "latitude": random.uniform(*LAT_RANGE),
        "longitude": random.uniform(*LON_RANGE),
        "injury_level": min(10, max(0, int(np.random.normal(mean_inj, std_inj)))),
        "people_affected": max(1, int(np.random.exponential(3))),
        "hazard_level": random.randint(0, 10),
        "hour_of_day": hour,
        "day_of_week": day_of_week,
    }


def run_ml_prediction(emergency: Dict) -> Dict:
    """Run ML prediction on a single emergency."""
    start = time.perf_counter()
    result = ml_service.predict(
        emergency_type=emergency["emergency_type"],
        injury_level=emergency["injury_level"],
        people_affected=emergency["people_affected"],
        hazard_level=emergency["hazard_level"],
        hour_of_day=emergency["hour_of_day"],
        day_of_week=emergency["day_of_week"],
    )
    elapsed_ms = (time.perf_counter() - start) * 1000
    return {**result, "prediction_time_ms": elapsed_ms}


def run_routing(emergency: Dict, resources: List[Dict]) -> Dict:
    """Run routing to find optimal resource."""
    start = time.perf_counter()
    route = routing_service.find_optimal_resource(
        emergency_lat=emergency["latitude"],
        emergency_lon=emergency["longitude"],
        emergency_type=emergency["emergency_type"],
        severity=emergency.get("severity", "medium"),
        available_resources=resources,
        algorithm="dijkstra",
    )
    elapsed_ms = (time.perf_counter() - start) * 1000

    if route:
        return {
            "resource_id": route.resource_id,
            "resource_type": route.resource_type,
            "distance_km": route.distance_km,
            "estimated_time_min": route.estimated_time_min,
            "routing_time_ms": elapsed_ms,
        }
    return {"routing_time_ms": elapsed_ms, "resource_id": None}


def compute_metrics(results: List[Dict]) -> Dict[str, Any]:
    """Compute performance metrics from simulation results."""
    ml_times = [r["ml"]["prediction_time_ms"] for r in results if "ml" in r]
    routing_times = [r["routing"]["routing_time_ms"] for r in results if "routing" in r]
    response_times = [r["routing"]["estimated_time_min"] for r in results
                      if "routing" in r and r["routing"].get("estimated_time_min")]
    dispatched = sum(1 for r in results if r["routing"].get("resource_id"))

    severity_dist = {}
    for r in results:
        sev = r["ml"]["severity"]
        severity_dist[sev] = severity_dist.get(sev, 0) + 1

    type_dist = {}
    for r in results:
        t = r["emergency_type"]
        type_dist[t] = type_dist.get(t, 0) + 1

    return {
        "total_emergencies": len(results),
        "successful_dispatches": dispatched,
        "dispatch_rate_pct": round(dispatched / len(results) * 100, 2),
        "ml_prediction": {
            "avg_ms": round(np.mean(ml_times), 2),
            "p95_ms": round(np.percentile(ml_times, 95), 2),
            "max_ms": round(max(ml_times), 2),
            "under_200ms_pct": round(sum(1 for t in ml_times if t < 200) / len(ml_times) * 100, 2),
        },
        "routing": {
            "avg_ms": round(np.mean(routing_times), 2),
            "p95_ms": round(np.percentile(routing_times, 95), 2),
            "max_ms": round(max(routing_times), 2),
            "under_300ms_pct": round(sum(1 for t in routing_times if t < 300) / len(routing_times) * 100, 2),
        },
        "response_times_min": {
            "avg": round(np.mean(response_times), 2),
            "min": round(min(response_times), 2),
            "max": round(max(response_times), 2),
            "p50": round(np.percentile(response_times, 50), 2),
            "p95": round(np.percentile(response_times, 95), 2),
        },
        "severity_distribution": severity_dist,
        "emergency_type_distribution": type_dist,
    }


def print_report(metrics: Dict):
    """Pretty-print simulation report."""
    print("\n" + "=" * 65)
    print("  AEIRAS SIMULATION REPORT")
    print("=" * 65)
    print(f"  Total Emergencies   : {metrics['total_emergencies']}")
    print(f"  Successful Dispatches: {metrics['successful_dispatches']}")
    print(f"  Dispatch Rate        : {metrics['dispatch_rate_pct']}%")
    print()
    print("  ML PREDICTION PERFORMANCE")
    ml = metrics["ml_prediction"]
    print(f"    Avg Time           : {ml['avg_ms']} ms")
    print(f"    P95 Time           : {ml['p95_ms']} ms")
    print(f"    Under 200ms        : {ml['under_200ms_pct']}%")
    print()
    print("  ROUTING PERFORMANCE")
    rt = metrics["routing"]
    print(f"    Avg Time           : {rt['avg_ms']} ms")
    print(f"    P95 Time           : {rt['p95_ms']} ms")
    print(f"    Under 300ms        : {rt['under_300ms_pct']}%")
    print()
    print("  ESTIMATED RESPONSE TIMES")
    resp = metrics["response_times_min"]
    print(f"    Avg Response       : {resp['avg']} min")
    print(f"    P50 Response       : {resp['p50']} min")
    print(f"    P95 Response       : {resp['p95']} min")
    print()
    print("  SEVERITY DISTRIBUTION")
    for sev, cnt in sorted(metrics["severity_distribution"].items()):
        pct = round(cnt / metrics["total_emergencies"] * 100, 1)
        print(f"    {sev.upper():<12}: {cnt:>5} ({pct}%)")
    print("=" * 65)


def run_simulation(n: int = 1000, output_path: str = None) -> Dict:
    """Run the full simulation."""
    logger.info(f"Starting simulation with {n} emergencies...")

    results = []
    start_total = time.perf_counter()

    for i in range(n):
        emergency = generate_synthetic_emergency()

        # ML Prediction
        ml_result = run_ml_prediction(emergency)
        emergency["severity"] = ml_result["severity"]

        # Routing
        # Use all resources as "available" for simulation
        available = random.sample(MOCK_RESOURCES, k=min(8, len(MOCK_RESOURCES)))
        routing_result = run_routing(emergency, available)

        results.append({
            "id": i + 1,
            "emergency_type": emergency["emergency_type"],
            "ml": ml_result,
            "routing": routing_result,
        })

        if (i + 1) % 100 == 0:
            logger.info(f"Processed {i + 1}/{n} emergencies...")

    total_time = time.perf_counter() - start_total
    metrics = compute_metrics(results)
    metrics["total_simulation_time_sec"] = round(total_time, 2)
    metrics["avg_throughput_per_sec"] = round(n / total_time, 1)
    metrics["generated_at"] = datetime.utcnow().isoformat()

    print_report(metrics)

    if output_path:
        with open(output_path, "w") as f:
            json.dump(metrics, f, indent=2)
        logger.info(f"Results saved to {output_path}")

    return metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AEIRAS Simulation Engine")
    parser.add_argument("--n", type=int, default=1000, help="Number of emergencies")
    parser.add_argument("--output", type=str, default="simulation_results.json")
    args = parser.parse_args()

    run_simulation(n=args.n, output_path=args.output)
