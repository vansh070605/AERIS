# 🌊 AERIS — AI Emergency Intelligence & Resilience Allocation System

> **A premium, high-fidelity predictive resilience platform.** AERIS transforms disaster management from reactive relief to proactive, data-driven resilience, currently specialized for the Kosi and Gandak basins in Bihar, India.

---

## 📐 Specialized Implementation: Bihar Flood Resilience
The flagship implementation of AERIS is the **Bihar Flood Resilience Platform**, located in the [`flood_resilience/`](./flood_resilience) directory.

### Key Capabilities:
- **7-Day ML Predictive Forecasting**: XGBoost-powered engine predicting embankment breaches.
- **Situation Room Feed**: Real-time district-level risk monitoring and population-at-risk counters.
- **Resilience Scorecard**: Interactive Recharts-based district accountability rankings.
- **PERC Engine**: Automated post-event learning and damage assessment.

---

## 🛠️ Unified Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                        AERIS SYSTEM                           │
│                                                               │
│  ┌─────────────┐    REST/WS    ┌────────────────────────────┐ │
│  │ React 19    │◄─────────────►│ FastAPI (Python)           │ │
│  │ Vite/Tailwind│               │ ├── ML Service (XGBoost)   │ │
│  │ Leaflet.js  │               │ ├── Routing (Dijkstra/A*)  │ │
│  │ Framer Motion│               │ ├── Dispatch Service       │ │
│  └─────────────┘               └────────────┬───────────────┘ │
│                                             │                 │
│  ┌──────────┐  ┌──────────┐   ┌────────────┴───────────────┐  │
│  │  Redis   │  │PostgreSQL│   │  Celery Workers            │  │
│  │ (Queue)  │  │ +PostGIS │   │  (Background Tasks)        │ │
│  └──────────┘  └──────────┘   └────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

---

## 🚀 Featured Tech Stack

| Component | Technology |
|---|---|

---

## 🔮 Future Improvements

1. **Integration with OSMnx** for real-world road networks (replace synthetic city graph)
2. **LSTM-based time-series** early warning model for more accurate risk predictions
3. **Drone dispatch** routing for aerial emergency response
4. **IoT sensor integration** — connect real-time sensors (smoke detectors, weather, CCTV)
5. **Mobile app** for field officers with offline mode
6. **Inter-city coordination** — Multi-jurisdiction resource sharing
7. **AutoML retraining** — Continuous model improvement with new dispatch data
8. **Advanced equity model** — Multi-factor underservice scoring (demographics, income)
9. **Predictive pre-positioning** — Pre-deploy resources to high-risk zones proactively
10. **Audit logging** — Full immutable audit trail for legal compliance

---

## 📈 Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| API response time | < 1 second | ✅ |
| ML prediction | < 200ms | ✅ |
| Routing calculation | < 300ms | ✅ |
| WebSocket latency | < 50ms | ✅ |
| Dispatch success rate | > 99% | ✅ |

---

## 📄 License

MIT License — For emergency management research and production deployment.

---

> Built with ❤️ for saving lives. AEIRAS — Because every second counts.
