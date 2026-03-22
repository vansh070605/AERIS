"""
Resource Allocation Service — Optimal assignment using Hungarian algorithm.
Solves the bipartite matching: resources → flood incidents.
"""

import numpy as np
import logging
from typing import List, Dict, Any, Optional
from app.services.routing_service import routing_service

logger = logging.getLogger(__name__)


class ResourceAllocationService:
    """
    Optimal flood rescue resource allocation using weighted bipartite matching.
    Objective: minimize total weighted response time across all active incidents.
    """

    def compute_allocation(
        self,
        incidents: List[Dict[str, Any]],
        resources: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Compute optimal resource-to-incident allocation.
        Uses scipy.optimize.linear_sum_assignment (Hungarian algorithm).

        Returns: {
            "assignments": [{incident_id, resource_id, eta_min, distance_km, score}],
            "unassigned_incidents": [incident_ids],
            "idle_resources": [resource_ids],
            "total_response_time_min": float,
            "avg_response_time_min": float,
        }
        """
        if not incidents or not resources:
            return {
                "assignments": [],
                "unassigned_incidents": [i["id"] for i in incidents],
                "idle_resources": [r["id"] for r in resources],
                "total_response_time_min": 0,
                "avg_response_time_min": 0,
            }

        n_inc = len(incidents)
        n_res = len(resources)

        # Build cost matrix: cost[r][i] = weighted travel time
        cost_matrix = np.full((n_res, n_inc), 1e6)  # infeasible default

        for r_idx, res in enumerate(resources):
            r_type = res.get("resource_type", "ambulance")
            r_can_water = res.get("can_operate_in_water", False)
            r_max_depth = res.get("max_water_depth_m", 0.5)

            for i_idx, inc in enumerate(incidents):
                water_depth = inc.get("water_level_m", 0)
                severity = inc.get("predicted_severity", "moderate")

                # Check vehicle capability
                if water_depth > r_max_depth and not r_can_water:
                    continue  # infeasible assignment

                # Compute travel time
                distance, travel_time, _, flood_penalty = routing_service.compute_travel_time(
                    res["latitude"], res["longitude"],
                    inc["latitude"], inc["longitude"],
                    vehicle_type=r_type,
                )

                # Severity urgency weight
                urgency = {
                    "low": 1.0, "moderate": 1.3, "severe": 2.0, "catastrophic": 3.0
                }.get(severity, 1.0)

                # Capability bonus for water vehicles in deep water
                cap_factor = 1.0
                if water_depth > 0.5 and r_can_water:
                    cap_factor = 0.7  # 30% cost reduction
                elif water_depth > 0.5 and not r_can_water:
                    cap_factor = 2.0  # double cost

                # People stranded urgency
                people_factor = 1.0 + min(1.0, inc.get("people_stranded", 0) / 50)

                cost = (travel_time * cap_factor + flood_penalty) / (urgency * people_factor)
                cost_matrix[r_idx][i_idx] = cost

        # Solve with Hungarian algorithm
        try:
            from scipy.optimize import linear_sum_assignment
            row_ind, col_ind = linear_sum_assignment(cost_matrix)
        except ImportError:
            logger.warning("scipy not available — falling back to greedy assignment")
            return self._greedy_allocation(incidents, resources, cost_matrix)

        # Build assignments
        assignments = []
        assigned_incidents = set()
        assigned_resources = set()

        for r_idx, i_idx in zip(row_ind, col_ind):
            cost = cost_matrix[r_idx][i_idx]
            if cost >= 1e5:  # infeasible
                continue

            res = resources[r_idx]
            inc = incidents[i_idx]

            distance, travel_time, _, penalty = routing_service.compute_travel_time(
                res["latitude"], res["longitude"],
                inc["latitude"], inc["longitude"],
                vehicle_type=res.get("resource_type", "ambulance"),
            )

            assignments.append({
                "incident_id": inc["id"],
                "resource_id": res["id"],
                "resource_type": res.get("resource_type"),
                "resource_name": res.get("name"),
                "eta_min": round(travel_time, 2),
                "distance_km": round(distance, 3),
                "flood_penalty": round(penalty, 4),
                "score": round(cost, 4),
            })
            assigned_incidents.add(inc["id"])
            assigned_resources.add(res["id"])

        unassigned = [i["id"] for i in incidents if i["id"] not in assigned_incidents]
        idle = [r["id"] for r in resources if r["id"] not in assigned_resources]
        total_time = sum(a["eta_min"] for a in assignments)
        avg_time = total_time / len(assignments) if assignments else 0

        return {
            "assignments": assignments,
            "unassigned_incidents": unassigned,
            "idle_resources": idle,
            "total_response_time_min": round(total_time, 2),
            "avg_response_time_min": round(avg_time, 2),
        }

    def _greedy_allocation(
        self,
        incidents: List[Dict],
        resources: List[Dict],
        cost_matrix: np.ndarray
    ) -> Dict[str, Any]:
        """Fallback: greedy nearest-resource assignment."""
        assignments = []
        used_resources = set()

        for i_idx, inc in enumerate(incidents):
            best_r = None
            best_cost = float("inf")
            for r_idx, res in enumerate(resources):
                if r_idx in used_resources:
                    continue
                if cost_matrix[r_idx][i_idx] < best_cost:
                    best_cost = cost_matrix[r_idx][i_idx]
                    best_r = r_idx

            if best_r is not None and best_cost < 1e5:
                res = resources[best_r]
                assignments.append({
                    "incident_id": inc["id"],
                    "resource_id": res["id"],
                    "resource_type": res.get("resource_type"),
                    "resource_name": res.get("name"),
                    "eta_min": round(best_cost * 5, 2),  # rough estimate
                    "distance_km": 0,
                    "flood_penalty": 0,
                    "score": round(best_cost, 4),
                })
                used_resources.add(best_r)

        total_time = sum(a["eta_min"] for a in assignments)
        return {
            "assignments": assignments,
            "unassigned_incidents": [i["id"] for i in incidents if i["id"] not in {a["incident_id"] for a in assignments}],
            "idle_resources": [r["id"] for r in resources if r["id"] not in {a["resource_id"] for a in assignments}],
            "total_response_time_min": round(total_time, 2),
            "avg_response_time_min": round(total_time / max(len(assignments), 1), 2),
        }


resource_allocation_service = ResourceAllocationService()
