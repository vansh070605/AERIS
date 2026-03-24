import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, XCircle, CheckCircle, Zap, Brain, Map, BarChart3, Shield, Radio, BookOpen, ArrowRight } from 'lucide-react';

const fadeUp = (delay = 0) => ({ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] } });

function StatCard({ number, label, icon: Icon, color }) {
  return (
    <div className={`p-6 rounded-2xl border ${color}`}>
      <Icon className="w-5 h-5 mb-3 opacity-60" />
      <div className="text-3xl font-serif font-bold">{number}</div>
      <div className="text-[9px] font-bold uppercase tracking-widest mt-2 opacity-50">{label}</div>
    </div>
  );
}

export default function ResearchPage() {
  return (
    <div className="w-full min-h-full pb-16 overflow-y-auto no-scrollbar">

      {/* Hero */}
      <motion.div {...fadeUp()} className="mb-16 border-b border-black/5 pb-12">
        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#0B3D3D] mb-4">Research Overview</div>
        <h1 className="text-5xl md:text-7xl font-serif text-[#1A1D1A] tracking-tight leading-[1.05] mb-6 max-w-3xl">
          Rethinking Flood<br />Response with AI.
        </h1>
        <p className="text-black/50 text-sm leading-relaxed max-w-2xl">
          AERIS (AI Emergency Response & Intelligence System) is an end-to-end platform that replaces reactive disaster management with predictive, ML-driven intelligence — specifically designed for Bihar's annual flood crisis.
        </p>
      </motion.div>

      {/* ═══════════════  SECTION 1: THE PROBLEM  ═══════════════ */}
      <motion.section {...fadeUp(0.1)} className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-[#991b1b]" />
          </div>
          <div>
            <h2 className="text-3xl font-serif text-[#1A1D1A]">The Problem</h2>
            <p className="text-[9px] font-bold uppercase tracking-widest text-red-400">Why Bihar floods remain catastrophic</p>
          </div>
        </div>

        <div className="bg-red-50/50 border border-red-100/50 rounded-3xl p-8 md:p-10 mb-8">
          <p className="text-black/60 text-sm leading-relaxed mb-6">
            Bihar is India's most flood-prone state, with <strong>76% of the North Bihar population</strong> living under the recurring threat of devastating floods. Every monsoon season, rivers like the Kosi, Gandak, and Bagmati breach aging embankments, displacing millions and causing catastrophic damage to agriculture and infrastructure.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard number="21M+" label="People affected annually" icon={AlertTriangle} color="bg-white border-red-100 text-[#991b1b]" />
            <StatCard number="₹8,000Cr" label="Avg annual economic loss" icon={AlertTriangle} color="bg-white border-red-100 text-[#991b1b]" />
            <StatCard number="76%" label="North Bihar at risk" icon={AlertTriangle} color="bg-white border-red-100 text-[#991b1b]" />
            <StatCard number="40+" label="Embankment breaches/year" icon={AlertTriangle} color="bg-white border-red-100 text-[#991b1b]" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-black/5">
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#991b1b] mb-3">Information Latency</div>
            <p className="text-sm text-black/60 leading-relaxed">
              Ground-level data from gauge stations takes <strong>6–12 hours</strong> to reach decision-makers through manual reporting chains. By the time alerts are issued, embankments have already breached and villages are submerged.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-black/5">
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#991b1b] mb-3">Reactive Response</div>
            <p className="text-sm text-black/60 leading-relaxed">
              Current disaster management is entirely <strong>post-disaster</strong>. NDRF teams deploy after flooding has begun, meaning evacuation windows are missed and resource staging is delayed by critical hours.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-black/5">
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#991b1b] mb-3">Infrastructure Decay</div>
            <p className="text-sm text-black/60 leading-relaxed">
              Bihar's embankment network, built in the 1950s–70s, is aging with <strong>minimal maintenance budgets</strong>. Breach risk increases exponentially with embankment age, yet no predictive model exists to prioritize repairs.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-black/5">
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#991b1b] mb-3">Resource Inefficiency</div>
            <p className="text-sm text-black/60 leading-relaxed">
              Relief materials and rescue teams are <strong>evenly distributed</strong> across districts regardless of actual risk, leaving the most vulnerable areas under-served while lower-risk areas have excess capacity.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ════════════  SECTION 2: EXISTING BROKEN SOLUTIONS  ════════════ */}
      <motion.section {...fadeUp(0.2)} className="mb-20">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-[#b45309]" />
          </div>
          <div>
            <h2 className="text-3xl font-serif text-[#1A1D1A]">Existing Solutions & Their Gaps</h2>
            <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400">Why current approaches fall short</p>
          </div>
        </div>

        <div className="space-y-4">
          {[
            {
              name: "CWC Flood Forecasting (Central Water Commission)",
              desc: "India's primary flood warning system. Issues bulletins based on gauge readings.",
              gaps: ["Manual data collection with 6–12hr lag", "Text-based bulletins, no spatial visualization", "No ML-based prediction — relies on statistical thresholds", "No breach probability or infrastructure risk scoring"]
            },
            {
              name: "FMIS Bihar (Flood Management Information System)",
              desc: "Bihar's state-level web portal showing real-time river data.",
              gaps: ["Raw tabular data, not actionable intelligence", "No predictive capability — only shows current levels", "No mobile-responsive design for field use", "No integration with response planning or resource allocation"]
            },
            {
              name: "NDMA Decision Support System",
              desc: "National-level platform for disaster coordination.",
              gaps: ["Macro-level focus — not district-granular for Bihar", "No embankment-specific breach models", "Static risk maps based on historical zones, not dynamic ML predictions", "No 7-day forward simulations for pre-positioning resources"]
            },
            {
              name: "Academic / Research Models",
              desc: "Various ML-based flood prediction models from published research.",
              gaps: ["Remain as papers — never deployed as usable tools", "No real-time data integration or auto-refresh", "No GIS interface for spatial decision-making", "Not connected to actual response workflows or resilience scoring"]
            }
          ].map((sol, i) => (
            <motion.div key={i} {...fadeUp(0.2 + i * 0.05)} className="bg-white rounded-2xl border border-black/5 p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="md:w-1/3">
                  <div className="text-lg font-serif text-[#1A1D1A] mb-2">{sol.name}</div>
                  <p className="text-xs text-black/40 leading-relaxed">{sol.desc}</p>
                </div>
                <div className="md:w-2/3">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-[#b45309] mb-3">Critical Gaps</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {sol.gaps.map((g, j) => (
                      <div key={j} className="flex items-start gap-2 text-xs text-black/60">
                        <XCircle className="w-3 h-3 text-red-300 mt-0.5 shrink-0" />
                        <span>{g}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ════════════  SECTION 3: PROPOSED SOLUTION (AERIS)  ════════════ */}
      <motion.section {...fadeUp(0.3)} className="mb-16">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-[#0B3D3D]/10 border border-[#0B3D3D]/20 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-[#0B3D3D]" />
          </div>
          <div>
            <h2 className="text-3xl font-serif text-[#1A1D1A]">Our Proposed Solution</h2>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#0B3D3D]/60">AERIS — AI Emergency Response & Intelligence System</p>
          </div>
        </div>

        <div className="bg-[#0B3D3D] text-[#FAF9F6] rounded-3xl p-8 md:p-12 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10 max-w-2xl">
            <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-4">Core Thesis</div>
            <p className="text-xl md:text-2xl font-serif leading-relaxed mb-6">
              "If we can predict where and when an embankment will breach — before it happens — we can transform flood response from reactive chaos into proactive precision."
            </p>
            <p className="text-white/60 text-sm leading-relaxed">
              AERIS uses dual XGBoost models trained on Bihar-specific data to predict both <strong className="text-white">embankment breach probability</strong> (based on structure age, maintenance, rainfall) and <strong className="text-white">flood severity</strong> (based on precipitation and vulnerability indices). These predictions feed into a real-time decision platform with 6 integrated modules.
            </p>
          </div>
        </div>

        {/* Architecture Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Map, title: "Live Risk Map", desc: "GIS-based Bihar map with district-level flood risk coloring, population-at-risk counters, and 24-hour risk trend sparklines. Click any district for detailed intelligence.", tag: "Real-Time Visualization" },
            { icon: Zap, title: "Forecast Simulator", desc: "7-day forward-looking simulation. Pick a district, adjust rainfall/river levels, and see ML-predicted flood probability with step-by-step model execution logs.", tag: "Predictive Analytics" },
            { icon: Brain, title: "Telemetry Input", desc: "Manual parameter override interface. Feed custom scenarios (what-if rainfall is 400mm?) into our XGBoost model and get instant probabilistic risk assessment.", tag: "What-If Analysis" },
            { icon: Radio, title: "River Pulse", desc: "Live monitoring of 18 river gauge stations across 5 basins. GIS map with district highlights color-coded by alert status. ML-predicted breach and flood risk per station.", tag: "Real-Time Telemetry" },
            { icon: BookOpen, title: "Post-Mortem Analysis", desc: "Timeline reconstruction of past disasters (2023 Kosi breach). Identifies infrastructure failures, response delays, and generates actionable improvement recommendations.", tag: "Learning from History" },
            { icon: BarChart3, title: "Resilience Scorecard", desc: "Ranks all 38 Bihar districts by flood preparedness — infrastructure, response time, medical capacity, shelter availability. Identifies underdeveloped subsectors.", tag: "Preparedness Index" },
          ].map((m, i) => (
            <motion.div key={i} {...fadeUp(0.3 + i * 0.05)} className="bg-white p-6 rounded-2xl border border-black/5 hover:shadow-xl hover:shadow-black/5 transition-all duration-300 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#0B3D3D]/5 flex items-center justify-center group-hover:bg-[#0B3D3D] transition-colors">
                  <m.icon className="w-4 h-4 text-[#0B3D3D] group-hover:text-white transition-colors" />
                </div>
                <span className="text-[7px] font-bold uppercase tracking-widest text-[#0B3D3D]/40 px-2 py-1 bg-[#0B3D3D]/5 rounded-full">{m.tag}</span>
              </div>
              <div className="text-lg font-serif text-[#1A1D1A] mb-2">{m.title}</div>
              <p className="text-xs text-black/50 leading-relaxed">{m.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Tech Stack & Differentiators */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#F4F2EC] rounded-2xl p-8 border border-black/5">
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#0B3D3D] mb-6">Technology Stack</div>
            <div className="space-y-4">
              {[
                { layer: "ML Models", tech: "XGBoost (dual) — Breach Prediction + Flood Classification" },
                { layer: "Backend", tech: "FastAPI (Python) — REST endpoints with ML inference" },
                { layer: "Frontend", tech: "React + Vite + Framer Motion — Editorial design system" },
                { layer: "GIS Engine", tech: "React-Leaflet + GeoJSON — District-level spatial rendering" },
                { layer: "Data", tech: "Bihar-specific CWC gauge data, FMIS telemetry, infrastructure reports" },
              ].map((t, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="text-[8px] font-bold uppercase tracking-widest text-[#0B3D3D]/40 w-20 shrink-0 pt-1">{t.layer}</div>
                  <div className="text-sm text-black/60">{t.tech}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#F4F2EC] rounded-2xl p-8 border border-black/5">
            <div className="text-[9px] font-bold uppercase tracking-widest text-[#0B3D3D] mb-6">Key Differentiators</div>
            <div className="space-y-4">
              {[
                "Predictive, not reactive — forecasts risk before disaster strikes",
                "Bihar-specific — trained on local embankment, rainfall, and river data",
                "End-to-end platform — from raw data to actionable intelligence in one UI",
                "GIS-native — every insight is spatially mapped, not buried in tables",
                "Real-time — auto-refreshing telemetry with ML-powered alerts",
                "Resilience-focused — doesn't just warn, but scores preparedness and tracks improvement"
              ].map((d, i) => (
                <div key={i} className="flex items-start gap-3 text-sm text-black/60">
                  <CheckCircle className="w-4 h-4 text-[#0B3D3D] mt-0.5 shrink-0" />
                  <span>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Footer CTA */}
      <motion.div {...fadeUp(0.5)} className="text-center py-12 border-t border-black/5">
        <p className="text-black/30 text-[10px] font-bold uppercase tracking-[0.3em] mb-4">Built for Bihar. Powered by AI. Designed for Impact.</p>
        <p className="text-3xl font-serif text-[#1A1D1A]">AERIS.</p>
      </motion.div>

    </div>
  );
}
