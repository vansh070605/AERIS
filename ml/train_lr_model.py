"""
Train Logistic Regression flood prediction model.
Generates: ml/lr_model.pkl  +  ml/lr_scaler.pkl

Features (43 total):
  - Rainfall_mm, River_Level_m, Danger_Level_m, Population, Crop_Area_ha
  - year, month, day
  - 35 District one-hot dummies (Araria is the baseline, dropped)
"""

import os
import sys
import pandas as pd
import numpy as np
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA   = os.path.join(ROOT, 'data', 'bihar_flood_data.csv')
ML_DIR = os.path.dirname(os.path.abspath(__file__))

def main():
    print("=" * 55)
    print("  AERIS — LR Model Training")
    print("=" * 55)

    # ── Load data ──────────────────────────────────────────────────────────────
    if not os.path.exists(DATA):
        print(f"[ERROR] Data file not found: {DATA}")
        sys.exit(1)

    df = pd.read_csv(DATA, parse_dates=['Date'])
    print(f"[INFO] Loaded {len(df)} rows from bihar_flood_data.csv")

    # ── Feature engineering ────────────────────────────────────────────────────
    df['year']  = df['Date'].dt.year
    df['month'] = df['Date'].dt.month
    df['day']   = df['Date'].dt.day

    base_cols = ['Rainfall_mm', 'River_Level_m', 'Danger_Level_m',
                 'Population', 'Crop_Area_ha', 'year', 'month', 'day']

    # One-hot encode District, drop first (Araria is the baseline)
    district_dummies = pd.get_dummies(df['District'], prefix='District', drop_first=True)
    X = pd.concat([df[base_cols], district_dummies], axis=1)
    y = df['Flood']

    print(f"[INFO] Feature matrix shape: {X.shape}  (expected ~43 columns)")
    print(f"[INFO] Class balance — Flood=1: {y.sum()} / Flood=0: {(y==0).sum()}")

    # ── Train / test split ─────────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # ── Scale ──────────────────────────────────────────────────────────────────
    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test)

    # ── Logistic Regression ────────────────────────────────────────────────────
    model = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
    model.fit(X_train_s, y_train)

    # ── Evaluation ────────────────────────────────────────────────────────────
    y_pred = model.predict(X_test_s)
    y_prob = model.predict_proba(X_test_s)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    f1  = f1_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_prob)

    print(f"\n[RESULTS]")
    print(f"  Accuracy : {acc:.4f}")
    print(f"  F1 Score : {f1:.4f}")
    print(f"  ROC-AUC  : {auc:.4f}")

    # ── Save ───────────────────────────────────────────────────────────────────
    model_path  = os.path.join(ML_DIR, 'lr_model.pkl')
    scaler_path = os.path.join(ML_DIR, 'lr_scaler.pkl')

    joblib.dump(model,  model_path)
    joblib.dump(scaler, scaler_path)

    print(f"\n[SAVED] lr_model.pkl  → {model_path}")
    print(f"[SAVED] lr_scaler.pkl → {scaler_path}")
    print("\n✅ LR model training complete. Backend is ready to start.")

if __name__ == '__main__':
    main()
