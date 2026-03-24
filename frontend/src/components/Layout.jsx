import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Activity, BookOpen, ShieldAlert, Radio, Settings } from 'lucide-react';

const alertMessages = [
  "[OFFICIALS] Evacuate 15,000 from Madhubani NOW",
  "[RELIEF] Embankment breach detected at GPS 26.12, 85.36",
  "[FARMERS] Harvest early in Kosi basin ΓÇö 3 days to major flood pulse",
  "[SYSTEM] Telemetry nominal across Southern sectors"
];

export default function Layout() {
  const location = useLocation();
  const [alertIdx, setAlertIdx] = useState(0);

  useEffect(() => {
    const int = setInterval(() => setAlertIdx(i => (i + 1) % alertMessages.length), 6000);
    return () => clearInterval(int);
  }, []);

  const currentAlert = alertMessages[alertIdx];
  const isCritical = currentAlert.includes("NOW") || currentAlert.includes("breach");

  return (
    <div className="flex flex-col h-screen w-screen bg-[#FAF9F6] text-[#1A1D1A] overflow-hidden font-sans selection:bg-[#0B3D3D] selection:text-[#FAF9F6]">
      {/* Top Navigation */}
      <nav className="w-full bg-[#FAF9F6] border-b border-[#1A1D1A]/10 flex items-center justify-between px-8 h-20 shrink-0 z-50 overflow-x-auto">
        <div className="flex items-center gap-6 lg:gap-12 min-w-max">
          <h1 className="text-3xl font-serif tracking-tight text-[#1A1D1A]">AERIS.</h1>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <NavLink to="/" className={({isActive}) => `flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive ? 'bg-[#0B3D3D] text-[#FAF9F6] shadow-md shadow-[#0B3D3D]/20' : 'text-black/60 hover:bg-black/5 hover:text-[#1A1D1A]'}`}>
              <Map size={16} /> The Map
            </NavLink>
            <NavLink to="/forecast" className={({isActive}) => `flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive ? 'bg-[#0B3D3D] text-[#FAF9F6] shadow-md shadow-[#0B3D3D]/20' : 'text-black/60 hover:bg-black/5 hover:text-[#1A1D1A]'}`}>
              <Activity size={16} /> Forecast Simulator
            </NavLink>
            <NavLink to="/predictor" className={({isActive}) => `flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive ? 'bg-[#0B3D3D] text-[#FAF9F6] shadow-md shadow-[#0B3D3D]/20' : 'text-black/60 hover:bg-black/5 hover:text-[#1A1D1A]'}`}>
              <Settings size={16} /> Telemetry Input
            </NavLink>
            <div className="w-px h-6 bg-black/10 mx-1 sm:mx-2" />
            <NavLink to="/post-learning" className={({isActive}) => `flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive ? 'bg-[#0B3D3D] text-[#FAF9F6] shadow-md shadow-[#0B3D3D]/20' : 'text-black/60 hover:bg-black/5 hover:text-[#1A1D1A]'}`}>
              <BookOpen size={16} /> Post-Mortem
            </NavLink>
            <NavLink to="/scorecard" className={({isActive}) => `flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive ? 'bg-[#0B3D3D] text-[#FAF9F6] shadow-md shadow-[#0B3D3D]/20' : 'text-black/60 hover:bg-black/5 hover:text-[#1A1D1A]'}`}>
              <ShieldAlert size={16} /> Scorecard
            </NavLink>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-[#0B3D3D]">
          Global Live Feed Active
        </div>
      </nav>

      {/* Active Action Banner */}
      <div className={`h-10 shrink-0 border-b flex items-center justify-between px-8 z-40 transition-colors duration-500 ${isCritical ? 'bg-red-50 border-red-900/10' : 'bg-white/50 border-[#1A1D1A]/10'}`}>
        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          <Radio size={14} className={isCritical ? 'text-red-600 animate-pulse' : 'text-[#0B3D3D]'} />
          <AnimatePresence mode="popLayout">
            <motion.div 
               key={alertIdx}
               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
               className={`text-[10px] font-bold tracking-widest uppercase truncate ${isCritical ? 'text-red-700' : 'text-black/60'}`}
            >
              {currentAlert}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-x-hidden overflow-y-auto px-12 py-10 bg-[#FAF9F6]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full max-w-[1400px] mx-auto"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
