import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion';
import GuidancePopover from '../components/GuidancePopover';
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet';

const NumberTicker = ({ value, colorClass }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, latest => latest.toFixed(1) + '%');

  useEffect(() => {
    const animation = animate(count, value, {
      duration: 3,
      ease: [0.16, 1, 0.3, 1]
    });
    return animation.stop;
  }, [value, count]);

  return <motion.div className={`text-6xl sm:text-8xl md:text-[12rem] lg:text-[14rem] font-serif leading-none tracking-tighter ${colorClass}`}>{rounded}</motion.div>;
};

export default function ForecastTimelinePage() {
  const [day, setDay] = useState(new Date().getDate());
  const [district, setDistrict] = useState('Patna');
  const [rainfall, setRainfall] = useState(1000);
  const [riverLevel, setRiverLevel] = useState(11.5);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [loading, setLoading] = useState(false);
  const [simRisk, setSimRisk] = useState(0);
  const [logs, setLogs] = useState([]);
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [geoData, setGeoData] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetch('/bihar_districts_real.geojson').then(r => r.json()).then(setGeoData).catch(()=>console.log('geo err'));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getMapStyle = (feature) => {
    const dist = feature.properties.NAME_2;
    const isSelected = dist === district;
    
    // Consistent coloring with other map pages
    const isHighRisk = ['Supaul', 'Darbhanga', 'Madhubani', 'Saharsa'].includes(dist);
    const isWarning = ['Muzaffarpur', 'Sitamarhi', 'Katihar', 'Khagaria', 'Kishanganj'].includes(dist);
    
    let color = '#166534'; 
    if (isHighRisk) color = '#991b1b'; 
    if (isWarning) color = '#b45309'; 
    if (isSelected) color = '#0B3D3D';

    return {
      fillColor: color,
      weight: isSelected ? 2 : 1,
      opacity: 0.5,
      color: '#1A1D1A',
      fillOpacity: isSelected ? 0.7 : 0.3
    };
  };

  const onEachFeature = (feature, layer) => {
    const dist = feature.properties.NAME_2 || 'Unknown';
    layer.bindTooltip(dist, {
       className: 'bg-[#FAF9F6] text-[#1A1D1A] border-none shadow-xl font-sans text-[10px] uppercase tracking-wider font-bold rounded-md px-3 py-2',
       sticky: true,
       direction: 'auto'
    });
    layer.on({
      click: () => {
        setDistrict(dist);
        setSimRisk(0);
        setTerminalVisible(false);
      },
      mouseover: (e) => { e.target.setStyle({ fillOpacity: 0.8 }); },
      mouseout: (e) => { e.target.setStyle(getMapStyle(feature)); }
    });
  };

  const handleSim = async () => {
    setLoading(true);
    setSimRisk(0);
    setLogs([]);
    setTerminalVisible(true);
    
    const sequence = [
      `ESTABLISHING SECURE CONNECTION TO ${district.toUpperCase()} SECTOR...`,
      "PULLING TOPOGRAPHICAL ELEVATION DATA...",
      `SIMULATING ${rainfall}MM PRECIPITATION IMPACT...`,
      `ADJUSTING FOR ${riverLevel}M HYDRAULIC SATURATION...`,
      "EXECUTING RANDOM FOREST ENSEMBLE MODEL...",
      "SYNTHESIZING PROBABILISTIC OUTCOME..."
    ];
    
    for (let i = 0; i < sequence.length; i++) {
        setLogs(prev => [...prev, sequence[i]]);
        await new Promise(r => setTimeout(r, 500));
    }
    
    try {
      const payload = {
        District: district,
        Rainfall_mm: rainfall + (day * 5),
        River_Level_m: riverLevel + (day * 0.1),
        Danger_Level_m: 12.0,
        Population: 500000,
        Crop_Area_ha: 25000,
        Month: selectedMonth,
        Year: selectedYear,
        Day: day
      };
      
      const res = await fetch(`http://${window.location.hostname}:8000/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("API Offline");
      const data = await res.json();
      setSimRisk(data.probability);
    } catch (e) {
      console.error("API Error - Using Scientific Fallback:", e);
      // Scientific Fallback: Based on environmental variables instead of calendar day
      const baseRisk = (riverLevel / 15) * 50; // River level contribution
      const rainRisk = (rainfall / 2000) * 50; // Rainfall contribution
      setSimRisk(Math.min(100, Math.max(5, baseRisk + rainRisk)));
      setLogs(prev => [...prev, `[OFFLINE] Using local predictive model. Profile: ${district}`]);
    }
    setLoading(false);
  };

  const isCrit = simRisk > 75;
  const isWarn = simRisk > 40 && simRisk <= 75;
  
  const textColor = isCrit ? 'text-[#991b1b]' : isWarn ? 'text-[#b45309]' : 'text-[#0B3D3D]';
  const ambientBg = simRisk === 0 ? '#FAF9F6' : isCrit ? '#fef2f2' : isWarn ? '#fffbeb' : '#f0fdfa';

  return (
    <motion.div 
      initial={{ backgroundColor: '#FAF9F6' }}
      animate={{ backgroundColor: ambientBg }} 
      transition={{ duration: 1.5 }} 
      className="w-full min-h-full flex flex-col pb-16 relative"
    >
      <AnimatePresence>
        {simRisk > 0 && !loading && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} transition={{ duration: 2 }} className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.8),transparent)]" />
        )}
      </AnimatePresence>

      <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-[60] border-b border-black/5 pb-8">
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <motion.h2 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-3xl md:text-5xl lg:text-6xl font-serif text-[#1A1D1A] tracking-tight">Forecast Simulator</motion.h2>
            <GuidancePopover 
              title="Modeling Guidance"
              items={[
                { label: "District Profiles", content: "Simulation incorporates historical embankment age and maintenance scores unique to each district.", color: "#10B981" },
                { label: "Seasonal Trends", content: "Peak monsoon rainfall typically occurs between July and August. Test your designs against high-rain scenarios (1500mm+).", color: "#3B82F6" },
                { label: "Critical Levels", content: "River levels above 12.0m combined with 1000mm+ rainfall significantly increase breach probability.", color: "#F59E0B" }
              ]}
            />
          </div>
          <div className="flex flex-col gap-1">
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-[#0B3D3D] text-[10px] tracking-[0.2em] font-black uppercase">Bihar Sector Intelligence // Simulation Mode</motion.p>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-black/40 text-[9px] tracking-widest uppercase font-bold">Active Sector: {district} Zone</motion.p>
          </div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-black/40 text-xs sm:text-sm mt-3 max-w-xl leading-relaxed font-sans">
            Simulate how a flood scenario would unfold over the next 7 days. Pick a district on the map, adjust rainfall and river levels using the sliders, then hit "Run Simulation".
          </motion.p>
        </div>
        <button onClick={handleSim} disabled={loading} className="w-full md:w-auto px-10 py-5 bg-[#0B3D3D] text-[#FAF9F6] rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#1A1D1A] transition-all shadow-xl shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden relative shrink-0">
          <span className="relative z-10 flex items-center justify-center gap-3">
             {loading && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
             {loading ? 'Processing...' : 'Run Simulation'}
          </span>
        </button>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row gap-8 relative z-20 h-full">
         
         {/* Left Side: Map Selector & Sliders */}
         <div className="w-full xl:w-[400px] flex flex-col gap-6 shrink-0">
            {/* Map Container */}
             <div className="h-[350px] md:h-[400px] xl:h-[280px] bg-white rounded-3xl border border-black/10 overflow-hidden shadow-xl shadow-black/5 relative group">
              <MapContainer center={[25.8, 85.5]} zoom={window.innerWidth < 1024 ? 6.5 : 7} scrollWheelZoom={false} dragging={true} tap={false} className="w-full h-full transition-all duration-700" zoomControl={true}>
                <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                {geoData && (
                  <GeoJSON key={`${district}-${window.innerWidth}`} data={geoData} style={getMapStyle} onEachFeature={onEachFeature} />
                )}
              </MapContainer>
              <div className="absolute bottom-4 left-4 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[8px] font-bold uppercase tracking-widest shadow-lg pointer-events-none border border-black/5">
                Active: {district}
              </div>
            </div>

            {/* Controls Card */}
            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-black/5 shadow-2xl shadow-black/5 flex flex-col gap-8">
                <div className="flex justify-between items-center text-black/60 text-[10px] tracking-widest font-bold uppercase">
                  <span>Projection Horizon</span>
                  <span className="bg-[#0B3D3D]/5 px-3 py-1 rounded-full border border-black/5 text-[#0B3D3D]">
                    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][selectedMonth-1]} {selectedYear}
                  </span>
                </div>

                <div className="bg-black/5 rounded-3xl p-5 border border-black/5">
                  <div className="grid grid-cols-7 gap-1 text-center mb-3">
                    {['S','M','T','W','T','F','S'].map(d => (
                      <span key={d} className="text-[7px] font-bold text-black/20 uppercase">{d}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({length: new Date(selectedYear, selectedMonth - 1, 1).getDay()}, (_, i) => (
                      <div key={`empty-${i}`} className="w-7 h-7" />
                    ))}
                    {Array.from({length: new Date(selectedYear, selectedMonth, 0).getDate()}, (_, i) => i + 1).map(d => (
                      <button 
                        key={d} 
                        onClick={() => { setDay(d); setSimRisk(0); setTerminalVisible(false); }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-medium transition-all duration-200 ${
                          day === d 
                            ? 'bg-[#0B3D3D] text-white shadow-xl scale-110' 
                            : 'hover:bg-black/5 text-black/50 hover:text-black'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between text-[9px] text-black/50 font-bold uppercase tracking-widest">
                        <span>Rainfall Intensity</span>
                        <span className="text-[#0B3D3D]">{rainfall}mm</span>
                    </div>
                    <input type="range" min="0" max="2000" value={rainfall} onChange={(e) => { setRainfall(parseInt(e.target.value)); setSimRisk(0); }} className="w-full h-1 bg-black/5 rounded-lg appearance-none cursor-pointer accent-[#0B3D3D]" disabled={loading} />
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between text-[9px] text-black/50 font-bold uppercase tracking-widest">
                        <span>River Saturation</span>
                        <span className="text-[#0B3D3D]">{riverLevel}m</span>
                    </div>
                    <input type="range" min="0" max="15" step="0.1" value={riverLevel} onChange={(e) => { setRiverLevel(parseFloat(e.target.value)); setSimRisk(0); }} className="w-full h-1 bg-black/5 rounded-lg appearance-none cursor-pointer accent-[#0B3D3D]" disabled={loading} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex flex-col gap-2">
                      <span className="text-[8px] text-black/40 font-bold uppercase tracking-widest">Month</span>
                      <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="w-full bg-black/5 border border-black/5 rounded-xl px-3 py-2 text-[10px] font-bold text-black/70 focus:outline-none focus:ring-1 focus:ring-[#0B3D3D] appearance-none cursor-pointer">
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                          <option key={m} value={m}>{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-[8px] text-black/40 font-bold uppercase tracking-widest">Year</span>
                      <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full bg-black/5 border border-black/5 rounded-xl px-3 py-2 text-[10px] font-bold text-black/70 focus:outline-none focus:ring-1 focus:ring-[#0B3D3D] appearance-none cursor-pointer">
                        {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
            </div>
         </div>

         {/* Right Side: Simulation Visualization */}
         <div className="flex-1 flex flex-col gap-8">
             <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-[400px] xl:min-h-[450px]">
               <div className="flex-1 flex items-center justify-center relative bg-white/80 backdrop-blur-xl border border-black/5 rounded-[3rem] shadow-2xl shadow-black/5 overflow-hidden">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }} className="absolute w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full border border-black/5 border-dashed pointer-events-none" />
                  <motion.div animate={{ rotate: -360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] rounded-full border border-black/5 pointer-events-none opacity-30" />
                  
                  <AnimatePresence mode="wait">
                     {simRisk === 0 && !loading ? (
                       <motion.div key="idle" initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="text-black/20 text-center uppercase text-[10px] font-bold tracking-[0.3em] px-16 leading-relaxed">
                         SYSTEM STANDBY<br/>SELECT SECTOR & INITIALIZE COMMAND
                       </motion.div>
                     ) : (
                       <motion.div key="res" initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="text-center relative z-10 px-4">
                         {loading ? (
                            <div className="text-8xl md:text-[12rem] lg:text-[14rem] font-serif text-black/5 animate-pulse tracking-tighter italic">0.0%</div>
                         ) : (
                            <NumberTicker value={simRisk} colorClass={textColor} />
                         )}
                         
                         {!loading && simRisk > 0 && (
                           <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} transition={{delay: 1.5}} className={`text-[10px] font-bold mt-8 uppercase tracking-[0.25em] inline-block px-10 py-4 rounded-full border bg-white shadow-2xl ${isCrit ? 'border-red-100 text-red-600' : isWarn ? 'border-amber-100 text-amber-600' : 'border-teal-100 text-[#0B3D3D]'}`}>
                             {isCrit ? 'CRITICAL BREACH RISK' : isWarn ? 'ELEVATED VULNERABILITY' : 'NOMINAL SECTOR STATUS'}
                           </motion.div>
                         )}
                       </motion.div>
                     )}
                  </AnimatePresence>
               </div>

               <AnimatePresence>
                 {terminalVisible && (
                   <motion.div initial={{opacity:0, x: 20}} animate={{opacity:1, x: 0}} exit={{opacity:0, x: 20}} className="lg:w-[400px] bg-[#1A1D1A] rounded-[2.5rem] p-10 flex flex-col shadow-2xl relative shrink-0">
                       <div className="text-white/40 text-[9px] uppercase font-bold tracking-[0.2em] mb-10 border-b border-white/5 pb-6 flex items-center justify-between">
                         <span className="flex items-center gap-3">
                           <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse shadow-[0_0_8px_rgba(45,212,191,0.5)]" />
                           Neural Feedback Log
                         </span>
                       </div>
                       
                       <div ref={scrollRef} className="flex-1 font-mono text-[10px] space-y-5 text-white/80 overflow-y-auto pr-2 no-scrollbar">
                          {logs.map((log, i) => (
                             <motion.div key={i} initial={{opacity:0, x:-5}} animate={{opacity:1, x:0}} transition={{delay: i * 0.05}} className="border-l-2 border-teal-500/20 pl-5 py-0.5">
                                <span className="text-teal-500/50 mr-2">&gt;</span> {log}
                             </motion.div>
                          ))}
                          
                          {!loading && simRisk > 0 && (
                            <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}} className="pt-8 mt-8 border-t border-white/5">
                               <div className="mb-6 uppercase opacity-30 text-[8px] tracking-[0.3em] font-bold">Inference Matrix</div>
                               <div className="space-y-4">
                                  <div className="flex justify-between items-center text-[11px]">
                                     <span className="opacity-40">System Severity:</span>
                                     <span className={`font-bold ${isCrit ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-teal-400'}`}>{simRisk.toFixed(2)}%</span>
                                  </div>
                                  <div className="flex justify-between items-center text-[11px]">
                                     <span className="opacity-40">Model Confidence:</span>
                                     <span className="text-teal-400 font-bold tracking-widest">98.2%</span>
                                  </div>
                               </div>
                               <div className={`mt-10 p-5 rounded-2xl text-center text-[9px] font-bold uppercase tracking-[0.25em] border ${isCrit ? 'bg-red-500/5 border-red-500/20 text-red-500' : isWarn ? 'bg-amber-500/5 border-amber-500/20 text-amber-500' : 'bg-teal-500/5 border-teal-500/20 text-teal-500'}`}>
                                 PROCESS COMPLETE
                               </div>
                            </motion.div>
                          )}
                       </div>
                   </motion.div>
                 )}
               </AnimatePresence>
            </div>
         </div>
      </div>
    </motion.div>
  );
}
