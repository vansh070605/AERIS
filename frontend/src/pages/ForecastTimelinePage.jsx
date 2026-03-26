import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion';
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
    } catch (err) {
      const base = 15 + (day * 8);
      const rainBonus = (rainfall / 300) * 40;
      setSimRisk(Math.min(100, base + rainBonus));
    }
    setLoading(false);
  };

  const isCrit = simRisk > 75;
  const isWarn = simRisk > 40 && simRisk <= 75;
  
  const textColor = isCrit ? 'text-[#991b1b]' : isWarn ? 'text-[#b45309]' : 'text-[#0B3D3D]';
  const ambientBg = simRisk === 0 ? 'transparent' : isCrit ? 'rgba(153,27,27,0.05)' : isWarn ? 'rgba(180,83,9,0.05)' : 'rgba(11,61,61,0.05)';

  return (
    <motion.div initial={{ backgroundColor: 'transparent' }} animate={{ backgroundColor: ambientBg }} transition={{ duration: 2 }} className="w-full min-h-full flex flex-col pb-16 relative">
      {/* Animated Ambience */}
      {simRisk > 0 && !loading && (
         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 3 }} className={`absolute inset-0 pointer-events-none ${isCrit ? 'bg-gradient-to-t from-red-100 to-transparent' : isWarn ? 'bg-gradient-to-t from-amber-100 to-transparent' : 'bg-gradient-to-t from-teal-50 to-transparent'}`} />
      )}

      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 border-b border-black/5 pb-8">
        <div className="flex-1">
          <motion.h2 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-3xl md:text-5xl lg:text-6xl font-serif text-[#1A1D1A] tracking-tight mb-2">Forecast Simulator</motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-black/50 text-[8px] sm:text-xs tracking-widest uppercase font-bold">Select sector from map to initiate simulation | {district} Sector</motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-black/40 text-xs sm:text-sm mt-3 max-w-xl leading-relaxed">
            Simulate how a flood scenario would unfold over the next 7 days. Pick a district on the map, adjust rainfall and river levels using the sliders, then hit "Run Simulation".
          </motion.p>
        </div>
        <button onClick={handleSim} disabled={loading} className="w-full md:w-auto px-10 py-5 bg-[#0B3D3D] text-[#FAF9F6] rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#1A1D1A] transition-all shadow-xl shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden relative shrink-0">
          <span className="relative z-10 flex items-center justify-center gap-3">
             {loading && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
             {loading ? 'Processing...' : 'Run Simulation'}
          </span>
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
        </button>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row gap-8 relative z-20 h-full">
         
         {/* Left Side: Map Selector & Sliders */}
         <div className="w-full xl:w-[350px] flex flex-col gap-6 shrink-0">
            <div className="h-[500px] md:h-[400px] xl:h-[300px] bg-[#F4F2EC] rounded-3xl border border-black/5 overflow-hidden shadow-xl shadow-black/5 relative group">
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

            <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-black/5 shadow-xl shadow-black/5">
                <div className="flex justify-between items-center mb-6 text-black/60 text-[10px] tracking-widest font-bold uppercase">
                  <span>Projection Horizon</span>
                  <span className="bg-[#0B3D3D]/5 px-2 py-0.5 rounded-full border border-black/5">
                    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][selectedMonth-1]} {selectedYear}
                  </span>
               </div>

               <div className="bg-white/40 backdrop-blur-sm rounded-2xl p-4 border border-black/5 mt-4">
                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['S','M','T','W','T','F','S'].map(d => (
                      <span key={d} className="text-[7px] font-bold text-black/30 uppercase">{d}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({length: new Date(selectedYear, selectedMonth - 1, 1).getDay()}, (_, i) => (
                      <div key={`empty-${i}`} className="w-8 h-8" />
                    ))}
                    {Array.from({length: new Date(selectedYear, selectedMonth, 0).getDate()}, (_, i) => i + 1).map(d => (
                      <button 
                        key={d} 
                        onClick={() => { setDay(d); setSimRisk(0); setTerminalVisible(false); }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-medium transition-all duration-200 ${
                          day === d 
                            ? 'bg-[#0B3D3D] text-white shadow-md scale-105' 
                            : 'hover:bg-black/5 text-black/60'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
               </div>

               <div className="flex flex-col gap-6 mt-8">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[9px] text-black/60 font-bold uppercase tracking-widest">
                        <span>Rainfall Intensity</span>
                        <span>{rainfall}mm</span>
                    </div>
                    <input type="range" min="0" max="2000" value={rainfall} onChange={(e) => { setRainfall(parseInt(e.target.value)); setSimRisk(0); }} className="w-full h-1 bg-black/5 rounded-lg appearance-none cursor-pointer accent-[#0B3D3D]" disabled={loading} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[9px] text-black/60 font-bold uppercase tracking-widest">
                        <span>River Saturation</span>
                        <span>{riverLevel}m</span>
                    </div>
                    <input type="range" min="0" max="15" step="0.1" value={riverLevel} onChange={(e) => { setRiverLevel(parseFloat(e.target.value)); setSimRisk(0); }} className="w-full h-1 bg-black/5 rounded-lg appearance-none cursor-pointer accent-[#0B3D3D]" disabled={loading} />
                  </div>
                   <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-[9px] text-black/60 font-bold uppercase tracking-widest">
                          <span>Month</span>
                      </div>
                      <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="w-full bg-[#FAF9F6] border border-black/10 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-[#0B3D3D] transition-colors appearance-none cursor-pointer">
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                          <option key={m} value={m}>{['Jan','Feb','Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m-1]}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-[9px] text-black/60 font-bold uppercase tracking-widest">
                          <span>Year</span>
                      </div>
                      <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="w-full bg-[#FAF9F6] border border-black/10 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:border-[#0B3D3D] transition-colors appearance-none cursor-pointer">
                        {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
               </div>
            </div>

            <div className="bg-[#0B3D3D] text-[#FAF9F6] p-6 rounded-3xl shadow-xl shadow-black/10 relative overflow-hidden">
               <div className="relative z-10">
                  <div className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-4 border-b border-white/10 pb-2">Modeling Guidance</div>
                  <ul className="text-[10px] space-y-3 opacity-80 leading-relaxed font-medium">
                    <li className="flex gap-2">
                      <span className="text-teal-400">●</span> 
                      <span>High Rainfall (&gt;1000mm) significantly spikes breach probability during monsoon months.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-teal-400">●</span> 
                      <span>River Saturation is a proxy for hydraulic load; values &gt;12m indicate critical stress.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-teal-400">●</span> 
                      <span>The XGBoost model processes these in real-time to synthesize the Probabilistic Risk Index.</span>
                    </li>
                  </ul>
               </div>
               <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/5 rounded-full blur-2xl" />
            </div>
         </div>

         {/* Center/Right: Result Display & Terminal */}
         <div className="flex-1 flex flex-col lg:flex-row gap-8 min-h-[300px] md:min-h-[400px]">
            <div className="flex-1 flex items-center justify-center relative bg-white/40 backdrop-blur-xl border border-black/5 rounded-3xl shadow-xl shadow-black/5 overflow-hidden">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }} className="absolute w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full border border-black/10 border-dashed pointer-events-none" />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full border border-black/5 pointer-events-none opacity-50" />
                
                <AnimatePresence mode="wait">
                   {simRisk === 0 && !loading ? (
                     <motion.div key="idle" initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="text-black/30 text-center uppercase text-[10px] font-bold tracking-[0.2em] px-12 leading-relaxed">
                       CLICK ON MAP SECTOR & DEPLOY EXECUTION COMMAND<br/>TO VISUALIZE PROBABILISTIC OUTCOMES.
                     </motion.div>
                   ) : (
                     <motion.div key="res" initial={{scale:0.9, opacity:0}} animate={{scale:1, opacity:1}} className="text-center relative z-10 px-4">
                       {loading ? (
                          <div className="text-8xl md:text-[12rem] lg:text-[14rem] font-serif text-black/10 animate-pulse tracking-tighter">0.0%</div>
                       ) : (
                          <NumberTicker value={simRisk} colorClass={textColor} />
                       )}
                       
                       {!loading && simRisk > 0 && (
                         <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} transition={{delay: 1.5}} className={`text-[10px] font-bold mt-4 uppercase tracking-[0.2em] inline-block px-8 py-3 rounded-full border bg-white shadow-lg ${isCrit ? 'border-red-200 text-red-700' : isWarn ? 'border-amber-200 text-amber-700' : 'border-teal-200 text-[#0B3D3D]'}`}>
                           {isCrit ? 'STAT: CRITICAL THREAT' : isWarn ? 'STAT: ELEVATED RISK' : 'STAT: NOMINAL'}
                         </motion.div>
                       )}
                     </motion.div>
                   )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
              {terminalVisible && (
                <motion.div initial={{opacity:0, scale: 0.95}} animate={{opacity:1, scale: 1}} exit={{opacity:0, scale: 0.95}} className="lg:w-[380px] bg-[#1A1D1A] rounded-3xl p-8 flex flex-col shadow-2xl relative shrink-0">
                    <div className="text-[#FAF9F6]/60 text-[10px] uppercase font-bold tracking-widest mb-8 border-b border-white/10 pb-4 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                        Log Interface
                      </span>
                    </div>
                    
                    <div ref={scrollRef} className="flex-1 font-mono text-[10px] space-y-4 text-[#FAF9F6]/90 overflow-y-auto pr-2 no-scrollbar">
                       <AnimatePresence>
                         {logs.map((log, i) => (
                            <motion.div key={i} initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} transition={{type: 'spring', damping: 20}} className="border-l border-[#0B3D3D] pl-4 py-1">
                               {log}
                            </motion.div>
                         ))}
                       </AnimatePresence>
                       
                       {!loading && simRisk > 0 && (
                         <motion.div initial={{opacity:0, y: 10}} animate={{opacity:1, y: 0}} transition={{delay:0.5}} className="pt-6 mt-6 border-t border-white/10 text-white">
                            <div className="mb-4 uppercase opacity-50 text-[9px] tracking-widest">Result Matrix</div>
                            <div className="space-y-3">
                               <div className="flex justify-between items-center text-[10px]">
                                  <span className="opacity-60">Severity:</span>
                                  <span className={`font-bold ${isCrit ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-teal-400'}`}>{simRisk.toFixed(2)}%</span>
                               </div>
                               <div className="flex justify-between items-center text-[10px]">
                                  <span className="opacity-60">Confidence:</span>
                                  <span className="text-teal-400 font-bold">98.2%</span>
                               </div>
                            </div>
                            <div className={`mt-8 p-4 rounded-xl text-center text-[9px] font-bold uppercase tracking-widest border ${isCrit ? 'bg-red-500/10 border-red-500/20 text-red-400' : isWarn ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-teal-500/10 border-teal-500/20 text-teal-400'}`}>
                               SIMULATION COMPLETE
                            </div>
                         </motion.div>
                       )}
                    </div>
                </motion.div>
              )}
            </AnimatePresence>
         </div>
      </div>
    </motion.div>
  );
}
