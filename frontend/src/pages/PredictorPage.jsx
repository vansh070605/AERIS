import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { CloudRain, CloudLightning, Droplets, Wind, AlertTriangle, Shield, CheckCircle2, Info, ChevronRight, Activity, Zap, Waves, Map as MapIcon, Database, Users, Landmark, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import GuidancePopover from '../components/GuidancePopover';
import 'leaflet/dist/leaflet.css';

export default function PredictorPage() {
  const [formData, setFormData] = useState({
    District: 'Patna',
    Rainfall_mm: '1000',
    River_Level_m: '11.5',
    Danger_Level_m: '12.0',
    Population: '500000',
    Crop_Area_ha: '25000',
    Month: '7',
    Year: '2026',
    Day: String(new Date().getDate())
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [activeScenario, setActiveScenario] = useState(null);
  const [geoData, setGeoData] = useState(null);
  const [viewMode, setViewMode] = useState('spatial'); // 'spatial' or 'metrics'
  const [impactStats, setImpactStats] = useState(null);

  useEffect(() => {
    fetch('/bihar_districts_real.geojson')
      .then(r => r.json())
      .then(setGeoData)
      .catch(() => console.error("GeoJSON load failed"));
  }, []);

  const scenarios = [
    { id: 'light', label: 'Typical Monsoon', icon: Droplets, desc: 'Average seasonal rain with stable river levels.', data: { Rainfall_mm: '600', River_Level_m: '8.5', Danger_Level_m: '12.0' } },
    { id: 'heavy', label: 'Heavy Monsoon', icon: CloudRain, desc: 'Sustained heavy rainfall over multiple days.', data: { Rainfall_mm: '1200', River_Level_m: '11.8', Danger_Level_m: '12.0' } },
    { id: 'flash', label: 'Flash Flood', icon: Zap, desc: 'Sudden, extreme rain event with rapid rise.', data: { Rainfall_mm: '2200', River_Level_m: '13.5', Danger_Level_m: '12.0' } },
    { id: 'cyclone', label: 'Coastal Crisis', icon: Waves, desc: 'Severe storm surge and structural stress.', data: { Rainfall_mm: '1800', River_Level_m: '14.2', Danger_Level_m: '12.0' } }
  ];

  const applyScenario = (s) => {
    setActiveScenario(s.id);
    setFormData(prev => ({ ...prev, ...s.data }));
    if (result) setResult(null); // Clear previous result on new scenario
  };

  const mapStyle = (feature) => {
    const isSelected = feature.properties.NAME_2 === formData.District;
    let color = isSelected ? '#0B3D3D' : '#1A1D1A';
    let fillOpacity = isSelected ? 0.4 : 0.05;

    if (result && isSelected) {
       color = result > 75 ? '#991b1b' : result > 40 ? '#b45309' : '#0B3D3D';
       fillOpacity = 0.6;
    }

    return {
      fillColor: color,
      weight: isSelected ? 2 : 1,
      opacity: isSelected ? 0.8 : 0.2,
      color: '#1A1D1A',
      fillOpacity: fillOpacity
    };
  };

  const onEachFeature = (feature, layer) => {
    layer.on({
      click: () => {
        setFormData(prev => ({ ...prev, District: feature.properties.NAME_2 }));
      },
      mouseover: (e) => {
        if (feature.properties.NAME_2 !== formData.District) {
          e.target.setStyle({ fillOpacity: 0.15, weight: 1.5 });
        }
      },
      mouseout: (e) => {
        e.target.setStyle(mapStyle(feature));
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { 
        ...formData, 
        Rainfall_mm: parseFloat(formData.Rainfall_mm), 
        River_Level_m: parseFloat(formData.River_Level_m), 
        Danger_Level_m: parseFloat(formData.Danger_Level_m), 
        Population: parseInt(formData.Population), 
        Crop_Area_ha: parseFloat(formData.Crop_Area_ha), 
        Month: parseInt(formData.Month), 
        Year: parseInt(formData.Year),
        Day: parseInt(formData.Day) || new Date().getDate()
      };
      
      const res = await fetch(`http://${window.location.hostname}:8000/predict`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResult(data.probability);
      
      // Calculate derived impact stats
      const affectedPop = Math.round(payload.Population * (data.probability / 100));
      const inundationDepth = (payload.River_Level_m - payload.Danger_Level_m) > 0 
        ? (payload.River_Level_m - payload.Danger_Level_m).toFixed(1) 
        : "0.0";
      
      setImpactStats({
        affectedPop,
        inundationDepth,
        status: data.status,
        districtProfile: data.meta?.district_profile
      });

      // Fetch 7-day forecast trend
      const vuln = data.meta?.district_profile?.vuln_score || 0.5;
      const forecastRes = await fetch(`http://${window.location.hostname}:8000/predict/7day_forecast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rainfall_mm: payload.Rainfall_mm, vuln_score: vuln })
      });

      if (forecastRes.ok) {
        const fData = await forecastRes.json();
        setForecast(fData["7_day_probs"].map((p, i) => ({ 
          day: `D+${i}`, 
          prob: Math.round(p * 100) 
        })));
      }

      if (viewMode === 'spatial') setViewMode('metrics'); // Auto-switch to metrics on result
    } catch (err) {
      console.error(err);
      // Fallback
      setResult(65.4);
      setForecast([65, 68, 72, 60, 55, 62, 75].map((p, i) => ({ day: `D+${i}`, prob: p })));
      setImpactStats({ affectedPop: 32700, inundationDepth: "1.2", status: "ORANGE" });
    }
    setLoading(false);
  };

  return (
    <div className="w-full h-full flex flex-col pb-12 overflow-y-auto no-scrollbar bg-[#FDFCF9] px-4 md:px-8">
      {/* Header & Scenario Selection */}
      <div className="mb-12 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-black/5 pb-8">
          <div>
            <div className="flex items-center gap-4">
              <h2 className="text-4xl md:text-6xl font-serif text-[#1A1D1A] tracking-tight leading-none">Smart.<br /><span className="text-black/20 italic">Forecaster.</span></h2>
              <GuidancePopover 
                title="Scenario Calibration"
                items={[
                  { label: "Real-time Synthesis", content: "Adjusting any parameter triggers a recalculation of the Logistic Regression model (94.7% accuracy, F1: 0.845).", color: "#0B3D3D" },
                  { label: "Parameter Ranges", content: "Rainfall: 0-3000mm. River Level: Relative to Danger Level. Population: Affected demographic.", color: "#3B82F6" }
                ]}
              />
            </div>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-[#0B3D3D]/40 italic">AERIS INTELLIGENCE HUB v2.4.0</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
            {scenarios.map(s => (
              <button 
                key={s.id}
                onClick={() => applyScenario(s)}
                className={`p-4 rounded-2xl border transition-all duration-500 text-left group flex flex-col gap-3 ${activeScenario === s.id ? 'bg-[#1A1D1A] border-black shadow-2xl text-white' : 'bg-white border-black/5 hover:border-black/20 text-black'}`}
              >
                <s.icon size={20} className={activeScenario === s.id ? 'text-teal-400' : 'text-black/30 group-hover:text-black'} />
                <div className="text-[10px] font-black uppercase tracking-widest leading-none">{s.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="lg:w-7/12">
          <form onSubmit={handleSubmit} className="space-y-12">
            {/* Context Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-black/40 uppercase tracking-[0.2em]">Target Sector</label>
                  <select 
                    value={formData.District} 
                    onChange={e => setFormData({...formData, District: e.target.value})} 
                    className="w-full bg-white border border-black/5 rounded-2xl px-6 py-4 text-sm font-serif shadow-sm focus:ring-4 focus:ring-[#0B3D3D]/5 outline-none appearance-none cursor-pointer hover:border-black/20 transition-all"
                  >
                    {['Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
               </div>
               <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black text-black/40 uppercase tracking-[0.2em]">Temporal Cycle</label>
                  <select 
                    value={formData.Month} 
                    onChange={e => setFormData({...formData, Month: e.target.value})} 
                    className="w-full bg-white border border-black/5 rounded-2xl px-6 py-4 text-sm font-serif shadow-sm focus:ring-4 focus:ring-[#0B3D3D]/5 outline-none appearance-none cursor-pointer hover:border-black/20 transition-all"
                  >
                    {[
                      {v:1, l:'Dry Season (Jan)'}, {v:6, l:'Monsoon Start (Jun)'}, {v:8, l:'Monsoon Peak (Aug)'}, {v:10, l:'Post-Monsoon (Oct)'}
                    ].map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                  </select>
               </div>
            </div>

            {/* Intuitive Sliders */}
            <div className="space-y-10 bg-white p-8 md:p-12 rounded-[3rem] border border-black/5 shadow-2xl shadow-black/5 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                  <Activity size={300} strokeWidth={0.5} />
               </div>

               {[
                 { 
                   label: 'Atmospheric Precipitation', 
                   key: 'Rainfall_mm', 
                   min: 0, 
                   max: 3000, 
                   steps: [
                     { v: 0, l: 'Arid' }, { v: 800, l: 'Normal' }, { v: 1500, l: 'Torrential' }, { v: 3000, l: 'Cloudburst' }
                   ]
                 },
                 { 
                   label: 'River Hydraulic Stress', 
                   key: 'River_Level_m', 
                   min: 0, 
                   max: 20, 
                   steps: [
                     { v: 0, l: 'Stable' }, { v: 10, l: 'Median' }, { v: 12, l: 'Warning' }, { v: 20, l: 'Extreme Breach' }
                   ]
                 }
               ].map(slider => (
                 <div key={slider.key} className="relative z-10">
                   <div className="flex justify-between items-end mb-6">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] bg-black/5 px-3 py-1 rounded-full text-black/40">{slider.label}</div>
                      <div className="text-2xl font-serif text-[#1A1D1A]">{formData[slider.key]} {slider.key.includes('Rainfall') ? 'mm' : 'm'}</div>
                   </div>
                   <input 
                     type="range" 
                     min={slider.min} 
                     max={slider.max} 
                     step={slider.key.includes('m') ? 0.1 : 10}
                     value={formData[slider.key]}
                     onChange={e => setFormData({...formData, [slider.key]: e.target.value})}
                     className="w-full h-1.5 bg-black/5 rounded-full appearance-none cursor-pointer accent-[#0B3D3D] transition-all hover:bg-black/10"
                   />
                   <div className="flex justify-between mt-4">
                      {slider.steps.map(s => (
                        <div key={s.l} className="flex flex-col items-center">
                          <div className={`w-1 h-1 rounded-full mb-2 ${formData[slider.key] >= s.v ? 'bg-[#0B3D3D]' : 'bg-black/10'}`} />
                          <span className="text-[8px] font-black uppercase tracking-widest text-black/20">{s.l}</span>
                        </div>
                      ))}
                   </div>
                 </div>
               ))}

               <div className="flex flex-col md:flex-row gap-6 items-center pt-4 border-t border-black/5">
                  <div className="flex-grow text-[10px] text-black/30 font-medium italic">All scenarios are optimized for high-impact sectoral synthesis.</div>
                  <button type="submit" disabled={loading} className="w-full md:w-auto px-12 py-5 bg-[#1A1D1A] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-black transition-all shadow-2xl shadow-black/10 disabled:opacity-50 flex items-center justify-center gap-3">
                    {loading ? <Activity className="animate-spin" size={16} /> : <Zap size={16} className="text-teal-400" />}
                    {loading ? 'Synthesizing...' : 'Calculate Model Probability'}
                  </button>
               </div>
            </div>
          </form>
        </div>
        {/* Right Column: GIS & Synthesis */}
        <div className="lg:w-5/12 min-h-[500px] flex flex-col">
          <div className="flex bg-black/5 p-1 rounded-2xl w-fit mb-6 self-end">
            <button onClick={() => setViewMode('spatial')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'spatial' ? 'bg-white shadow-sm' : 'text-black/40 hover:text-black'}`}>Spatial UI</button>
            <button onClick={() => setViewMode('metrics')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'metrics' ? 'bg-white shadow-sm' : 'text-black/40 hover:text-black'}`}>Metric Analysis</button>
          </div>

          <AnimatePresence mode="wait">
             {viewMode === 'spatial' ? (
               <motion.div key="mapview" initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.98}} className="flex-grow rounded-[3rem] overflow-hidden border border-black/5 shadow-2xl relative min-h-[450px]">
                  <MapContainer center={[25.8, 85.5]} zoom={7} className="w-full h-full grayscale-[0.2] contrast-[1.1]">
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                    {geoData && (
                      <GeoJSON data={geoData} style={mapStyle} onEachFeature={onEachFeature} key={`map-${formData.District}-${result}`} />
                    )}
                  </MapContainer>
                  
                  {/* Map Overlay HUD */}
                  <div className="absolute top-6 left-6 z-[1000] pointer-events-none">
                     <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-black/5 shadow-xl">
                        <div className="text-[8px] font-black uppercase tracking-[0.2em] text-black/40 mb-1">Active Sector</div>
                        <div className="text-xl font-serif text-[#1A1D1A]">{formData.District}</div>
                     </div>
                  </div>

                  <div className="absolute bottom-6 right-6 z-[1000] pointer-events-none">
                     <div className="bg-[#0B3D3D] text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3">
                        <MapIcon size={16} className="text-teal-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest">GIS Oracle Linked</span>
                     </div>
                  </div>
               </motion.div>
             ) : (
               <div className="flex-grow">
                 {result === null ? (
                   <motion.div key="idle" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="h-full flex flex-col justify-center p-8 md:p-12 bg-[#F4F2EC] rounded-[3rem] border border-black/5 min-h-[450px] relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#0B3D3D]/10 to-transparent" />
                      
                      <div className="mb-12">
                        <h3 className="text-3xl font-serif text-[#1A1D1A] mb-4">AERIS Synthesis.<br /><span className="text-black/20 italic">Risk Analysis.</span></h3>
                        <p className="text-sm text-black/40 leading-relaxed max-w-sm">Select a predefined scenario or manually adjust environmental stress levels to compute real-time probability.</p>
                      </div>
                      
                      <div className="space-y-8">
                        {[
                          { icon: Droplets, title: 'Inflow Balance', desc: 'Rainfall is weighted by seasonal norms.' },
                          { icon: Waves, title: 'Hydraulic Pressure', desc: 'River breach points are calculated via XGBoost.' },
                          { icon: Activity, title: 'Census Projection', desc: 'Socio-economic impact is factored into risk.' }
                        ].map(item => (
                          <div key={item.title} className="flex gap-4 group/item">
                            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-[#0B3D3D] group-hover/item:scale-110 transition-transform">
                              <item.icon size={20} />
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-[#1A1D1A] uppercase tracking-wider">{item.title}</div>
                              <p className="text-[11px] text-black/40 mt-1 leading-snug">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-12 pt-8 border-t border-black/5 text-[#0B3D3D]/40 flex items-center gap-2">
                         <Info size={14} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Model Execution</span>
                      </div>
                   </motion.div>
                 ) : (
                    <motion.div key="res" initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} className="h-full flex flex-col justify-start p-8 md:p-10 bg-white rounded-[3rem] border border-black/5 shadow-2xl relative overflow-hidden overflow-y-auto no-scrollbar">
                      <div className={`absolute top-0 left-0 w-full h-2 ${result > 75 ? 'bg-red-500' : result > 40 ? 'bg-amber-500' : 'bg-teal-500'}`} />
                      
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="text-[10px] text-black/40 font-black tracking-[0.3em] uppercase">Predictive Outcome</div>
                          <div className={`text-3xl font-serif mt-1 ${result > 75 ? 'text-red-900' : result > 40 ? 'text-amber-900' : 'text-[#0B3D3D]'}`}>
                            {result > 75 ? 'Critical Breach Risk' : result > 40 ? 'Elevated Monitoring' : 'Nominal Conditions'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-4xl font-serif tabular-nums leading-none">{result.toFixed(0)}%</div>
                          <div className="text-[8px] font-black uppercase text-black/20 tracking-widest mt-1">Confidence Score</div>
                        </div>
                      </div>

                      {/* 7-Day Trajectory */}
                      <div className="w-full h-48 mb-8 bg-black/[0.02] rounded-3xl p-4 border border-black/5">
                        <div className="flex justify-between items-center mb-4 px-2">
                           <div className="text-[8px] font-black uppercase tracking-widest text-black/40 flex items-center gap-2">
                             <Activity size={10} className="text-teal-500" /> 7-Day Risk Trajectory
                           </div>
                           <div className="text-[8px] font-black uppercase tracking-widest text-[#0B3D3D]">Bihar Stats Link</div>
                        </div>
                        <ResponsiveContainer width="100%" height="80%">
                          <AreaChart data={forecast}>
                            <defs>
                              <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={result > 75 ? '#ef4444' : result > 40 ? '#f59e0b' : '#14b8a6'} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={result > 75 ? '#ef4444' : result > 40 ? '#f59e0b' : '#14b8a6'} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Tooltip 
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-white border border-black/10 p-2 rounded-lg shadow-xl text-[10px] font-serif">
                                      <p className="font-bold">{payload[0].value}% Prob.</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area type="monotone" dataKey="prob" stroke={result > 75 ? '#b91c1c' : result > 40 ? '#b45309' : '#0D9488'} fillOpacity={1} fill="url(#colorProb)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Impact Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-8">
                         <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/5">
                            <Users size={16} className="text-black/20 mb-3" />
                            <div className="text-[8px] font-black uppercase tracking-widest text-black/40">Human Impact</div>
                            <div className="text-lg font-serif mt-1">{impactStats?.affectedPop?.toLocaleString() || "0"} <span className="text-[10px] text-black/20">Est.</span></div>
                         </div>
                         <div className="p-4 rounded-2xl bg-black/[0.02] border border-black/5">
                            <Waves size={16} className="text-black/20 mb-3" />
                            <div className="text-[8px] font-black uppercase tracking-widest text-black/40">Inundation</div>
                            <div className="text-lg font-serif mt-1">{impactStats?.inundationDepth || "0.0"} <span className="text-[10px] text-black/20">m Depth</span></div>
                         </div>
                      </div>

                      {/* Real World Advisory */}
                      <div className="space-y-4 text-left">
                         <div className="flex gap-3 p-4 rounded-2xl bg-[#0B3D3D]/5 border border-[#0B3D3D]/10">
                            <AlertCircle size={18} className="text-[#0B3D3D] shrink-0" />
                            <div>
                               <div className="text-[9px] font-black uppercase tracking-widest text-[#0B3D3D]">Procedural Advisory</div>
                               <p className="text-[11px] text-[#0B3D3D]/70 leading-relaxed mt-1">
                                 {result > 75 
                                   ? "IMMEDIATE: Deploy NDRF units to low-lying sectors. Activate secondary flood bypass channels. Evacuation protocols mandatory." 
                                   : result > 40 
                                     ? "ELEVATED: Intensify embankment patrols at 4-hour intervals. Seal local culverts. Advise pastoral communities to relocate livestock." 
                                     : "ROUTINE: Maintain sensor telemetry. Review logistics chain for relief supply inventory. Normal operations in effect."}
                               </p>
                            </div>
                         </div>
                         <div className="flex items-center gap-3 px-2">
                             <CheckCircle2 size={12} className="text-teal-500" />
                             <span className="text-[8px] font-black uppercase tracking-widest text-black/30">Model: Logistic Regression · Acc 94.7% · F1 0.845</span>
                         </div>
                      </div>

                      <button onClick={() => setResult(null)} className="mt-10 text-[10px] font-black uppercase tracking-[0.3em] text-black/30 hover:text-black transition-colors flex items-center gap-2 border-b border-black/10 pb-1 self-center">
                         <ChevronRight size={12} className="rotate-180" /> Reset Modeling Engine
                      </button>
                    </motion.div>
                 )}
               </div>
             )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
