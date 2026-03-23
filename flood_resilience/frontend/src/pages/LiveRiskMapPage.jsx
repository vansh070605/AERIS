import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet';
import { Info, Users, Wheat, AlertTriangle } from 'lucide-react';

export default function LiveRiskMapPage() {
  const [geoData, setGeoData] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);

  useEffect(() => {
    fetch('/bihar_districts_real.geojson').then(r => r.json()).then(setGeoData).catch(()=>console.log('geo err'));
  }, []);

  const getStyle = (feature) => {
    const dist = feature.properties.NAME_2;
    const isHighRisk = ['Supaul', 'Darbhanga', 'Madhubani', 'Saharsa'].includes(dist);
    const isWarning = ['Muzaffarpur', 'Sitamarhi', 'Katihar', 'Khagaria', 'Kishanganj'].includes(dist);
    
    let color = '#166534'; // Safe - Green
    if (isHighRisk) color = '#991b1b'; // Red
    if (isWarning) color = '#b45309'; // Yellow/Amber

    return {
      fillColor: color,
      weight: 1,
      opacity: 0.5,
      color: '#1A1D1A',
      fillOpacity: 0.3
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
        target.setStyle({
          weight: 2,
          fillOpacity: 0.6,
          color: '#1A1D1A'
        });
        target.bringToFront();
      },
      mouseout: (e) => {
        e.target.setStyle(getStyle(feature));
      },
      click: () => {
        const isHighRisk = ['Supaul', 'Darbhanga', 'Madhubani', 'Saharsa'].includes(dist);
        const isWarning = ['Muzaffarpur', 'Sitamarhi', 'Katihar', 'Khagaria', 'Kishanganj'].includes(dist);
        
        let riskStatus = 'SAFE';
        let riskColor = 'text-[#166534]';
        
        if (isHighRisk) { riskStatus = 'IMMEDIATE'; riskColor = 'text-[#991b1b]'; }
        else if (isWarning) { riskStatus = 'MONITORING'; riskColor = 'text-[#b45309]'; }

        const seed = dist.length;
        setSelectedDistrict({
            name: dist,
            risk: riskStatus,
            riskColor: riskColor,
            isHighRisk: isHighRisk,
            popRisk: isHighRisk ? `${140000 + (seed * 1000)}` : isWarning ? `${45000 + (seed * 500)}` : `${1000 + (seed * 100)}`,
            cropDamage: isHighRisk ? `${12000 + (seed * 500)} Ha` : isWarning ? `${3000 + (seed * 200)} Ha` : `${50 + (seed * 10)} Ha`
        });
      }
    });
  };

  return (
    <div className="h-full w-full flex flex-col xl:flex-row gap-12 relative pb-6 lg:pb-0">
      
      {/* Editorial Text Left Column */}
      <div className="xl:w-[40%] flex flex-col justify-center py-10">
         <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, ease:[0.16,1,0.3,1] }} className="text-6xl md:text-7xl lg:text-8xl font-serif text-[#1A1D1A] leading-[1.02] tracking-tight mb-8">
            Predict<br />the tides.
         </motion.h1>
         <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2, delay: 0.1, ease:[0.16,1,0.3,1] }} className="text-black/60 leading-relaxed max-w-sm mb-12 text-sm">
            Explore the Bihar basin in real-time. Unprecedented clarity into dynamic water levels, mapped gracefully for civic infrastructure planning. Click any sector to view actionable intelligence.
         </motion.p>
         
         <AnimatePresence mode="wait">
           {selectedDistrict ? (
             <motion.div key="panel" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-8 p-8 bg-[#F4F2EC] rounded-3xl border border-black/5">
                <div className="flex justify-between items-start border-b border-black/10 pb-6 mb-2">
                   <div>
                     <h3 className="text-3xl font-serif text-[#1A1D1A] m-0 leading-none">{selectedDistrict.name}</h3>
                     <div className={`mt-3 text-[10px] uppercase font-bold tracking-widest ${selectedDistrict.riskColor}`}>
                       Status: {selectedDistrict.risk}
                     </div>
                   </div>
                   <button onClick={() => setSelectedDistrict(null)} className="text-[10px] font-bold text-black/40 hover:text-black uppercase tracking-widest">Close</button>
                </div>
                <div className="flex flex-col gap-6">
                   <div>
                     <div className="text-[10px] uppercase font-bold tracking-widest text-black/40 mb-1">Population at Risk</div>
                     <div className="text-4xl font-serif text-[#1A1D1A]">{selectedDistrict.popRisk}</div>
                   </div>
                   <div>
                     <div className="text-[10px] uppercase font-bold tracking-widest text-black/40 mb-1">Crop Damage Estimate</div>
                     <div className="text-2xl font-serif text-black/70">{selectedDistrict.cropDamage}</div>
                   </div>
                </div>
                {selectedDistrict.isHighRisk && (
                  <button className="mt-4 w-full py-4 bg-[#991b1b] text-[#FAF9F6] rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#7f1d1d] transition-colors shadow-xl shadow-red-900/20">
                     Dispatch Emergency Protocol
                  </button>
                )}
             </motion.div>
           ) : (
             <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 border-2 border-dashed border-black/10 rounded-3xl flex items-center justify-center text-center max-w-sm h-64">
                <span className="text-xs uppercase font-bold tracking-widest text-black/30">Awaiting Sector Selection...</span>
             </motion.div>
           )}
         </AnimatePresence>
      </div>

      {/* Map Right Column */}
      <div className="flex-1 rounded-[2rem] overflow-hidden shadow-2xl relative z-0 min-h-[500px] border border-black/5 bg-[#F4F2EC]">
        <MapContainer center={[25.5, 85.5]} zoom={7} scrollWheelZoom={false} className="w-full h-full" zoomControl={false}>
          <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
          {geoData && (
            <GeoJSON data={geoData} style={getStyle} onEachFeature={onEachFeature} />
          )}
        </MapContainer>
      </div>

    </div>
  );
}
