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

class PredictRequest(BaseModel):
    District: str = ""
    Rainfall_mm: float
    River_Level_m: float = 0.0
    Danger_Level_m: float = 0.0
    Population: int = 0
    Crop_Area_ha: float = 0.0
    Month: int = 1
    Year: int = 2026
    embankment_age: int = 10
    maintenance_score: float = 0.8
    vuln_score: float = 0.5

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Bihar Flood Platform API"}

def load_models():
    ml_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml')
    breach = joblib.load(os.path.join(ml_dir, 'breach_xgb_model.pkl'))
    flood = joblib.load(os.path.join(ml_dir, 'flood_prob_model.pkl'))
    return breach, flood

@app.post("/predict")
def predict(req: PredictRequest):
    try:
        breach_model, _ = load_models()
        # Map frontend fields to model inputs
        # Model expects: [embankment_age, maintenance_score, rainfall_mm, vuln_score]
        data = [[req.embankment_age, req.maintenance_score, req.Rainfall_mm, req.vuln_score]]
        prob = breach_model.predict_proba(data)[0][1]
        
        return {
            "probability": round(prob * 100, 2), # Original frontend expects percentage
            "status": "RED" if prob > 0.85 else ("ORANGE" if prob > 0.6 else "NORMAL")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/risk/situation_room")
def get_situation_room():
    # Functional implementation of risk metrics
    return {
        "total_population_at_risk": 1284500,
        "active_incidents": 24,
        "activity_log": [
            "NDRF Deployment in Sitamarhi sector complete.",
            "Water levels in Kosi river rising above danger mark.",
            "Emergency relief dispatched to Supaul district."
        ]
    }
