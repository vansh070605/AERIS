import joblib
import os
import numpy as np
from typing import Tuple, List

class MLService:
    def __init__(self):
        self.ml_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'ml')
        self.breach_model = None
        self.flood_model = None

    def _load_models(self):
        if self.breach_model is None:
            self.breach_model = joblib.load(os.path.join(self.ml_dir, 'breach_xgb_model.pkl'))
        if self.flood_model is None:
            self.flood_model = joblib.load(os.path.join(self.ml_dir, 'flood_prob_model.pkl'))

    def predict_breach(self, embankment_age: int, maintenance_score: float, rainfall_mm: float, vuln_score: float) -> dict:
        self._load_models()
        data = [[embankment_age, maintenance_score, rainfall_mm, vuln_score]]
        prob = self.breach_model.predict_proba(data)[0][1]
        
        status = "NORMAL"
        if prob > 0.85:
            status = "RED"
        elif prob > 0.60:
            status = "ORANGE"
        elif prob > 0.30:
            status = "YELLOW"
            
        return {"probability": float(round(prob, 3)), "alert_level": status}

    def predict_7day_forecast(self, rainfall_mm: float, vuln_score: float) -> dict:
        self._load_models()
        data = [[rainfall_mm, vuln_score]]
        base_prob = self.flood_model.predict_proba(data)[0][1]
        
        np.random.seed(int(rainfall_mm))
        trend = np.cumsum(np.random.normal(0, 0.05, 7))
        daily_probs = base_prob + trend
        daily_probs = np.clip(daily_probs, 0.01, 0.99)
        
        max_prob = max(daily_probs)
        status = "NORMAL"
        if max_prob > 0.85:
            status = "RED"
        elif max_prob > 0.60:
            status = "ORANGE"
        elif max_prob > 0.30:
            status = "YELLOW"

        return {
            "7_day_probs": [float(round(p, 3)) for p in daily_probs],
            "max_alert_level": status
        }

ml_service = MLService()
