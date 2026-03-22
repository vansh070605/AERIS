# 🌊 Bihar Flood Resilience Platform

A cutting-edge, predictive Flood Resilience and Post-Event Learning (PERC) platform tailored for the Kosi/Gandak basins in Bihar, India. This project transitions disaster management from **reactive relief** to **predictive resilience**.

## 🚀 Key Features

1. **Multi-Criteria GIS Hazard Mapping**: Interactive Python Folium maps built using an AHP weighted overlay (DEM, soil permeability, river distance, rainfall, land use).
2. **7-Day ML Predictive Forecasting**: XGBoost-powered forecasting engine that predicts embankment breach probabilities based on maintenance records, age, and live rainfall.
3. **PERC Engine (Post-Event Learning)**: Automated damage assessment (crop loss, population affected) that generates analytical insights on *why* a flood occurred.
4. **Resilience Scorecard**: District-wise accountability rankings based on relief response times and infrastructure maintenance.
5. **Real-time API & Dashboard**: FastAPI backend serving predictions to a sleek, responsive Streamlit dashboard.

## 🛠️ Tech Stack

- **Backend**: FastAPI, Uvicorn
- **Frontend / Dashboard**: Streamlit, Streamlit-Folium, Plotly
- **GIS / Mapping**: Geopandas, Folium, Shapely
- **Machine Learning**: Scikit-Learn, XGBoost, Pandas, Numpy

## 📂 Repository Structure

- `api/` - FastAPI application for ML model inference
- `dashboard/` - Streamlit UI application
- `data/` - Synthetic data generation scripts and generated datasets
- `demo/` - Hackathon video script
- `gis/` - Hazard mapping and AHP multi-criteria logic
- `ml/` - XGBoost model training pipelines
- `perc/` - Post-Event Learning processing engine

## ⚡ Quickstart

### 1. Setup Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Generate Data & Train Models
Since this is a fresh clone, you need to generate the synthetic Bihar dataset and train the ML models:
```bash
python data/generate_data.py
python ml/train_models.py
```

### 3. Run the Dashboard
```bash
streamlit run dashboard/app.py
```

### 4. Run the API (Optional/Standalone)
```bash
uvicorn api.main:app --reload
```

## 🏆 Hackathon Impact (BSDMA ROI)
- **Life Savings**: 7-day early warnings for targeted NDRF deployment.
- **Accountability**: Transparent metrics on embankment maintenance.
- **Financial**: Data-driven optimization of post-flood recovery funds.
