"""
ML Severity Prediction Engine
Trains and serves a Random Forest / XGBoost classifier for emergency severity prediction.
Returns severity class + confidence + SHAP values for explainability.
"""

import numpy as np
import pandas as pd
import joblib
import shap
import os
import logging
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report
from xgboost import XGBClassifier

logger = logging.getLogger(__name__)

SEVERITY_CLASSES = ["low", "medium", "high", "critical"]
MODEL_PATH = Path("app/ml/models")
MODEL_PATH.mkdir(parents=True, exist_ok=True)

EMERGENCY_TYPE_MAP = {
    "medical": 0, "fire": 1, "accident": 2, "flood": 3, "crime": 4, "other": 5
}

FEATURE_NAMES = [
    "emergency_type_encoded",
    "injury_level",
    "people_affected",
    "hazard_level",
    "hour_of_day",
    "day_of_week",
    "is_weekend",
]


def generate_training_data(n_samples: int = 5000) -> pd.DataFrame:
    """Generate synthetic training data for the severity classifier."""
    np.random.seed(42)
    n = n_samples

    emergency_types = np.random.choice(list(EMERGENCY_TYPE_MAP.keys()), n)
    injury_levels = np.random.randint(0, 11, n)
    people_affected = np.random.randint(1, 100, n)
    hazard_levels = np.random.randint(0, 11, n)
    hours = np.random.randint(0, 24, n)
    day_of_week = np.random.randint(0, 7, n)
    is_weekend = (day_of_week >= 5).astype(int)

    # Severity labels based on composite score
    type_weights = {
        "medical": 1.5, "fire": 2.0, "accident": 1.8,
        "flood": 1.6, "crime": 1.2, "other": 1.0
    }

    scores = []
    for i in range(n):
        w = type_weights[emergency_types[i]]
        score = (
            injury_levels[i] * 0.4 * w +
            min(people_affected[i] / 100, 1) * 10 * 0.3 +
            hazard_levels[i] * 0.3 * w +
            np.random.normal(0, 0.5)
        )
        scores.append(score)

    scores = np.array(scores)
    labels = pd.cut(
        scores,
        bins=[-np.inf, 3, 6, 9, np.inf],
        labels=SEVERITY_CLASSES
    )

    return pd.DataFrame({
        "emergency_type_encoded": [EMERGENCY_TYPE_MAP[t] for t in emergency_types],
        "injury_level": injury_levels,
        "people_affected": people_affected,
        "hazard_level": hazard_levels,
        "hour_of_day": hours,
        "day_of_week": day_of_week,
        "is_weekend": is_weekend,
        "severity": labels
    })


def train_model(use_xgboost: bool = True) -> None:
    """Train and save the severity prediction model."""
    logger.info("Generating training data...")
    df = generate_training_data(5000)
    df = df.dropna()

    X = df[FEATURE_NAMES]
    y = df["severity"]

    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )

    if use_xgboost:
        logger.info("Training XGBoost classifier...")
        model = XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            use_label_encoder=False,
            eval_metric="mlogloss",
            random_state=42,
        )
    else:
        logger.info("Training Random Forest classifier...")
        model = RandomForestClassifier(
            n_estimators=200, max_depth=8, random_state=42, n_jobs=-1
        )

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    report = classification_report(y_test, y_pred, target_names=SEVERITY_CLASSES)
    logger.info(f"Classification Report:\n{report}")

    # Save model and encoder
    joblib.dump(model, MODEL_PATH / "severity_model.pkl")
    joblib.dump(le, MODEL_PATH / "label_encoder.pkl")
    joblib.dump(FEATURE_NAMES, MODEL_PATH / "feature_names.pkl")

    # Create SHAP explainer
    if use_xgboost:
        explainer = shap.TreeExplainer(model)
    else:
        explainer = shap.TreeExplainer(model)

    joblib.dump(explainer, MODEL_PATH / "shap_explainer.pkl")

    logger.info(f"Model saved to {MODEL_PATH}")


class MLService:
    """Main ML service for severity prediction with SHAP explanations."""

    _instance: Optional["MLService"] = None
    _model = None
    _label_encoder = None
    _feature_names = None
    _explainer = None

    @classmethod
    def get_instance(cls) -> "MLService":
        if cls._instance is None:
            cls._instance = MLService()
        return cls._instance

    def __init__(self):
        self._load_models()

    @property
    def is_trained(self) -> bool:
        return self._model is not None

    def train_model(self):
        train_model()
        self._load_models()

    def _load_models(self):
        """Load pre-trained models from disk, train if not present."""
        try:
            if not (MODEL_PATH / "severity_model.pkl").exists():
                logger.info("Model not found — training new model...")
                train_model()

            self._model = joblib.load(MODEL_PATH / "severity_model.pkl")
            self._label_encoder = joblib.load(MODEL_PATH / "label_encoder.pkl")
            self._feature_names = joblib.load(MODEL_PATH / "feature_names.pkl")
            self._explainer = joblib.load(MODEL_PATH / "shap_explainer.pkl")
            logger.info("ML models loaded successfully")
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            logger.info("Retraining models...")
            train_model()
            self._model = joblib.load(MODEL_PATH / "severity_model.pkl")
            self._label_encoder = joblib.load(MODEL_PATH / "label_encoder.pkl")
            self._feature_names = joblib.load(MODEL_PATH / "feature_names.pkl")
            self._explainer = joblib.load(MODEL_PATH / "shap_explainer.pkl")

    def _prepare_features(
        self,
        emergency_type: str,
        injury_level: int,
        people_affected: int,
        hazard_level: int,
        hour_of_day: int = 12,
        day_of_week: int = 1,
    ) -> np.ndarray:
        """Prepare feature vector from input parameters."""
        type_encoded = EMERGENCY_TYPE_MAP.get(emergency_type, 5)
        is_weekend = 1 if day_of_week >= 5 else 0

        return np.array([[
            type_encoded,
            injury_level,
            people_affected,
            hazard_level,
            hour_of_day,
            day_of_week,
            is_weekend,
        ]])

    def predict(
        self,
        emergency_type: str,
        injury_level: int,
        people_affected: int,
        hazard_level: int,
        hour_of_day: int = 12,
        day_of_week: int = 1,
    ) -> Dict[str, Any]:
        """
        Predict emergency severity with confidence and SHAP explanation.
        Returns a dict with severity, confidence, class_probabilities, shap_values.
        """
        if self._model is None:
            raise RuntimeError("ML model not loaded")

        X = self._prepare_features(
            emergency_type, injury_level, people_affected,
            hazard_level, hour_of_day, day_of_week
        )

        # Prediction
        pred_encoded = self._model.predict(X)[0]
        probas = self._model.predict_proba(X)[0]
        severity = self._label_encoder.inverse_transform([pred_encoded])[0]
        confidence = float(probas[pred_encoded])

        # Class probabilities
        class_probabilities = {
            cls: float(prob)
            for cls, prob in zip(self._label_encoder.classes_, probas)
        }

        # SHAP explanation
        shap_values = self._compute_shap(X, pred_encoded)

        return {
            "severity": severity,
            "confidence": round(confidence, 4),
            "class_probabilities": class_probabilities,
            "shap_values": shap_values,
            "feature_importance": self._get_feature_importance(),
        }

    def _compute_shap(self, X: np.ndarray, class_idx: int) -> Dict[str, float]:
        """Compute SHAP values for explainability."""
        try:
            shap_vals = self._explainer.shap_values(X)
            # For multi-class, select SHAP for predicted class
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
        """Return feature importance scores."""
        try:
            importances = self._model.feature_importances_
            return {
                feat: round(float(imp), 4)
                for feat, imp in zip(self._feature_names, importances)
            }
        except Exception:
            return {}

    def retrain(self) -> str:
        """Retrain model with fresh data."""
        train_model()
        self._load_models()
        return "Model retrained successfully"


# Global ML service instance
ml_service = MLService.get_instance()
