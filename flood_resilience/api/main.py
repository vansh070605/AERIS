from fastapi import FastAPI, HTTPException
import joblib
import os
import numpy as np
import pandas as pd
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Bihar Flood Resilience API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev purposes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BreachRequest(BaseModel):
    embankment_age: int
    maintenance_score: float
    rainfall_mm: float
    vuln_score: float

class ForecastRequest(BaseModel):
    rainfall_mm: float
    vuln_score: float

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Bihar Flood Platform API"}

def load_models():
    ml_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml')
    breach = joblib.load(os.path.join(ml_dir, 'breach_xgb_model.pkl'))
    flood = joblib.load(os.path.join(ml_dir, 'flood_prob_model.pkl'))
    return breach, flood

@app.post("/predict/breach")
def predict_breach(req: BreachRequest):
    try:
        breach_model, _ = load_models()
        data = [[req.embankment_age, req.maintenance_score, req.rainfall_mm, req.vuln_score]]
        prob = breach_model.predict_proba(data)[0][1]
        
        status = "NORMAL"
        if prob > 0.85:
            status = "RED"
        elif prob > 0.60:
            status = "ORANGE"
        elif prob > 0.30:
            status = "YELLOW"
            
        return {"probability": round(prob, 3), "alert_level": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/7day_forecast")
def predict_7day_forecast(req: ForecastRequest):
    # Simulates a daily timeseries for the next 7 days based on the base probability
    try:
        _, flood_model = load_models()
        data = [[req.rainfall_mm, req.vuln_score]]
        base_prob = flood_model.predict_proba(data)[0][1]
        
        # Add random walk to curve for simulated realistic forecast
        np.random.seed(int(req.rainfall_mm))
        trend = np.cumsum(np.random.normal(0, 0.05, 7))
        daily_probs = base_prob + trend
        daily_probs = np.clip(daily_probs, 0.01, 0.99)
        
        return {
            "7_day_probs": [round(p, 3) for p in daily_probs],
            "max_alert_level": "RED" if max(daily_probs) > 0.85 else ("ORANGE" if max(daily_probs) > 0.6 else ("YELLOW" if max(daily_probs) > 0.3 else "NORMAL"))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
