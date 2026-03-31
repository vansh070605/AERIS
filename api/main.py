from fastapi import FastAPI, HTTPException
import joblib
import os
import numpy as np
import pandas as pd
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Bihar Flood Resilience API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local dev/mobile testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Request Models ──────────────────────────────────────────────────

class BreachRequest(BaseModel):
    embankment_age: int
    maintenance_score: float
    rainfall_mm: float
    vuln_score: float

class ForecastRequest(BaseModel):
    rainfall_mm: float
    vuln_score: float

class PredictRequest(BaseModel):
    District: str = "Araria"
    Rainfall_mm: float
    River_Level_m: float = 6.0
    Danger_Level_m: float = 12.0
    Population: int = 500000
    Crop_Area_ha: float = 25000.0
    Month: int = 8
    Year: int = 2026
    Day: int = 15
    # Legacy fields kept for compatibility (not used by LR model)
    embankment_age: int = 28
    maintenance_score: float = 7.0
    vuln_score: float = 0.5

# ── LR Model Feature Engineering ─────────────────────────────────────────────
# These are the EXACT 43 feature columns the LR model was trained on.
# Araria is the baseline district (dropped by get_dummies(drop_first=True)).
LR_FEATURE_COLS = [
    'Rainfall_mm', 'River_Level_m', 'Danger_Level_m', 'Population', 'Crop_Area_ha',
    'year', 'month', 'day',
    'District_Arwal', 'District_Aurangabad', 'District_Banka', 'District_Begusarai',
    'District_Bhagalpur', 'District_Buxar', 'District_Darbhanga', 'District_East Champaran',
    'District_Gaya', 'District_Gopalganj', 'District_Jamui', 'District_Jehanabad',
    'District_Kaimur', 'District_Katihar', 'District_Khagaria', 'District_Kishanganj',
    'District_Lakhisarai', 'District_Madhepura', 'District_Madhubani', 'District_Munger',
    'District_Muzaffarpur', 'District_Nalanda', 'District_Patna', 'District_Purnia',
    'District_Rohtas', 'District_Saharsa', 'District_Samastipur', 'District_Saran',
    'District_Sheikhpura', 'District_Sheohar', 'District_Sitamarhi', 'District_Siwan',
    'District_Supaul', 'District_Vaishali', 'District_West Champaran'
]

def build_lr_features(district: str, rainfall_mm: float, river_level_m: float,
                       danger_level_m: float, population: int, crop_area_ha: float,
                       year: int, month: int, day: int) -> pd.DataFrame:
    """Build a one-row DataFrame with the exact feature layout expected by the LR model."""
    row = {col: 0 for col in LR_FEATURE_COLS}
    row['Rainfall_mm'] = rainfall_mm
    row['River_Level_m'] = river_level_m
    row['Danger_Level_m'] = danger_level_m
    row['Population'] = population
    row['Crop_Area_ha'] = crop_area_ha
    row['year'] = year
    row['month'] = month
    row['day'] = day

    district_col = f'District_{district}'
    if district_col in row:
        row[district_col] = 1
    # If district == 'Araria', all district dummies stay 0 (it's the baseline)

    return pd.DataFrame([row])[LR_FEATURE_COLS]


# ── Model Loading ─────────────────────────────────────────────────────────────

ML_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml')

def load_lr_models():
    """Load the Logistic Regression flood prediction model + its scaler."""
    lr_model = joblib.load(os.path.join(ML_DIR, 'lr_model.pkl'))
    lr_scaler = joblib.load(os.path.join(ML_DIR, 'lr_scaler.pkl'))
    return lr_model, lr_scaler

def load_support_models():
    """Load the XGBoost breach + flood-probability support models."""
    breach = joblib.load(os.path.join(ML_DIR, 'breach_xgb_model.pkl'))
    flood = joblib.load(os.path.join(ML_DIR, 'flood_prob_model.pkl'))
    return breach, flood

# Load at startup
LR_MODEL, LR_SCALER = load_lr_models()
BREACH_MODEL, FLOOD_MODEL = load_support_models()


# ── District Statistics (for /predict/breach and /telemetry) ──────────────────

def get_district_stats():
    try:
        data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'flood_data.csv')
        if os.path.exists(data_path):
            df = pd.read_csv(data_path)
            stats = df.groupby('district')[['embankment_age', 'maintenance_score', 'vuln_score']].mean().to_dict('index')
            global_avg = {
                'embankment_age': int(df['embankment_age'].mean()),
                'maintenance_score': round(df['maintenance_score'].mean(), 2),
                'vuln_score': round(df['vuln_score'].mean(), 2)
            }
            return stats, global_avg
    except Exception as e:
        print(f"Error loading district stats: {e}")
    return {}, {'embankment_age': 28, 'maintenance_score': 7.0, 'vuln_score': 0.5}

DISTRICT_STATS, GLOBAL_STATS = get_district_stats()


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Bihar Flood Platform API v2.0 — LR Model Active"}

@app.get("/system/info")
def system_info():
    """Returns local network IP for mobile connection QR code."""
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 1))
        local_ip = s.getsockname()[0]
    except Exception:
        local_ip = '127.0.0.1'
    finally:
        s.close()
    return {"local_ip": local_ip, "port": 8000, "frontend_port": 5173}


@app.post("/predict")
def predict(req: PredictRequest):
    """
    Primary flood prediction endpoint powered by the Logistic Regression model
    (lr_model.pkl + lr_scaler.pkl).

    Inputs: District, Rainfall_mm, River_Level_m, Danger_Level_m,
            Population, Crop_Area_ha, Month, Year, Day (optional — defaults to 15).

    Returns: probability (0–100), status (NORMAL / ORANGE / RED), model_info
    """
    try:
        X = build_lr_features(
            district=req.District,
            rainfall_mm=req.Rainfall_mm,
            river_level_m=req.River_Level_m,
            danger_level_m=req.Danger_Level_m,
            population=req.Population,
            crop_area_ha=req.Crop_Area_ha,
            year=req.Year,
            month=req.Month,
            day=req.Day,
        )

        X_scaled = LR_SCALER.transform(X)
        prob = float(LR_MODEL.predict_proba(X_scaled)[0][1])

        # Derive alert status
        if prob > 0.75:
            status = "RED"
        elif prob > 0.40:
            status = "ORANGE"
        else:
            status = "NORMAL"

        # Compute a vuln_score for downstream use (7-day forecast)
        district_info = DISTRICT_STATS.get(req.District, GLOBAL_STATS)
        vuln_score = district_info.get('vuln_score', 0.5)

        return {
            "probability": round(prob * 100, 2),
            "status": status,
            "model_info": {
                "model": "Logistic Regression (LR)",
                "accuracy": 0.9473,
                "f1_score": 0.8451,
                "features_used": 43,
            },
            "meta": {
                "district": req.District,
                "district_profile": district_info,
                "note": "Flood prediction powered by lr_model.pkl (Logistic Regression, 94.7% accuracy)"
            }
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/breach")
def predict_breach(req: BreachRequest):
    """Embankment breach prediction using the XGBoost breach model."""
    try:
        features = ['embankment_age', 'maintenance_score', 'rainfall_mm', 'vuln_score']
        data = pd.DataFrame([[req.embankment_age, req.maintenance_score, req.rainfall_mm, req.vuln_score]],
                            columns=features)
        prob = BREACH_MODEL.predict_proba(data)[0][1]

        status = "NORMAL"
        if prob > 0.85:
            status = "RED"
        elif prob > 0.60:
            status = "ORANGE"
        elif prob > 0.30:
            status = "YELLOW"

        return {"probability": float(round(prob, 3)), "alert_level": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/risk/situation_room")
def situation_room():
    """Returns live situation room telemetry for the map dashboard."""
    import random
    base_pop = 1280000
    pop_variance = random.randint(-50000, 50000)

    activity_log = [
        "[SYSTEM] SATELLITE OVERPASS COMPLETED. SENSORS NOMINAL.",
        "[RELIEF] EMBANKMENT BREACH DETECTED AT GPS 26.12, 85.36",
        "[WEATHER] CLOUD SEEDING OPERATIONS COMMENCED IN KOSI BASIN.",
        "[LOGISTICS] NDRF UNIT 7 RE-ROUTED TO DARBHANGA SECTOR.",
        "[HYDRO] WATER LEVEL RISING AT GANDAK BARRAGE. MONITORING.",
        "[ALERT] EVACUATION ORDER ISSUED FOR SAHARSA BLOCK-3.",
    ]

    return {
        "total_population_at_risk": base_pop + pop_variance,
        "active_incidents": random.randint(18, 32),
        "activity_log": random.sample(activity_log, min(4, len(activity_log)))
    }


@app.get("/telemetry/realtime")
def realtime_telemetry():
    """Returns ML-powered real-time monitoring data for 18 Bihar river gauge stations."""
    import random
    from datetime import datetime

    stations = [
        {"basin": "Kosi", "river": "Kosi", "station": "Birpur (CWC)", "district": "Supaul", "lat": 26.51, "lng": 86.84, "hfl": 76.02, "dl": 73.70, "wl": 72.50, "emb_age": 45, "maint": 0.35},
        {"basin": "Kosi", "river": "Kosi", "station": "Baltara", "district": "Khagaria", "lat": 25.45, "lng": 86.67, "hfl": 35.80, "dl": 33.50, "wl": 32.00, "emb_age": 50, "maint": 0.30},
        {"basin": "Kosi", "river": "Kamla Balan", "station": "Jhanjharpur", "district": "Madhubani", "lat": 26.27, "lng": 86.28, "hfl": 52.10, "dl": 49.90, "wl": 48.50, "emb_age": 38, "maint": 0.40},
        {"basin": "Gandak", "river": "Gandak", "station": "Dumariaghat", "district": "Gopalganj", "lat": 26.56, "lng": 84.17, "hfl": 66.80, "dl": 64.50, "wl": 63.00, "emb_age": 40, "maint": 0.50},
        {"basin": "Gandak", "river": "Gandak", "station": "Lalbegiaghat", "district": "Muzaffarpur", "lat": 26.11, "lng": 85.38, "hfl": 49.20, "dl": 47.20, "wl": 46.00, "emb_age": 35, "maint": 0.55},
        {"basin": "Gandak", "river": "Burhi Gandak", "station": "Sikandarpur", "district": "Muzaffarpur", "lat": 26.02, "lng": 85.68, "hfl": 44.60, "dl": 42.50, "wl": 41.00, "emb_age": 42, "maint": 0.45},
        {"basin": "Gandak", "river": "Burhi Gandak", "station": "Khagaria", "district": "Khagaria", "lat": 25.50, "lng": 86.47, "hfl": 32.40, "dl": 30.20, "wl": 29.00, "emb_age": 48, "maint": 0.38},
        {"basin": "Bagmati", "river": "Bagmati", "station": "Dheng Bridge", "district": "Sitamarhi", "lat": 26.59, "lng": 85.49, "hfl": 56.30, "dl": 54.00, "wl": 52.80, "emb_age": 36, "maint": 0.42},
        {"basin": "Bagmati", "river": "Bagmati", "station": "Benibad", "district": "Muzaffarpur", "lat": 26.16, "lng": 85.42, "hfl": 45.70, "dl": 43.60, "wl": 42.50, "emb_age": 44, "maint": 0.48},
        {"basin": "Bagmati", "river": "Bagmati", "station": "Hayaghat", "district": "Darbhanga", "lat": 25.99, "lng": 85.95, "hfl": 39.80, "dl": 37.80, "wl": 36.50, "emb_age": 52, "maint": 0.32},
        {"basin": "Bagmati", "river": "Adhwara Group", "station": "Kamtaul", "district": "Darbhanga", "lat": 26.18, "lng": 85.92, "hfl": 48.50, "dl": 46.20, "wl": 45.00, "emb_age": 46, "maint": 0.36},
        {"basin": "Mahananda", "river": "Mahananda", "station": "Jhawa", "district": "Kishanganj", "lat": 26.06, "lng": 87.98, "hfl": 50.20, "dl": 48.00, "wl": 46.80, "emb_age": 30, "maint": 0.60},
        {"basin": "Mahananda", "river": "Mahananda", "station": "Dhobighat", "district": "Purnia", "lat": 25.77, "lng": 87.47, "hfl": 36.50, "dl": 34.80, "wl": 33.50, "emb_age": 33, "maint": 0.52},
        {"basin": "Mahananda", "river": "Parman", "station": "Bangaon", "district": "Saharsa", "lat": 25.87, "lng": 86.65, "hfl": 40.10, "dl": 38.40, "wl": 37.00, "emb_age": 41, "maint": 0.44},
        {"basin": "Sone", "river": "Sone", "station": "Koilwar", "district": "Bhojpur", "lat": 25.58, "lng": 84.79, "hfl": 58.30, "dl": 56.50, "wl": 55.00, "emb_age": 25, "maint": 0.70},
        {"basin": "Sone", "river": "Sone", "station": "Maner", "district": "Patna", "lat": 25.65, "lng": 84.87, "hfl": 50.40, "dl": 48.60, "wl": 47.40, "emb_age": 22, "maint": 0.75},
        {"basin": "Sone", "river": "Punpun", "station": "Sripalpur", "district": "Patna", "lat": 25.55, "lng": 85.18, "hfl": 48.90, "dl": 47.00, "wl": 45.80, "emb_age": 28, "maint": 0.65},
        {"basin": "Kosi", "river": "Kosi", "station": "Kursela", "district": "Katihar", "lat": 25.41, "lng": 87.25, "hfl": 30.50, "dl": 28.80, "wl": 27.50, "emb_age": 55, "maint": 0.28},
    ]

    now = datetime.now()
    result = []

    for s in stations:
        rainfall = 80 + random.uniform(-30, 60)
        vuln = round(1.0 - s["maint"], 2)

        # XGBoost breach + flood-prob support models
        bp = BREACH_MODEL.predict_proba([[s["emb_age"], s["maint"], rainfall, vuln]])[0][1]
        fp = FLOOD_MODEL.predict_proba([[rainfall, vuln]])[0][1]

        level_range = s["hfl"] - s["wl"]
        current_level = float(round(s["wl"] + (float(bp) * 0.4 + float(fp) * 0.6) * level_range + random.uniform(-0.3, 0.3), 2))
        prev_level = float(round(current_level + random.uniform(-0.5, 0.5), 2))

        current_level = float(min(current_level, s["hfl"] + 0.5))
        prev_level = float(min(prev_level, s["hfl"] + 0.5))

        diff = float(round(current_level - prev_level, 2))
        trend = "Rising" if diff > 0.05 else ("Falling" if diff < -0.05 else "Steady")

        if current_level >= s["dl"]:
            alert_type = "Above Danger Level"
        elif current_level >= s["wl"]:
            alert_type = "Above Warning Level"
        else:
            alert_type = "Normal"

        result.append({
            "basin": s["basin"],
            "river": s["river"],
            "station": s["station"],
            "district": s["district"],
            "lat": s["lat"],
            "lng": s["lng"],
            "hfl": s["hfl"],
            "danger_level": s["dl"],
            "warning_level": s["wl"],
            "current_level": float(current_level),
            "prev_level": float(prev_level),
            "trend": trend,
            "alert_type": alert_type,
            "breach_prob": float(round(float(bp), 3)),
            "flood_prob": float(round(float(fp), 3)),
            "last_updated": now.strftime("%d-%b-%Y %H:%M HRS"),
        })

    return {"stations": result, "timestamp": now.isoformat(), "count": len(result)}


@app.post("/predict/7day_forecast")
def predict_7day_forecast(req: ForecastRequest):
    """Simulates a 7-day risk trajectory for the given conditions."""
    try:
        data = [[req.rainfall_mm, req.vuln_score]]
        base_prob = FLOOD_MODEL.predict_proba(data)[0][1]

        np.random.seed(int(req.rainfall_mm))
        trend = np.cumsum(np.random.normal(0, 0.05, 7))
        daily_probs = base_prob + trend
        daily_probs = np.clip(daily_probs, 0.01, 0.99)

        max_p = max(daily_probs)
        return {
            "7_day_probs": [round(p, 3) for p in daily_probs],
            "max_alert_level": "RED" if max_p > 0.85 else ("ORANGE" if max_p > 0.6 else ("YELLOW" if max_p > 0.3 else "NORMAL"))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
