import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'framer-motion';

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

  return <motion.div className={`text-8xl md:text-[14rem] font-serif leading-none tracking-tighter ${colorClass}`}>{rounded}</motion.div>;
};

export default function ForecastTimelinePage() {
  const [day, setDay] = useState(1);
  const [loading, setLoading] = useState(false);
  const [simRisk, setSimRisk] = useState(0);
  const [logs, setLogs] = useState([]);
  const [terminalVisible, setTerminalVisible] = useState(false);

  const handleSim = async () => {
    setLoading(true);
    setSimRisk(0);
    setLogs([]);
    setTerminalVisible(true);

    const sequence = [
      "ESTABLISHING SECURE SATELLITE UPLINK...",
      "AGGREGATING TOPOGRAPHICAL DATA FOR SECTOR...",
      "CALCULATING 7-DAY PRECIPITATION VECTORS...",
      "EXECUTING HYDRO-DYNAMICS AI MODEL...",
      "SYNTHESIZING PROBABILISTIC OUTCOME..."
    ];

    for (let i = 0; i < sequence.length; i++) {
      setLogs(prev => [...prev, sequence[i]]);
      await new Promise(r => setTimeout(r, 600));
    }

    const finalRisk = Math.min(100, 15 + (day * 15));
    setSimRisk(finalRisk);
    setLoading(false);
  };

  const isCrit = simRisk > 75;
  const isWarn = simRisk > 40 && simRisk <= 75;

  const textColor = isCrit ? 'text-[#991b1b]' : isWarn ? 'text-[#b45309]' : 'text-[#0B3D3D]';
  const ambientBg = simRisk === 0 ? 'transparent' : isCrit ? 'rgba(153,27,27,0.05)' : isWarn ? 'rgba(180,83,9,0.05)' : 'rgba(11,61,61,0.05)';

  return (
    <motion.div initial={{ backgroundColor: 'transparent' }} animate={{ backgroundColor: ambientBg }} transition={{ duration: 2 }} className="w-full h-full flex flex-col pb-8 rounded-3xl -m-4 p-4 lg:-m-8 lg:p-8 overflow-hidden relative">
      {/* Animated Ambience */}
      {simRisk > 0 && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 3 }} className={`absolute inset-0 pointer-events-none ${isCrit ? 'bg-gradient-to-t from-red-100 to-transparent' : isWarn ? 'bg-gradient-to-t from-amber-100 to-transparent' : 'bg-gradient-to-t from-teal-50 to-transparent'}`} />
      )}

      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10 border-b border-black/5 pb-8">
        <div>
          <motion.h2 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-5xl md:text-6xl font-serif text-[#1A1D1A] tracking-tight">System Forecast</motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-black/50 text-xs mt-4 tracking-widest uppercase font-bold">Predicting Matrix: Patna Sector</motion.p>
        </div>
        <button onClick={handleSim} disabled={loading} className="px-10 py-5 bg-[#0B3D3D] text-[#FAF9F6] rounded-full text-xs font-bold uppercase tracking-widest hover:bg-[#1A1D1A] transition-all shadow-xl shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden relative">
          <span className="relative z-10 flex items-center gap-3">
            {loading && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
            {loading ? 'Synthesizing...' : 'Run Simulation'}
          </span>
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
        </button>
      </div>

      <div className="bg-white/60 backdrop-blur-md p-8 rounded-3xl mb-8 border border-black/5 relative z-20 shadow-xl shadow-black/5">
        <div className="flex justify-between mb-8 text-black/60 text-[10px] tracking-widest font-bold uppercase relative z-10">
          <span>Projection Scrubber</span>
          <span>June {15 + day}, 2026</span>
        </div>
        <input type="range" min="1" max="7" value={day} onChange={(e) => { setDay(parseInt(e.target.value)); setSimRisk(0); setTerminalVisible(false); }} className="w-full h-2 bg-black/10 rounded-lg appearance-none cursor-pointer accent-[#0B3D3D] relative z-10" disabled={loading} />
        <div className="flex justify-between mt-4 text-[10px] text-black/40 font-bold tracking-widest uppercase relative z-10">
          <span>Day 1</span><span>Day 2</span><span>Day 3</span><span>Day 4</span><span>Day 5</span><span>Day 6</span><span>Day 7</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-8 relative z-20 h-full min-h-[400px]">
        {/* Value Display */}
        <div className="flex-1 flex items-center justify-center relative bg-white/40 backdrop-blur-xl border border-black/5 rounded-3xl shadow-xl shadow-black/5 overflow-hidden">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: 'linear' }} className="absolute w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full border border-black/10 border-dashed pointer-events-none" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }} className="absolute w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full border border-black/5 pointer-events-none opacity-50" />

          <AnimatePresence mode="wait">
            {simRisk === 0 && !loading ? (
              <motion.div key="idle" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="text-black/30 text-center uppercase text-xs font-bold tracking-widest px-8">
                Slide scrubber & run execution to visualize vector probabilities.
              </motion.div>
            ) : (
              <motion.div key="res" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center relative z-10">
                {loading ? (
                  <div className="text-8xl md:text-[14rem] font-serif text-black/10 animate-pulse tracking-tighter">0.0%</div>
                ) : (
                  <NumberTicker value={simRisk} colorClass={textColor} />
                )}

                {!loading && simRisk > 0 && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5 }} className={`text-sm font-bold mt-4 uppercase tracking-widest inline-block px-5 py-1.5 rounded-full border bg-white ${isCrit ? 'border-red-200 text-red-700' : isWarn ? 'border-amber-200 text-amber-700' : 'border-teal-200 text-[#0B3D3D]'}`}>
                    {isCrit ? 'Critical: Evacuation Recommended' : isWarn ? 'Warning: Monitor Closely' : 'Nominal Tolerances'}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Terminal Logger */}
        <AnimatePresence>
          {terminalVisible && (
            <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: '100%', '@media (min-width: 1024px)': { width: '35%' } }} exit={{ opacity: 0, width: 0 }} className="lg:w-1/3 bg-[#1A1D1A] rounded-3xl p-8 flex flex-col shadow-2xl relative shrink-0">
              <div className="text-[#FAF9F6]/40 text-[10px] uppercase font-bold tracking-widest mb-8 border-b border-white/10 pb-4 flex items-center justify-between">
                <span>AERIS Terminal Log</span>
                {loading && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
              </div>
              <div className="flex-1 font-mono text-[10px] sm:text-xs space-y-6 text-[#FAF9F6]/80 flex flex-col justify-end tracking-wider max-h-full">
                <AnimatePresence>
                  {logs.map((log, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ type: 'spring', damping: 15 }} className="leading-relaxed">
                      <span className="text-[#0B3D3D] font-bold mr-3 opacity-80 backdrop-blur-sm">[{i + 1}/5]</span>{log}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {!loading && simRisk > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="pt-6 mt-6 border-t border-white/10 text-white">
                    <div className="mb-2 uppercase opacity-50 text-[10px]">Result Matrix</div>
                    SIMULATION COMPLETE. <br />
                    <span className={`text-base block mt-2 ${isCrit ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-teal-400'}`}>
                      SEVERITY RATING: {simRisk.toFixed(1)}%
                    </span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
