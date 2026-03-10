"""
Hotspot Detection Service
Uses DBSCAN and K-Means clustering to detect emergency hotspots from incident data.
"""

import logging
import math
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import Counter
from sklearn.cluster import DBSCAN, KMeans
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.emergency import Emergency

logger = logging.getLogger(__name__)


class HotspotService:
    """DBSCAN + K-Means based emergency hotspot detection."""

    async def detect_hotspots(
        self,
        db: AsyncSession,
        hours: int = 720,
        emergency_type: Optional[str] = None,
        eps_km: float = 0.5,
        min_samples: int = 5,
    ) -> Dict[str, Any]:
        """
        Detect emergency hotspots using DBSCAN clustering.

        Args:
            hours: Look-back window in hours (default 720 = 30 days)
            emergency_type: Optional filter by emergency type
            eps_km: DBSCAN epsilon in km (default 0.5 km)
            min_samples: DBSCAN minimum samples per cluster

        Returns:
            Dict with clusters, noise count, and metadata.
        """
        since = datetime.utcnow() - timedelta(hours=hours)
        query = select(Emergency).where(Emergency.reported_at >= since)

        if emergency_type:
            query = query.where(Emergency.emergency_type == emergency_type)

        result = await db.execute(query)
        emergencies = result.scalars().all()

        if len(emergencies) < min_samples:
            return {
                "clusters": [],
                "total_incidents": len(emergencies),
                "noise_count": len(emergencies),
                "algorithm": "dbscan",
                "params": {"eps_km": eps_km, "min_samples": min_samples},
            }

        # Prepare coordinate matrix
        coords = np.array([[e.latitude, e.longitude] for e in emergencies])
        types = [e.emergency_type for e in emergencies]
        severities = [e.predicted_severity or "medium" for e in emergencies]
        people = [e.people_affected or 1 for e in emergencies]

        # Convert eps from km to radians for haversine
        eps_rad = eps_km / 6371.0  # Earth radius in km

        # DBSCAN with haversine metric
        coords_rad = np.radians(coords)
        db_model = DBSCAN(
            eps=eps_rad,
            min_samples=min_samples,
            metric="haversine",
            algorithm="ball_tree",
        )
        labels = db_model.fit_predict(coords_rad)

        # Build cluster summaries
        clusters = []
        unique_labels = set(labels)
        unique_labels.discard(-1)  # Remove noise label

        severity_risk = {"low": 1, "medium": 2, "high": 3, "critical": 4}

        for label_id in sorted(unique_labels):
            mask = labels == label_id
            cluster_coords = coords[mask]
            cluster_types = [t for t, m in zip(types, mask) if m]
            cluster_severities = [s for s, m in zip(severities, mask) if m]
            cluster_people = [p for p, m in zip(people, mask) if m]

            center_lat = float(np.mean(cluster_coords[:, 0]))
            center_lon = float(np.mean(cluster_coords[:, 1]))
            count = int(mask.sum())

            # Dominant type
            type_counts = Counter(cluster_types)
            dominant_type, dominant_count = type_counts.most_common(1)[0]

            # Average severity score
            avg_severity_score = np.mean([severity_risk.get(s, 2) for s in cluster_severities])

            # Risk score (0-1) based on count, severity, and people affected
            risk_score = min(1.0, (
                (count / 50) * 0.4 +
                (avg_severity_score / 4.0) * 0.3 +
                (min(sum(cluster_people), 500) / 500) * 0.3
            ))

            # Radius in km (max distance from center)
            max_dist = 0.0
            for c in cluster_coords:
                d = math.sqrt((c[0] - center_lat) ** 2 + (c[1] - center_lon) ** 2)
                max_dist = max(max_dist, d)
            radius_km = max_dist * 111.0  # Approximate degree to km

            clusters.append({
                "cluster_id": int(label_id),
                "center_lat": round(center_lat, 6),
                "center_lon": round(center_lon, 6),
                "incident_count": count,
                "radius_km": round(radius_km, 3),
                "dominant_type": dominant_type,
                "dominant_type_count": dominant_count,
                "type_distribution": dict(type_counts),
                "avg_severity_score": round(float(avg_severity_score), 2),
                "risk_score": round(risk_score, 3),
                "risk_level": "CRITICAL" if risk_score > 0.7 else "HIGH" if risk_score > 0.4 else "MEDIUM",
                "total_people_affected": sum(cluster_people),
            })

        # Sort by risk score descending
        clusters.sort(key=lambda c: c["risk_score"], reverse=True)
        noise_count = int(np.sum(labels == -1))

        return {
            "clusters": clusters,
            "total_incidents": len(emergencies),
            "clustered_incidents": len(emergencies) - noise_count,
            "noise_count": noise_count,
            "num_clusters": len(clusters),
            "algorithm": "dbscan",
            "params": {"eps_km": eps_km, "min_samples": min_samples, "hours": hours},
            "generated_at": datetime.utcnow().isoformat(),
        }

    async def zone_risk_analysis(
        self,
        db: AsyncSession,
        n_clusters: int = 8,
        hours: int = 720,
    ) -> Dict[str, Any]:
        """
        K-Means clustering for zone-level risk aggregation.
        Useful for resource positioning optimization.
        """
        since = datetime.utcnow() - timedelta(hours=hours)
        result = await db.execute(
            select(Emergency).where(Emergency.reported_at >= since)
        )
        emergencies = result.scalars().all()

        if len(emergencies) < n_clusters:
            return {"zones": [], "total_incidents": len(emergencies)}

        coords = np.array([[e.latitude, e.longitude] for e in emergencies])

        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = kmeans.fit_predict(coords)

        zones = []
        for i, center in enumerate(kmeans.cluster_centers_):
            mask = labels == i
            count = int(mask.sum())
            zones.append({
                "zone_cluster_id": i,
                "center_lat": round(float(center[0]), 6),
                "center_lon": round(float(center[1]), 6),
                "incident_count": count,
                "recommended_resources": max(1, count // 50),
            })

        zones.sort(key=lambda z: z["incident_count"], reverse=True)

        return {
            "zones": zones,
            "total_incidents": len(emergencies),
            "n_clusters": n_clusters,
            "algorithm": "kmeans",
            "generated_at": datetime.utcnow().isoformat(),
        }


hotspot_service = HotspotService()
