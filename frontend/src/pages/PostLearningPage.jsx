import React from 'react';
import { motion } from 'framer-motion';

export default function PostLearningPage() {
  return (
    <div className="w-full h-full pb-8">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between border-b border-black/5 pb-8 gap-6">
        <div>
          <h2 className="text-5xl md:text-6xl font-serif text-[#1A1D1A] tracking-tight">Post-Mortem</h2>
          <p className="text-black/50 text-xs mt-4 tracking-widest uppercase font-bold">Target Archive: 2023 Kosi Breach</p>
          <p className="text-black/40 text-sm mt-3 max-w-lg leading-relaxed">
            Learn from past disasters. This page reconstructs the timeline of the 2023 Kosi embankment breach, analyzing what went wrong, how quickly relief was deployed, and what infrastructure gaps need to be addressed to prevent future casualties.
          </p>
        </div>
        <button className="px-8 py-3 bg-transparent border border-[#1A1D1A]/20 text-[#1A1D1A] hover:bg-[#1A1D1A]/5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-colors">
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
         {/* Timeline */}
         <div className="lg:col-span-4">
            <h3 className="text-[10px] text-black/40 uppercase tracking-widest font-bold mb-8">Chronological Sequence</h3>
            <div className="border-l border-black/10 pl-6 space-y-10">
               {[
                 { t: "T-48h", evt: "Heavy precipitation warning issued.", color: "text-black/60" },
                 { t: "T-12h", evt: "Water levels breach critical mark at Gauge A3.", color: "text-[#b45309]" },
                 { t: "T-0", evt: "Embankment failure detected. Auto-alerts fired.", color: "text-[#991b1b]" },
                 { t: "T+4h", evt: "NDRF deployed to Supaul sector.", color: "text-[#0B3D3D]" }
               ].map((e, idx) => (
                 <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.2 }} key={idx} className="relative">
                    <div className="absolute -left-[29px] top-1 w-2 h-2 rounded-full bg-[#FAF9F6] border-2 border-[#1A1D1A]" />
                    <div className={`text-[10px] font-bold tracking-widest uppercase ${e.color}`}>{e.t}</div>
                    <div className="text-sm text-[#1A1D1A] mt-2">{e.evt}</div>
                 </motion.div>
               ))}
            </div>
         </div>

         {/* Insights */}
         <div className="lg:col-span-8 flex flex-col gap-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-[#F4F2EC] rounded-3xl p-10 border border-black/5">
               <div className="text-[10px] uppercase font-bold tracking-widest text-[#991b1b] mb-4">Structural Analysis Target</div>
               <div className="text-3xl font-serif text-[#1A1D1A] mb-4">Why did the embankment fail?</div>
               <p className="text-black/60 text-sm leading-relaxed">
                 Telemetry logs cross-referenced with soil integrity scanners indicate that sustained rainfall weakened the structural base at GPS <span className="font-mono bg-black/5 px-1 rounded text-black/80">26.12, 85.36</span>. The subsequent river surge exceeded the design threshold by 12%.
               </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white rounded-3xl p-10 shadow-xl shadow-black/5 border border-black/5 flex-1">
               <div className="text-[10px] uppercase font-bold tracking-widest text-[#0B3D3D] mb-4">Logistical Updates Generated</div>
               <div className="text-3xl font-serif text-[#1A1D1A] mb-8">Inventory Deficits</div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border border-black/10 p-6 rounded-2xl">
                     <div className="text-lg font-serif text-[#1A1D1A] mb-2">Supaul Sector</div>
                     <div className="text-[10px] text-[#b45309] font-bold tracking-widest uppercase">Needs 20% More Shelters</div>
                     <p className="text-xs text-black/50 mt-4 leading-relaxed">Evacuation capacity exceeded by 1,400 individuals during peak cycle.</p>
                  </div>
                  <div className="border border-black/10 p-6 rounded-2xl">
                     <div className="text-lg font-serif text-[#1A1D1A] mb-2">NDRF Unit 9</div>
                     <div className="text-[10px] text-[#b45309] font-bold tracking-widest uppercase">Routing Delay: +45m</div>
                     <p className="text-xs text-black/50 mt-4 leading-relaxed">Primary arterial highway flooded. Re-route protocols updated in AI core.</p>
                  </div>
               </div>
            </motion.div>
         </div>
      </div>
    </div>
  );
}
