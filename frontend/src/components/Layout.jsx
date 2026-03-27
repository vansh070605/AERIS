import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, Activity, BookOpen, ShieldAlert, Radio, Settings, Menu, X, Smartphone } from 'lucide-react';
import MobileConnect from './MobileConnect';

const alertMessages = [
  "[OFFICIALS] Evacuate 15,000 from Madhubani NOW",
  "[RELIEF] Embankment breach detected at GPS 26.12, 85.36",
  "[FARMERS] Harvest early in Kosi basin ΓÇö 3 days to major flood pulse",
  "[SYSTEM] Telemetry nominal across Southern sectors"
];

export default function Layout() {
  const location = useLocation();
  const [alertIdx, setAlertIdx] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const int = setInterval(() => setAlertIdx(i => (i + 1) % alertMessages.length), 6000);
    return () => clearInterval(int);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const currentAlert = alertMessages[alertIdx];
  const isCritical = currentAlert.includes("NOW") || currentAlert.includes("breach");

  const NavLinks = () => (
    <>
      <NavLink to="/" className={({isActive}) => `flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive ? 'bg-[#0B3D3D] text-[#FAF9F6] shadow-md shadow-[#0B3D3D]/20' : 'text-black/60 hover:bg-black/5 hover:text-[#1A1D1A]'}`}>
        <Map size={16} /> The Map
      </NavLink>
      <NavLink to="/forecast" className={({isActive}) => `flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive ? 'bg-[#0B3D3D] text-[#FAF9F6] shadow-md shadow-[#0B3D3D]/20' : 'text-black/60 hover:bg-black/5 hover:text-[#1A1D1A]'}`}>
        <Activity size={16} /> Simulator
      </NavLink>
      <NavLink to="/predictor" className={({isActive}) => `flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive ? 'bg-[#0B3D3D] text-[#FAF9F6] shadow-md shadow-[#0B3D3D]/20' : 'text-black/60 hover:bg-black/5 hover:text-[#1A1D1A]'}`}>
        <Settings size={16} /> Predictor
      </NavLink>
      <NavLink to="/telemetry" className={({isActive}) => `flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive ? 'bg-[#0B3D3D] text-[#FAF9F6] shadow-md shadow-[#0B3D3D]/20' : 'text-black/60 hover:bg-black/5 hover:text-[#1A1D1A]'}`}>
        <Radio size={16} /> Pulse
      </NavLink>
      <div className="hidden lg:block w-px h-6 bg-black/10 mx-2" />
      <NavLink to="/post-learning" className={({isActive}) => `flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive ? 'bg-[#0B3D3D] text-[#FAF9F6] shadow-md shadow-[#0B3D3D]/20' : 'text-black/60 hover:bg-black/5 hover:text-[#1A1D1A]'}`}>
        <BookOpen size={16} /> Post-Mortem
      </NavLink>
      <NavLink to="/scorecard" className={({isActive}) => `flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive ? 'bg-[#0B3D3D] text-[#FAF9F6] shadow-md shadow-[#0B3D3D]/20' : 'text-black/60 hover:bg-black/5 hover:text-[#1A1D1A]'}`}>
        <ShieldAlert size={16} /> Scorecard
      </NavLink>
      <NavLink to="/research" className={({isActive}) => `flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive ? 'bg-[#0B3D3D] text-[#FAF9F6] shadow-md shadow-[#0B3D3D]/20' : 'text-black/60 hover:bg-black/5 hover:text-[#1A1D1A]'}`}>
        <BookOpen size={16} /> Research
      </NavLink>
    </>
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-[#FAF9F6] text-[#1A1D1A] overflow-hidden font-sans selection:bg-[#0B3D3D] selection:text-[#FAF9F6]">
      {/* Top Navigation */}
      <nav className="w-full bg-[#FAF9F6] border-b border-[#1A1D1A]/10 flex items-center justify-between px-4 md:px-8 h-20 shrink-0 z-50">
        <div className="flex items-center gap-4 lg:gap-12 w-full lg:w-auto">
          <div className="flex items-center justify-between w-full lg:w-auto">
            <h1 className="text-3xl font-serif tracking-tight text-[#1A1D1A]">AERIS.</h1>
            <button 
              className="lg:hidden p-2 text-[#0B3D3D]"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          
          <div className="hidden lg:flex items-center gap-1 xl:gap-2">
            <NavLinks />
          </div>
        </div>
        
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-[#0B3D3D]">
            Global Live Feed Active
          </div>
          <MobileConnect />
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-[#FAF9F6]/80 backdrop-blur-3xl lg:hidden flex flex-col p-8 pt-12"
          >
            {/* Menu Header with Branding */}
            <div className="flex justify-between items-center mb-12">
              <h1 className="text-3xl font-serif text-[#1A1D1A]">AERIS.</h1>
              <button 
                className="p-3 bg-black/5 hover:bg-black/10 rounded-full transition-colors group z-[101]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X size={24} className="text-[#0B3D3D] group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Staggered Navigation Links */}
            <motion.div 
              className="flex flex-col gap-6"
              variants={{
                show: { transition: { staggerChildren: 0.1 } }
              }}
              initial="hidden"
              animate="show"
            >
              {[
                { id: 'home', to: '/', label: 'The Map', icon: Map },
                { id: 'forecast', to: '/forecast', label: 'Simulator', icon: Activity },
                { id: 'predictor', to: '/predictor', label: 'Predictor', icon: Settings },
                { id: 'pulse', to: '/telemetry', label: 'Pulse', icon: Radio },
                { id: 'post', to: '/post-learning', label: 'Post-Mortem', icon: BookOpen },
                { id: 'score', to: '/scorecard', label: 'Scorecard', icon: ShieldAlert },
                { id: 'research', to: '/research', label: 'Research', icon: BookOpen },
              ].map((link, idx) => (
                <motion.div
                  key={link.id}
                  variants={{
                    hidden: { opacity: 0, x: 20 },
                    show: { opacity: 1, x: 0 }
                  }}
                >
                  <NavLink 
                    to={link.to} 
                    className={({isActive}) => `flex items-center gap-4 text-2xl font-serif transition-all duration-300 ${isActive ? 'text-[#0B3D3D] translate-x-2' : 'text-black/40 hover:text-black/80'}`}
                  >
                    {({ isActive }) => (
                      <>
                        <link.icon size={24} className={isActive ? 'text-[#0B3D3D]' : 'text-black/20'} />
                        {link.label}
                      </>
                    )}
                  </NavLink>
                </motion.div>
              ))}
            </motion.div>

            {/* Menu Footer */}
            <div className="mt-auto border-t border-black/5 pt-8 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#0B3D3D]/60 whitespace-nowrap">System Status: Nominal</span>
              </div>
              <p className="text-[9px] text-black/30 font-medium leading-relaxed">
                AERIS Intelligence Platform <br />
                Bihar Flood Resilience Framework v2.4.0
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Action Banner */}
      <div className={`h-10 shrink-0 border-b flex items-center justify-between px-4 md:px-8 z-40 transition-colors duration-500 ${isCritical ? 'bg-red-50 border-red-900/10' : 'bg-white/50 border-[#1A1D1A]/10'}`}>
        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          <Radio size={14} className={isCritical ? 'text-red-600 animate-pulse' : 'text-[#0B3D3D]'} />
          <AnimatePresence mode="popLayout">
            <motion.div 
               key={alertIdx}
               initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
               className={`text-[8px] sm:text-[10px] font-bold tracking-widest uppercase truncate ${isCritical ? 'text-red-700' : 'text-black/60'}`}
            >
              {currentAlert}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-x-hidden overflow-y-auto px-4 md:px-8 xl:px-12 py-6 md:py-10 bg-[#FAF9F6]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="w-full min-h-full max-w-[1400px] mx-auto"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
