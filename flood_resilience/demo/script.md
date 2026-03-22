# 🎥 Bihar Flood Resilience Platform - 3-Min Demo Script

**Target Audience:** Hackathon Judges, BSDMA Officials
**Tone:** Urgent, Data-Driven, Impact-Focused

---

### [0:00 - 0:30] THE PROBLEM (Visual: Blank map, switching to past disaster footage)
**Speaker:**
"Every year, the Kosi and Gandak rivers flood Bihar, affecting millions. The reactive approach costs lives, destroys livelihoods, and drains billions in recovery. 
What if we could predict exactly *where* the embankments will fail and *who* needs immediate evacuation?"

### [0:30 - 1:15] PHASE 1: GIS HAZARD MAPPING (Visual: Streamlit Tab 1 - Live Risk Map)
**Speaker:**
"Meet our Predictive Flood Resilience Platform. Let's start with the Live Risk Map. 
Unlike static hazard maps, this interactive GIS layer dynamically synthesizes 5 critical variables: DEM slope, river proximity, soil permeability, active rainfall, and land use using an AHP weighted overlay. 
Watch as we hover over districts—instantly triaging 38 north Bihar districts into High, Medium, and Low risk zones."

### [1:15 - 2:00] PHASE 2: PREDICTIVE WARNING (Visual: Streamlit Tab 2 - Flood Forecast)
**Speaker:**
"But knowing the risk isn't enough; we need foresight. 
Our XGBoost ML engine doesn't just look at rain. It analyzes embankment age and maintenance scores alongside monsoon forecasts to predict breach probabilities. 
*(Selects 'Patna')* 
Here, the 7-day forecast shows a surge into the 'RED ALERT' threshold. Decision-makers now have a 7-day head start to mobilize NDRF teams before a single drop of water spills over."

### [2:00 - 2:30] PHASE 3: POST-EVENT LEARNING (Visual: Streamlit Tab 3 & 4 - PERC & Scorecard)
**Speaker:**
"When the waters recede, our Post-Event Learning Engine (PERC) activates. It calculates exact crop damage and population exposure. 
Look at the AI Insights—it tells us exactly *why* a district flooded. Was it unprecedented rain, or a predictable embankment failure due to ignored maintenance? 
The Resilience Scorecard then publicly ranks districts, enforcing accountability for relief reach and infrastructure upkeep."

### [2:30 - 3:00] THE IMPACT (Visual: Architecture slide & GitHub Repo)
**Speaker:**
"Built using Python, FastAPI, Streamlit, Folium, and Scikit-learn, this isn't just a prototype—it's a deployable architecture ready for the Bihar State Disaster Management Authority. 
By shifting from reactive relief to predictive resilience, we can save lives and optimize recovery spend.
Thank you."
