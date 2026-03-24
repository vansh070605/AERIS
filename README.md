# AERIS — AI Emergency Intelligence & Resilience Allocation System

## 🌊 About the Project
AERIS is a high-precision, AI-driven emergency management platform designed to mitigate the impact of seasonal flooding and infrastructure failures, specifically focused on the high-risk flood zones of Bihar, India. It provides real-time risk assessment, predictive analytics, and post-event resilience scoring to help disaster management authorities allocate resources effectively.

### 🛑 The Problem
Bihar faces catastrophic floods annually, leading to:
- **Massive Population Displacement**: Over 1M+ people are often at risk simultaneously.
- **Infrastructure Vulnerability**: Embankment breaches are difficult to predict with traditional methods.
- **Information Latency**: Slow data flow from the field delays emergency response and resource deployment.
- **Resource Inefficiency**: Rescue and relief efforts are often reactive rather than proactive.

### 💡 The Solution (AERIS)
AERIS bridges the gap between raw telemetry and actionable intelligence through:
- **Predictive Breach Modeling**: Using XGBoost ML models to predict embankment failures based on rainfall, river levels, and structure age.
- **Live Intelligence Horizon**: A real-time map displaying population-at-risk counters and automated situation room feeds.
- **7-Day Risk Forecasting**: Probabilistic simulations that allow authorities to "look into the future" and pre-position resources.
- **Resilience Matrix**: Data-driven scorecard to rank district readiness and identify underdeveloped subsectors.

---

## 🚀 Getting Started (Run from Scratch)

### 📋 Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Virtual Environment** (recommended)

### 🛠️ Step 1: Backend Setup
Open a terminal in the project root:
```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Start the API server
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### 🎨 Step 2: Frontend Setup
Open a **new** terminal in the `frontend/` directory:
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

### 🧠 Step 3: ML Model Training (Optional/First time)
If models are not found in the `ml/` folder:
```bash
python ml/train_models.py
```

---

## 📊 Terminal Commands Summary

| Task | Command |
|---|---|
| **Run Backend** | `python -m uvicorn api.main:app --host 0.0.0.0 --port 8000` |
| **Run Frontend** | `cd frontend && npm run dev` |
| **Train Models** | `python ml/train_models.py` |
| **Check API** | `curl http://localhost:8000/` |

---
> AERIS — Because every second counts.
