import random
from typing import List, Dict

class RiskService:
    def __init__(self):
        # Districts in Bihar with mock population data
        self.districts = [
            {"name": "Patna", "population": 5838465, "vulnerability": 0.1},
            {"name": "Gaya", "population": 4391035, "vulnerability": 0.3},
            {"name": "Muzaffarpur", "population": 4801062, "vulnerability": 0.6},
            {"name": "Supaul", "population": 2229076, "vulnerability": 0.9},
            {"name": "Darbhanga", "population": 3937385, "vulnerability": 0.8},
            {"name": "Begusarai", "population": 2970541, "vulnerability": 0.4},
        ]

    def get_situation_room_feed(self) -> Dict:
        # Simulate real-time tracking
        total_at_risk = sum([d["population"] * (d["vulnerability"] * random.uniform(0.05, 0.15)) for d in self.districts])
        active_incidents = random.randint(5, 25)
        
        activity_log = [
            f"Alert: High precipitation detected in {random.choice(self.districts)['name']}",
            f"Dispatch: 3 Response Units deployed to Gandak Basin",
            f"Update: Embankment maintenance completed in Supaul",
            f"Sensor: Water level rising at 0.5m/hr in Kosi river"
        ]
        
        return {
            "total_population_at_risk": int(total_at_risk),
            "active_incidents": active_incidents,
            "activity_log": activity_log[:3], # Show latest 3
            "timestamp": "Real-time Feed Active"
        }

    def get_district_pulse(self) -> List[Dict]:
        return [
            {
                "district": d["name"],
                "risk_score": round(d["vulnerability"] * 100, 1),
                "trend": [random.randint(10, 100) for _ in range(24)] # Last 24 hours
            }
            for d in self.districts
        ]

risk_service = RiskService()
