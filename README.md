# AERIS — AI Emergency Response & Intelligence System

> **Predict. Prepare. Protect.** A high-precision, AI-driven emergency management platform that replaces reactive disaster response with proactive, ML-powered intelligence — built specifically for Bihar's annual flood crisis.

---

## 🌊 The Problem

Bihar is India's most flood-prone state. Every monsoon, rivers like the Kosi, Gandak, Bagmati, and Mahananda breach aging embankments built in the 1950s–70s, displacing millions and causing catastrophic damage.

| Metric | Scale |
|--------|-------|
| **People affected annually** | 21 million+ |
| **Annual economic loss** | ₹8,000+ Crore |
| **North Bihar population at risk** | 76% |
| **Avg embankment breaches per year** | 40+ |

### Why current systems fail:

- **Information Latency** — Ground-level gauge data takes 6–12 hours to reach decision-makers through manual reporting chains. By then, villages are already submerged.
- **Reactive Response** — NDRF teams deploy *after* flooding begins. Evacuation windows are missed, resource staging is delayed by critical hours.
- **Infrastructure Decay** — Bihar's embankment network has minimal maintenance budgets. Breach risk increases exponentially with age, yet no predictive model exists to prioritize repairs.
- **Resource Inefficiency** — Relief is distributed evenly regardless of actual risk, leaving the most vulnerable areas under-served.

### Existing solutions and their gaps:

| System | What it does | Critical Gap |
|--------|-------------|-------------|
| **CWC Flood Forecasting** | Issues text bulletins based on gauge readings | No ML prediction, no spatial visualization, 6–12hr data lag |
| **FMIS Bihar** | State portal showing real-time river data | Raw tables only — no actionable intelligence or predictions |
| **NDMA Decision Support** | National-level disaster coordination | Macro-level focus, static risk maps, no embankment-specific models |
| **Academic Research** | Various ML flood prediction models | Papers only — never deployed as usable tools with real-time data |

---

## 💡 The AERIS Solution

**Core Thesis**: *If we can predict where and when an embankment will breach — before it happens — we can transform flood response from reactive chaos into proactive precision.*

AERIS uses **dual XGBoost ML models** trained on Bihar-specific data:
1. **Breach Prediction Model** — Predicts embankment failure probability based on structure age, maintenance quality, rainfall intensity, and vulnerability index.
2. **Flood Classification Model** — Predicts flood severity based on precipitation levels and regional vulnerability.

These predictions feed into a **real-time decision platform** with 7 integrated modules:

### Platform Modules

| Module | Description |
|--------|-------------|
| **Live Risk Map** | Interactive GIS map with district-level flood risk coloring, population-at-risk counters, situation room feed, and 24-hour risk trend sparklines |
| **Forecast Simulator** | 7-day forward simulation — pick a district, adjust rainfall/river levels, see ML-predicted flood probability with step-by-step model execution logs |
| **Telemetry Input** | Manual parameter override — feed custom "what-if" scenarios into XGBoost and get instant probabilistic risk assessment |
| **River Pulse** | Live monitoring of 18 river gauge stations across 5 basins with GIS map, district highlights color-coded by alert status, and ML-predicted breach/flood risk |
| **Post-Mortem** | Timeline reconstruction of past disasters (2023 Kosi breach) — identifies infrastructure failures, response delays, and actionable improvements |
| **Resilience Scorecard** | Ranks all 38 Bihar districts by flood preparedness — infrastructure, response time, medical capacity, shelter availability |
| **Research Overview** | Research-style presentation page: problem statement, existing solution gaps, and AERIS's proposed solution with architecture breakdown |

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **ML Models** | XGBoost (dual) — Embankment Breach Prediction + Flood Severity Classification |
| **Backend** | FastAPI (Python) — REST API with real-time ML inference |
| **Frontend** | React 19 + Vite + Tailwind CSS 4 + Framer Motion |
| **GIS Engine** | React-Leaflet + GeoJSON — District-level spatial rendering with CARTO basemaps |
| **Analytics** | Recharts (visual analytics) + Lucide React (icons) |
| **Data** | Bihar CWC gauge data, FMIS telemetry, embankment infrastructure reports |

---

## 📂 Project Structure

```
AERIS/
├── frontend/                    # React + Vite frontend application
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx       # Navigation shell + editorial layout
│   │   ├── pages/
│   │   │   ├── LiveRiskMapPage.jsx        # GIS risk map + situation room
│   │   │   ├── ForecastTimelinePage.jsx   # 7-day simulation engine
│   │   │   ├── PredictorPage.jsx          # Manual telemetry input
│   │   │   ├── RealTimeMonitorPage.jsx    # River Pulse live monitoring
│   │   │   ├── PostLearningPage.jsx       # Post-mortem analysis
│   │   │   ├── ResilienceScorecardPage.jsx # District ranking
│   │   │   └── ResearchPage.jsx           # Research overview
│   │   ├── App.jsx              # Route definitions
│   │   └── main.jsx             # Entry point
│   └── public/
│       └── bihar_districts_real.geojson   # Bihar GeoJSON boundary data
│
├── flood_resilience/
│   ├── api/
│   │   └── main.py              # FastAPI backend (ML inference + telemetry)
│   ├── ml/
│   │   ├── train_models.py      # Model training scripts
│   │   ├── breach_model.pkl     # Trained breach prediction model
│   │   └── flood_model.pkl      # Trained flood classification model
│   ├── gis/                     # AHP (Analytical Hierarchy Process) logic
│   ├── perc/                    # Post-Event Learning modules
│   └── data/                    # Bihar dataset generation
│
└── README.md                    # This file
```

---

## ⚡ Quickstart

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**

### 1. Backend Setup
```bash
# From the project root
cd flood_resilience

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# (Optional) Train ML models if not present
python ml/train_models.py

# Start the API server
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
# From the project root
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
# Open http://localhost:5173
```

### Quick Reference

| Task | Command |
|------|---------|
| **Run Backend** | `cd flood_resilience && python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload` |
| **Run Frontend** | `cd frontend && npm run dev` |
| **Train Models** | `cd flood_resilience && python ml/train_models.py` |
| **Check API** | `curl http://localhost:8000/` |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/predict` | Flood risk prediction (primary ML inference) |
| `POST` | `/predict/breach` | Embankment breach probability |
| `POST` | `/predict/7day_forecast` | 7-day daily risk forecast |
| `GET` | `/risk/situation_room` | Simulated situation room telemetry |
| `GET` | `/telemetry/realtime` | Real-time data for 18 river gauge stations |

---

## 🎨 Design Philosophy

AERIS follows an **editorial design system** inspired by premium publications:

- **Typography**: Playfair Display Serif — high-trust, authoritative feel
- **Palette**: Cream background (`#FAF9F6`), Charcoal headings (`#1A1D1A`), Deep Teal accents (`#0B3D3D`)
- **Color Coding**: Red (`#991b1b`) = Danger, Amber (`#b45309`) = Warning, Teal (`#0B3D3D`) = Normal
- **Layout**: Glassmorphic cards, with smooth Framer Motion animations and transitions
- **GIS**: Light CARTO basemap with district-level GeoJSON polygons color-coded by risk level

---

## 🏆 Impact & Key Differentiators

| Traditional Approach | AERIS Approach |
|---------------------|----------------|
| Reactive — deploys after disaster | **Predictive** — forecasts risk before disaster strikes |
| Generic national models | **Bihar-specific** — trained on local embankment, rainfall, and river data |
| Data buried in tables | **GIS-native** — every insight is spatially mapped |
| Static risk zones | **Real-time** — auto-refreshing telemetry with ML-powered alerts |
| Warning only | **Resilience-focused** — scores preparedness and tracks improvement |
| Research papers | **End-to-end platform** — from raw data to actionable intelligence in one UI |

### Measurable Outcomes
- **Predictive Evacuation** — 7-day early warnings save lives by enabling pre-positioned resources
- **Accountability** — Transparent district rankings drive infrastructure maintenance investment
- **Efficiency** — Directs NDRF resources to statistically highest-risk zones before failure
- **Learning** — Post-mortem analysis feeds improvements back into the model for continuous learning

---

> **AERIS** — Because every second counts.
>
> Built for Bihar. Powered by AI. Designed for Impact.
