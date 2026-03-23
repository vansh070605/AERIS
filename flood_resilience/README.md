# 🌊 AERIS: Bihar Flood Resilience & PERC Platform

> **Discover the Depths of Predictive Resilience.** A premium, high-fidelity platform for the Kosi and Gandak basins, transitioning disaster management from reactive relief to proactive, data-driven resilience.

---

## ✨ Key Enhancements (V2.0)

### 🛰️ Live Situation Room
The core of the platform is now a **Situation Room Feed** providing real-time district-level risk updates, a live population-at-risk counter, and high-frequency risk activity logs.

### 📈 Visual Analytics Scorecard
The **Resilience Scorecard** has been reimagined as a digital editorial spread. Powered by **Recharts**, it features interactive district-level comparison charts, infrastructure health rankings, and historical response time benchmarks.

### 🌊 7-Day ML Forecast Simulator
A new **Scrubbing Slider** interface allows users to simulate flood risk 7 days into the future. Driven by an **XGBoost** predictive engine, it calculates breach probabilities based on live rainfall and embankment structural integrity.

### 📊 District Pulse Sparklines
Every district in the live map now features a **Pulse Sparkline**, visualizing risk trends over the past 24 hours to identify emerging hotspots before they become emergencies.

---

## 🎨 Design Philosophy: "Discovery the Depths"
The platform has pivoted to a **Wix-inspired Light Theme** ("Discover the Depths"):
- **Typography**: Playfair Display Serif for an editorial, high-trust feel.
- **Palette**: Cream background (`#FAF9F6`), Charcoal headings (`#1A1D1A`), and Deep Teal accents.
- **Glassmorphism**: Subtle, translucent UI elements for a modern, airy experience.

---

## 🛠️ Modern Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4, Framer Motion (Animations)
- **Analytics**: Recharts, Lucide React (Icons)
- **Mapping**: Leaflet.js, React Leaflet (Light Carto Base)
- **Backend API**: FastAPI (Python), Flask (ML Inference)
- **Data Science**: XGBoost, Scikit-Learn, Geopandas, AHP GIS Logic

---

## 📂 Project Structure

```bash
flood_resilience/
├── frontend/        # React + Vite + Tailwind 4 implementation
├── api/             # FastAPI backend for risk management
├── ml/              # XGBoost model training & inference
├── gis/             # AHP (Analytical Hierarchy Process) logic
├── perc/            # Post-Event Learning (Automated damage assessment)
├── data/            # Synthetic Bihar dataset generation
└── demo/            # Media assets & scripts
```

---

## ⚡ Quickstart

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 20+**

### 2. Backend Setup
```bash
# From flood_resilience root
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
python data/generate_data.py
python ml/train_models.py
uvicorn api.main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

---

## 🏆 Impact & ROI
- **Predictive Evacuation**: Saves lives via 7-day early warnings.
- **Accountability**: Transparent district rankings for infrastructure maintenance.
- **Efficiency**: Directs NDRF resources to high-risk zones before failure.

---

> Built for the **Bihar State Disaster Management Authority (BSDMA)**.
