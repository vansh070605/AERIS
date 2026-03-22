"""
Flood ML Prediction Engine — Urban Flood Disaster Response
Trains and serves flood severity classifiers + water level regressors.
Features calibrated to Chennai monsoon patterns and 2015 flood data.
"""

import numpy as np
import pandas as pd
import joblib
import shap
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report
from xgboost import XGBClassifier, XGBRegressor

logger = logging.getLogger(__name__)

SEVERITY_CLASSES = ["low", "moderate", "severe", "catastrophic"]
MODEL_PATH = Path("app/ml/models")
MODEL_PATH.mkdir(parents=True, exist_ok=True)

FLOOD_TYPE_MAP = {
    "pluvial": 0, "riverine": 1, "coastal": 2, "storm_surge": 3
}
DRAINAGE_STATUS_MAP = {
    "functional": 0, "partial": 1, "overwhelmed": 2, "collapsed": 3
}

FEATURE_NAMES = [
    "rainfall_intensity_mmph",
    "cumulative_rainfall_24h_mm",
    "elevation_m",
    "drainage_capacity_ratio",
    "soil_saturation_index",
    "proximity_to_waterbody_km",
    "population_density_k",
    "hour_of_day",
    "month",
    "historical_flood_freq",
    "current_water_level_m",
    "rate_of_rise_m_per_hr",
    "flood_type_encoded",
    "drainage_status_encoded",
]


def generate_flood_training_data(n_samples: int = 8000) -> pd.DataFrame:
    """
    Generate synthetic flood training data calibrated to Chennai monsoon patterns.
    Based on 2015 Chennai flood characteristics:
    - Extreme rainfall: 300-500 mm in 24h
    - Low-lying areas (Velachery, Tambaram): elevation 2-5m
    - Coastal zones: tidal surge adds 0.5-2m
    - Drainage capacity overwhelmed above ~100 mm/hr
    """
    np.random.seed(42)
    n = n_samples

    # --- Features ---
    # Monsoon rainfall (Oct-Dec): 5-120 mm/hr, rare extreme: 120-200
    rainfall = np.concatenate([
        np.random.exponential(25, int(n * 0.7)),  # normal monsoon
        np.random.uniform(80, 200, int(n * 0.3)),  # extreme events
    ])[:n]
    rainfall = np.clip(rainfall, 0, 250)

    # Cumulative 24h rainfall (correlated with intensity)
    cum_rainfall = rainfall * np.random.uniform(4, 12, n)
    cum_rainfall = np.clip(cum_rainfall, 0, 600)

    # Elevation (Chennai: 2-15m, low-lying zones 2-5m)
    elevation = np.random.choice(
        [3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 12.0, 15.0],
        n, p=[0.15, 0.15, 0.15, 0.15, 0.12, 0.12, 0.1, 0.06]
    ) + np.random.normal(0, 1, n)
    elevation = np.clip(elevation, 1, 20)

    # Drainage capacity ratio (0 = fully overwhelmed, 1 = plenty of capacity)
    drainage_ratio = 1.0 - np.clip(rainfall / 120.0, 0, 1) + np.random.normal(0, 0.1, n)
    drainage_ratio = np.clip(drainage_ratio, 0, 1)

    # Soil saturation (higher in monsoon months)
    soil_sat = np.random.uniform(0.3, 1.0, n)

    # Proximity to waterbody (river/coast)
    prox_water = np.random.exponential(3, n)
    prox_water = np.clip(prox_water, 0.1, 20)

    # Population density (thousands per km²)
    pop_density = np.random.choice(
        [8.0, 15.0, 22.0, 30.0, 40.0],
        n, p=[0.1, 0.2, 0.3, 0.25, 0.15]
    ) + np.random.normal(0, 3, n)
    pop_density = np.clip(pop_density, 2, 60)

    # Temporal
    hours = np.random.randint(0, 24, n)
    months = np.random.choice([10, 11, 12, 1, 7, 8, 9], n, p=[0.25, 0.3, 0.2, 0.05, 0.05, 0.1, 0.05])

    # Historical flood frequency (events/decade)
    hist_freq = np.random.choice([1, 2, 3, 4, 6, 8], n, p=[0.1, 0.2, 0.25, 0.2, 0.15, 0.1])

    # Current water level (m above ground)
    water_level = np.clip(
        (rainfall / 50.0) * (1 - drainage_ratio) * (10 / elevation) + np.random.normal(0, 0.2, n),
        0, 5
    )

    # Rate of rise
    rate_rise = np.clip(rainfall / 100 - drainage_ratio * 0.3 + np.random.normal(0, 0.1, n), -0.5, 2.0)

    flood_type = np.random.choice(list(FLOOD_TYPE_MAP.keys()), n, p=[0.45, 0.25, 0.2, 0.1])
    flood_type_enc = np.array([FLOOD_TYPE_MAP[t] for t in flood_type])

    drainage_status = np.where(
        drainage_ratio > 0.6, "functional",
        np.where(drainage_ratio > 0.3, "partial",
                 np.where(drainage_ratio > 0.1, "overwhelmed", "collapsed"))
    )
    drainage_enc = np.array([DRAINAGE_STATUS_MAP[d] for d in drainage_status])

    # --- Severity labels ---
    # Composite flood severity score
    scores = (
        rainfall / 200.0 * 3.0 +                           # rainfall intensity
        cum_rainfall / 600.0 * 2.0 +                       # cumulative rainfall
        (1 - elevation / 20.0) * 2.5 +                     # inverse elevation
        (1 - drainage_ratio) * 2.0 +                       # drainage failure
        soil_sat * 1.0 +                                   # saturation
        (1 / np.clip(prox_water, 0.5, 20)) * 1.5 +        # proximity to water
        water_level * 1.5 +                                 # current water
        np.where(months.astype(int) == 11, 1.0, 0.0) +    # November peak
        hist_freq / 8.0 * 1.0 +                            # historical risk
        np.random.normal(0, 0.5, n)                         # noise
    )

    labels = pd.cut(
        scores,
        bins=[-np.inf, 5, 8, 11, np.inf],
        labels=SEVERITY_CLASSES
    )

    # --- Water level targets (for regressor) ---
    water_1h = water_level + rate_rise * 1.0 + np.random.normal(0, 0.1, n)
    water_6h = water_level + rate_rise * 4.0 + np.random.normal(0, 0.3, n)  # deceleration
    water_1h = np.clip(water_1h, 0, 6)
    water_6h = np.clip(water_6h, 0, 8)

    return pd.DataFrame({
        "rainfall_intensity_mmph": rainfall,
        "cumulative_rainfall_24h_mm": cum_rainfall,
        "elevation_m": elevation,
        "drainage_capacity_ratio": drainage_ratio,
        "soil_saturation_index": soil_sat,
        "proximity_to_waterbody_km": prox_water,
        "population_density_k": pop_density,
        "hour_of_day": hours,
        "month": months,
        "historical_flood_freq": hist_freq.astype(float),
        "current_water_level_m": water_level,
        "rate_of_rise_m_per_hr": rate_rise,
        "flood_type_encoded": flood_type_enc,
        "drainage_status_encoded": drainage_enc,
        "severity": labels,
        "water_level_1h": water_1h,
        "water_level_6h": water_6h,
    })


def train_flood_models() -> None:
    """Train flood severity classifier + water level regressors."""
    logger.info("Generating flood training data (Chennai monsoon calibration)...")
    df = generate_flood_training_data(8000)
    df = df.dropna()

    X = df[FEATURE_NAMES]
    y_sev = df["severity"]
    y_wl1 = df["water_level_1h"]
    y_wl6 = df["water_level_6h"]

    le = LabelEncoder()
    y_sev_enc = le.fit_transform(y_sev)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_sev_enc, test_size=0.2, random_state=42, stratify=y_sev_enc
    )

    # --- Severity classifier ---
    logger.info("Training XGBoost flood severity classifier...")
    clf = XGBClassifier(
        n_estimators=250,
        max_depth=7,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        use_label_encoder=False,
        eval_metric="mlogloss",
        random_state=42,
    )
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    report = classification_report(y_test, y_pred, target_names=SEVERITY_CLASSES)
    logger.info(f"Flood Severity Report:\n{report}")

    # --- Water level regressors ---
    _, X_test_r, _, y_test_wl1 = train_test_split(X, y_wl1, test_size=0.2, random_state=42)
    _, _, _, y_test_wl6 = train_test_split(X, y_wl6, test_size=0.2, random_state=42)

    logger.info("Training water level 1h regressor...")
    reg_1h = XGBRegressor(n_estimators=200, max_depth=6, learning_rate=0.1, random_state=42)
    reg_1h.fit(X_train, y_wl1.iloc[X_train.index] if hasattr(X_train, 'index') else y_wl1[:len(X_train)])

    logger.info("Training water level 6h regressor...")
    reg_6h = XGBRegressor(n_estimators=200, max_depth=6, learning_rate=0.1, random_state=42)
    reg_6h.fit(X_train, y_wl6.iloc[X_train.index] if hasattr(X_train, 'index') else y_wl6[:len(X_train)])

    # Save all models
    joblib.dump(clf, MODEL_PATH / "flood_severity_model.pkl")
    joblib.dump(le, MODEL_PATH / "flood_label_encoder.pkl")
    joblib.dump(FEATURE_NAMES, MODEL_PATH / "flood_feature_names.pkl")
    joblib.dump(reg_1h, MODEL_PATH / "water_level_1h_model.pkl")
    joblib.dump(reg_6h, MODEL_PATH / "water_level_6h_model.pkl")

    # SHAP explainer
    explainer = shap.TreeExplainer(clf)
    joblib.dump(explainer, MODEL_PATH / "flood_shap_explainer.pkl")

    logger.info(f"Flood models saved to {MODEL_PATH}")


class FloodMLService:
    """Flood severity prediction + water level forecasting with SHAP explanations."""

    _instance: Optional["FloodMLService"] = None
    _clf = None
    _reg_1h = None
    _reg_6h = None
    _label_encoder = None
    _feature_names = None
    _explainer = None

    @classmethod
    def get_instance(cls) -> "FloodMLService":
        if cls._instance is None:
            cls._instance = FloodMLService()
        return cls._instance

    def __init__(self):
        self._load_models()

    @property
    def is_trained(self) -> bool:
        return self._clf is not None

    def train_model(self):
        train_flood_models()
        self._load_models()

    def _load_models(self):
        try:
            if not (MODEL_PATH / "flood_severity_model.pkl").exists():
                logger.info("Flood models not found — training...")
                train_flood_models()

            self._clf = joblib.load(MODEL_PATH / "flood_severity_model.pkl")
            self._label_encoder = joblib.load(MODEL_PATH / "flood_label_encoder.pkl")
            self._feature_names = joblib.load(MODEL_PATH / "flood_feature_names.pkl")
            self._reg_1h = joblib.load(MODEL_PATH / "water_level_1h_model.pkl")
            self._reg_6h = joblib.load(MODEL_PATH / "water_level_6h_model.pkl")
            self._explainer = joblib.load(MODEL_PATH / "flood_shap_explainer.pkl")
            logger.info("Flood ML models loaded successfully")
        except Exception as e:
            logger.error(f"Error loading flood models: {e}")
            logger.info("Retraining flood models...")
            train_flood_models()
            self._clf = joblib.load(MODEL_PATH / "flood_severity_model.pkl")
            self._label_encoder = joblib.load(MODEL_PATH / "flood_label_encoder.pkl")
            self._feature_names = joblib.load(MODEL_PATH / "flood_feature_names.pkl")
            self._reg_1h = joblib.load(MODEL_PATH / "water_level_1h_model.pkl")
            self._reg_6h = joblib.load(MODEL_PATH / "water_level_6h_model.pkl")
            self._explainer = joblib.load(MODEL_PATH / "flood_shap_explainer.pkl")

    def _prepare_features(
        self,
        rainfall_intensity_mmph: float = 30.0,
        cumulative_rainfall_24h_mm: float = 200.0,
        elevation_m: float = 6.0,
        drainage_capacity_ratio: float = 0.5,
        soil_saturation_index: float = 0.6,
        proximity_to_waterbody_km: float = 3.0,
        population_density_k: float = 20.0,
        hour_of_day: int = 12,
        month: int = 11,
        historical_flood_freq: float = 3.0,
        current_water_level_m: float = 0.5,
        rate_of_rise_m_per_hr: float = 0.2,
        flood_type: str = "pluvial",
        drainage_status: str = "partial",
    ) -> np.ndarray:
        flood_type_enc = FLOOD_TYPE_MAP.get(flood_type, 0)
        drainage_enc = DRAINAGE_STATUS_MAP.get(drainage_status, 1)

        return np.array([[
            rainfall_intensity_mmph,
            cumulative_rainfall_24h_mm,
            elevation_m,
            drainage_capacity_ratio,
            soil_saturation_index,
            proximity_to_waterbody_km,
            population_density_k,
            hour_of_day,
            month,
            historical_flood_freq,
            current_water_level_m,
            rate_of_rise_m_per_hr,
            flood_type_enc,
            drainage_enc,
        ]])

    def predict(self, **kwargs) -> Dict[str, Any]:
        """
        Predict flood severity + water level forecasts with SHAP explanations.
        Returns severity, confidence, inundation risk, water level predictions, SHAP.
        """
        if self._clf is None:
            raise RuntimeError("Flood ML model not loaded")

        X = self._prepare_features(**kwargs)

        # Severity
        pred_enc = self._clf.predict(X)[0]
        probas = self._clf.predict_proba(X)[0]
        severity = self._label_encoder.inverse_transform([pred_enc])[0]
        confidence = float(probas[pred_enc])

        class_probs = {
            cls: round(float(p), 4)
            for cls, p in zip(self._label_encoder.classes_, probas)
        }

        # Inundation risk (weighted probability of severe + catastrophic)
        sev_idx = {cls: i for i, cls in enumerate(self._label_encoder.classes_)}
        inundation_risk = (
            probas[sev_idx.get("severe", 2)] * 0.6 +
            probas[sev_idx.get("catastrophic", 3)] * 1.0
        )

        # Water level forecasts
        wl_1h = float(np.clip(self._reg_1h.predict(X)[0], 0, 8))
        wl_6h = float(np.clip(self._reg_6h.predict(X)[0], 0, 10))

        # Risk hotspot score
        hotspot = min(1.0, inundation_risk * 0.6 + (kwargs.get("current_water_level_m", 0) / 3) * 0.4)

        # SHAP
        shap_vals = self._compute_shap(X, pred_enc)

        return {
            "severity": severity,
            "confidence": round(confidence, 4),
            "inundation_risk_score": round(float(inundation_risk), 4),
            "predicted_water_level_1h": round(wl_1h, 3),
            "predicted_water_level_6h": round(wl_6h, 3),
            "risk_hotspot_score": round(float(hotspot), 4),
            "class_probabilities": class_probs,
            "shap_values": shap_vals,
            "feature_importance": self._get_feature_importance(),
        }

    def _compute_shap(self, X: np.ndarray, class_idx: int) -> Dict[str, float]:
        try:
            shap_vals = self._explainer.shap_values(X)
            if isinstance(shap_vals, list):
                sv = shap_vals[class_idx][0]
            else:
                sv = shap_vals[0]
            return {
                feat: round(float(val), 4)
                for feat, val in zip(self._feature_names, sv)
            }
        except Exception as e:
            logger.warning(f"SHAP computation failed: {e}")
            return {}

    def _get_feature_importance(self) -> Dict[str, float]:
        try:
            importances = self._clf.feature_importances_
            return {
                feat: round(float(imp), 4)
                for feat, imp in zip(self._feature_names, importances)
            }
        except Exception:
            return {}

    def retrain(self) -> str:
        train_flood_models()
        self._load_models()
        return "Flood models retrained successfully"


# Global instance
ml_service = FloodMLService.get_instance()
