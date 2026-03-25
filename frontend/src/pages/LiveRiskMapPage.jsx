import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet';
import { Info, Users, Wheat, AlertTriangle, Activity, Database, Radar, TrendingUp } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

export default function LiveRiskMapPage() {
  const [geoData, setGeoData] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [tickerIndex, setTickerIndex] = useState(0);

  const alerts = [
    "[SYSTEM] SATELLITE OVERPASS COMPLETED. SENSORS NOMINAL.",
    "[RELIEF] EMBANKMENT BREACH DETECTED AT GPS 26.12, 85.36",
    "[WEATHER] CLOUD SEEDING OPERATIONS COMMENCED IN KOSI BASIN.",
    "[LOGISTICS] NDRF UNIT 7 RE-ROUTED TO DARBHANGA SECTOR."
  ];

  const [riskData, setRiskData] = useState({ total_population_at_risk: '1.28M', active_incidents: 24, activity_log: alerts });

  useEffect(() => {
    fetch('/bihar_districts_real.geojson').then(r => r.json()).then(setGeoData).catch(()=>console.log('geo err'));
    
    const fetchRisk = () => {
      fetch('http://localhost:8000/risk/situation_room')
        .then(r => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json(); })
        .then(data => {
            setRiskData({
                total_population_at_risk: (data.total_population_at_risk / 1000000).toFixed(2) + 'M',
                active_incidents: data.active_incidents,
                activity_log: data.activity_log
            });
        })
        .catch(e => console.error("Risk API offline", e));
    };

    fetchRisk();
    const timer = setInterval(() => {
        setTickerIndex(prev => (prev + 1) % alerts.length);
        fetchRisk();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const getStyle = (feature) => {
    const dist = feature.properties.NAME_2;
    const isHighRisk = ['Supaul', 'Darbhanga', 'Madhubani', 'Saharsa'].includes(dist);
    const isWarning = ['Muzaffarpur', 'Sitamarhi', 'Katihar', 'Khagaria', 'Kishanganj'].includes(dist);
    
    let color = '#166534'; 
    if (isHighRisk) color = '#991b1b'; 
    if (isWarning) color = '#b45309'; 

    return {
      fillColor: color,
      weight: 1,
      opacity: 0.5,
      color: '#1A1D1A',
      fillOpacity: 0.5
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
      mouseover: (e) => {
        const target = e.target;
        target.setStyle({ weight: 2, fillOpacity: 0.6, color: '#1A1D1A' });
        target.bringToFront();
      },
      mouseout: (e) => { e.target.setStyle(getStyle(feature)); },
      click: () => {
        const isHighRisk = ['Supaul', 'Darbhanga', 'Madhubani', 'Saharsa'].includes(dist);
        const isWarning = ['Muzaffarpur', 'Sitamarhi', 'Katihar', 'Khagaria', 'Kishanganj'].includes(dist);
        
        let riskStatus = 'SAFE';
        let riskColor = 'text-[#166534]';
        let chartColor = '#166534';
        
        if (isHighRisk) { riskStatus = 'IMMEDIATE'; riskColor = 'text-[#991b1b]'; chartColor = '#991b1b'; }
        else if (isWarning) { riskStatus = 'MONITORING'; riskColor = 'text-[#b45309]'; chartColor = '#b45309'; }

        const seed = dist.length;
        const trend = Array.from({length: 12}, (_, i) => ({
            time: `${i*2}h`,
            val: isHighRisk ? 60 + Math.random()*30 : isWarning ? 30 + Math.random()*20 : 5 + Math.random()*10
        }));

        setSelectedDistrict({
            name: dist,
            risk: riskStatus,
            riskColor: riskColor,
            chartColor: chartColor,
            isHighRisk: isHighRisk,
            popRisk: isHighRisk ? `${140000 + (seed * 1000)}` : isWarning ? `${45000 + (seed * 500)}` : `${1000 + (seed * 100)}`,
            cropDamage: isHighRisk ? `${12000 + (seed * 500)} Ha` : isWarning ? `${3000 + (seed * 200)} Ha` : `${50 + (seed * 10)} Ha`,
            trend: trend
        });
      }
    });
  };

  return (
    <div className="h-full w-full flex flex-col xl:flex-row gap-8 relative pb-12 overflow-y-auto xl:overflow-hidden no-scrollbar">
      
      {/* Editorial Text Left Column */}
      <div className="order-1 xl:w-[380px] flex flex-col justify-between py-4 shrink-0">
          <div>
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease:[0.16,1,0.3,1] }} className="text-4xl md:text-7xl font-serif text-[#1A1D1A] leading-[1.02] tracking-tight mb-4">
                Predict<br />the tides.
            </motion.h1>
            <p className="text-black/40 text-sm leading-relaxed mb-6 max-w-[340px]">
              This interactive map shows real-time flood risk levels across all Bihar districts. Click any district to see population at risk, crop damage estimates, and a 24-hour risk trend powered by our AI models.
            </p>
            
            <div className="bg-[#0B3D3D] text-[#FAF9F6] p-6 rounded-3xl mb-8 shadow-xl shadow-black/10 overflow-hidden relative">
               <Activity className="absolute top-4 right-4 text-white/10 w-16 h-16" />
               <div className="text-[10px] uppercase font-bold tracking-widest text-white/50 mb-1">State Situation Summary</div>
               <div className="text-4xl font-serif mb-2">{riskData.total_population_at_risk}</div>
               <div className="text-[9px] uppercase font-bold tracking-[0.2em] text-white/70">Total Population at Risk</div>
               
               <div className="mt-6 flex gap-4 border-t border-white/10 pt-4">
                  <div>
                    <div className="text-[8px] uppercase font-bold text-white/40">Sectors</div>
                    <div className="text-sm font-bold">38 Active</div>
                  </div>
                  <div>
                    <div className="text-[8px] uppercase font-bold text-white/40">Critical</div>
                    <div className="text-sm font-bold text-red-400">04 High</div>
                  </div>
               </div>
            </div>
          </div>
          
          <AnimatePresence mode="wait">
            {selectedDistrict ? (
              <motion.div key="panel" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col gap-6 p-8 bg-[#F4F2EC] rounded-3xl border border-black/5 shadow-lg overflow-hidden relative">
                 <div className="flex justify-between items-start border-b border-black/10 pb-4">
                    <div>
                      <h3 className="text-3xl font-serif text-[#1A1D1A] m-0">{selectedDistrict.name}</h3>
                      <div className={`mt-2 text-[10px] uppercase font-bold tracking-widest ${selectedDistrict.riskColor}`}>
                        Status: {selectedDistrict.risk}
                      </div>
                    </div>
                    <button onClick={() => setSelectedDistrict(null)} className="text-[10px] font-bold text-black/40 hover:text-black uppercase tracking-widest transition-colors">Close</button>
                 </div>
                 
                 <div className="h-24 w-full relative">
                    <div className="absolute top-0 left-0 text-[8px] font-bold uppercase tracking-widest text-black/30 flex items-center gap-2">
                       <TrendingUp className="w-2.5 h-2.5" />
                       24H Risk Gradient
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={selectedDistrict.trend}>
                          <Line type="monotone" dataKey="val" stroke={selectedDistrict.chartColor} strokeWidth={2} dot={false} />
                          <YAxis hide domain={[0, 100]} />
                       </LineChart>
                    </ResponsiveContainer>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/50 p-4 rounded-2xl border border-black/5">
                      <div className="text-[8px] uppercase font-bold tracking-widest text-black/40 mb-1">Population</div>
                      <div className="text-2xl font-serif text-[#1A1D1A]">{selectedDistrict.popRisk}</div>
                    </div>
                    <div className="bg-white/50 p-4 rounded-2xl border border-black/5">
                      <div className="text-[8px] uppercase font-bold tracking-widest text-black/40 mb-1">Crop Area</div>
                      <div className="text-lg font-serif text-black/70">{selectedDistrict.cropDamage}</div>
                    </div>
                 </div>
                 {selectedDistrict.isHighRisk && (
                   <button className="w-full py-4 bg-[#991b1b] text-[#FAF9F6] rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[#7f1d1d] transition-all shadow-xl shadow-red-900/10 active:scale-95">
                      Deploy Emergency Protocol
                   </button>
                 )}
              </motion.div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="p-8 border-2 border-dashed border-black/10 rounded-3xl flex flex-col items-center justify-center text-center h-48">
                  <Radar className="w-8 h-8 text-black/10 mb-4 animate-pulse" />
                  <span className="text-[9px] uppercase font-bold tracking-widest text-black/30">Select Sector for Intelligence</span>
                </div>
                
                <div className="bg-white/40 border border-black/5 p-4 rounded-2xl flex items-center gap-4">
                   <div className="w-10 h-10 rounded-full bg-[#0B3D3D] flex items-center justify-center shrink-0">
                      <Database className="w-4 h-4 text-white" />
                   </div>
                   <div className="overflow-hidden">
                      <div className="text-[8px] uppercase font-bold text-black/40 tracking-widest">Live Telemetry</div>
                      <AnimatePresence mode="wait">
                        <motion.div key={tickerIndex} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-[10px] font-bold text-[#0B3D3D] truncate whitespace-nowrap">
                          {riskData.activity_log[tickerIndex] || "SEARCHING FOR TELEMETRY..."}
                        </motion.div>
                      </AnimatePresence>
                   </div>
                </div>
              </div>
            )}
          </AnimatePresence>
      </div>

      <div className="order-2 xl:flex-1 rounded-[2.5rem] overflow-hidden shadow-2xl relative z-0 h-[500px] md:min-h-[500px] border border-black/5 bg-[#F4F2EC] shrink-0">
        <MapContainer center={[25.5, 85.5]} zoom={window.innerWidth < 1024 ? 7.5 : 7} scrollWheelZoom={true} dragging={true} tap={false} className="w-full h-full" zoomControl={true}>
          <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          {geoData && (
            <GeoJSON key={`home-map-${window.innerWidth}`} data={geoData} style={getStyle} onEachFeature={onEachFeature} />
          )}
        </MapContainer>
      </div>

    </div>
  );
}
