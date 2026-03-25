import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area, ReferenceLine, ReferenceDot 
} from 'recharts';
import { Clock, AlertOctagon, ShieldAlert, Cpu, Download, FileText, ChevronRight } from 'lucide-react';

const events = [
  { 
    id: 'kosi-2023', 
    title: '2023 Kosi Breach', 
    location: 'Supaul Sector', 
    date: 'August 14, 2023',
    telemetry: [
      { time: '00:00', level: 10.2, rain: 45 },
      { time: '04:00', level: 10.8, rain: 60 },
      { time: '08:00', level: 11.5, rain: 120 },
      { time: '12:00', level: 13.2, rain: 180 },
      { time: '16:00', level: 12.8, rain: 140 },
      { time: '20:00', level: 12.1, rain: 90 },
      { time: '23:59', level: 11.6, rain: 60 }
    ],
    timeline: [
      { time: "T-48h", evt: "Meteorological Alert level 4 issued for Kosi catchment.", status: "Warning", icon: <AlertOctagon className="w-4 h-4" /> },
      { time: "T-12h", evt: "Water levels breach critical 12.5m mark at Gauge B2.", status: "Critical", icon: <ShieldAlert className="w-4 h-4" /> },
      { time: "T-0h", evt: "Structural failure detected at Embankment Sector 4A.", status: "Breach", icon: <AlertOctagon className="w-4 h-4" /> },
      { time: "T+4h", evt: "AI-optimized routing dispatched first NDRF units.", status: "Success", icon: <Cpu className="w-4 h-4" /> }
    ],
    insight: "Sustained overtopping at coordinate 26.31N, 86.42E led to thermal soil erosion, causing an irreversible slope failure."
  },
  { 
    id: 'patna-2019', 
    title: '2019 Patna Urban Flood', 
    location: 'Patna Metro', 
    date: 'Sept 28, 2019',
    telemetry: [
      { time: '00:00', level: 8.2, rain: 200 },
      { time: '04:00', level: 9.5, rain: 250 },
      { time: '08:00', level: 11.8, rain: 300 },
      { time: '12:00', level: 14.5, rain: 400 },
      { time: '16:00', level: 14.2, rain: 350 },
      { time: '20:00', level: 13.8, rain: 280 },
      { time: '23:59', level: 13.2, rain: 200 }
    ],
    timeline: [
      { time: "T-24h", evt: "Extreme urban precipitation warning for Patna Metro.", status: "Warning", icon: <AlertOctagon className="w-4 h-4" /> },
      { time: "T-6h", evt: "Pumping stations overwhelmed at Kankarbagh sector.", status: "Critical", icon: <ShieldAlert className="w-4 h-4" /> },
      { time: "T-0h", evt: "Total power grid failure in Central Patna.", status: "Breach", icon: <AlertOctagon className="w-4 h-4" /> },
      { time: "T+8h", evt: "Dewatering operations initiated with industrial pumps.", status: "Success", icon: <Cpu className="w-4 h-4" /> }
    ],
    insight: "Urban drainage infrastructure reached 400% capacity within 6 hours. Pumping stations failed due to electrical short-circuits."
  },
  { 
    id: 'bihar-2017', 
    title: '2017 North Bihar Surge', 
    location: 'Araria/Kishanganj', 
    date: 'August 12, 2017',
    telemetry: [
      { time: '00:00', level: 12.2, rain: 150 },
      { time: '04:00', level: 13.5, rain: 200 },
      { time: '08:00', level: 15.2, rain: 350 },
      { time: '12:00', level: 17.8, rain: 500 },
      { time: '16:00', level: 17.1, rain: 400 },
      { time: '20:00', level: 16.2, rain: 300 },
      { time: '23:59', level: 15.5, rain: 200 }
    ],
    timeline: [
      { time: "T-72h", evt: "Trans-boundary surge warning from Himalayan catchment.", status: "Warning", icon: <AlertOctagon className="w-4 h-4" /> },
      { time: "T-24h", evt: "Mass evacuation ordered for Araria lowlands.", status: "Critical", icon: <ShieldAlert className="w-4 h-4" /> },
      { time: "T-0h", evt: "Multiple flash-breaches reported across Seemanchal.", status: "Breach", icon: <AlertOctagon className="w-4 h-4" /> },
      { time: "T+12h", evt: "Air-drop relief operations commenced by IAF.", status: "Success", icon: <Cpu className="w-4 h-4" /> }
    ],
    insight: "Record-breaking rainfall in Nepal catchment caused unprecedented water discharge (600k cusecs), bypassing early-warning gauges."
  }
];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1A1D1A]/90 backdrop-blur-xl border border-white/20 p-5 rounded-3xl shadow-2xl text-white">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3 font-mono">{label} - Reconstruction Time</p>
        <div className="space-y-3">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[10px] font-bold uppercase text-white/60">{entry.name}</span>
              </div>
              <span className="text-sm font-serif font-medium">
                {entry.value}{entry.name.includes('Level') ? 'm' : 'mm'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function PostLearningPage() {
  const [activeEvent, setActiveEvent] = useState(events[0]);

  // Find the peak level to place a reference dot
  const peakPoint = [...activeEvent.telemetry].sort((a, b) => b.level - a.level)[0];

  return (
    <div className="w-full h-full flex flex-col pb-12 overflow-y-auto no-scrollbar bg-[#FDFDFC]">
      {/* Header & Event Switcher */}
      <div className="mb-8 p-6 md:p-10 bg-[#1A1D1A] rounded-[2rem] md:rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none bg-gradient-to-l from-teal-500 to-transparent" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 relative z-10">
          <div>
             <div className="flex items-center gap-2 mb-4">
                <div className="px-3 py-1 bg-teal-500/20 text-teal-400 text-[10px] font-bold uppercase tracking-widest rounded-full border border-teal-500/30">Intelligence Archive</div>
                <span className="text-white/40 text-xs font-medium">Restricted Access // Post-Mortem</span>
             </div>
             <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif tracking-tight leading-tight md:leading-none mb-4">{activeEvent.title}</h2>
             <p className="text-white/50 text-sm max-w-xl leading-relaxed">
                Comprehensive reconstruction of the {activeEvent.location} disaster. Analyzing structural failures, response latency, and system performance during code-red conditions.
             </p>
          </div>
          <div className="flex flex-col gap-4 w-full md:w-auto">
             <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 overflow-x-auto no-scrollbar">
                {events.map(ev => (
                   <button 
                    key={ev.id}
                    onClick={() => setActiveEvent(ev)}
                    className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeEvent.id === ev.id ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                   >
                    {ev.id.split('-')[0]}
                   </button>
                ))}
             </div>
             <button className="flex items-center justify-center gap-3 px-8 py-3 bg-teal-500 text-black rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-400 transition-colors">
                <Download className="w-4 h-4" /> Export Recon Report
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Historical Telemetry Graph */}
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-black/5 shadow-xl shadow-black/5 relative overflow-hidden">
             <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-4">
                <div>
                   <h3 className="text-2xl md:text-3xl font-serif text-[#1A1D1A]">Hydraulic Stress Profile</h3>
                   <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black/20 font-mono">24h Forensic Cycle Reconstructed</span>
                </div>
                <div className="flex items-center gap-8">
                   <div className="flex items-center gap-3">
                      <div className="w-4 h-1 rounded-full bg-teal-600" />
                      <span className="text-[10px] font-black text-black/40 uppercase tracking-widest">Water Level (m)</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-4 h-1 rounded-full bg-amber-400" />
                      <span className="text-[10px] font-black text-black/40 uppercase tracking-widest">Rain Intensity</span>
                   </div>
                </div>
             </div>
             <div className="h-[300px] md:h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={activeEvent.telemetry}>
                      <defs>
                         <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                         </linearGradient>
                         <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                         </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(0,0,0,0.03)" />
                      <XAxis 
                        dataKey="time" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 10, fill: '#bbb', fontWeight: 600}} 
                        padding={{ left: 20, right: 20 }}
                      />
                      <YAxis hide domain={[0, 'auto']} />
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(0,0,0,0.05)', strokeWidth: 2 }} />
                      
                      <ReferenceLine y={12.5} label={{ position: 'right', value: 'BREACH HFL (12.5m)', fill: '#ef4444', fontSize: 8, fontWeight: 900, letterSpacing: '0.1em' }} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.3} />
                      
                      <Area 
                        name="Water Level"
                        type="monotone" 
                        dataKey="level" 
                        stroke="#0D9488" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorLevel)" 
                        isAnimationActive={true}
                        animationDuration={1500}
                      />
                      <Area 
                        name="Rainfall Intensity"
                        type="monotone" 
                        dataKey="rain" 
                        stroke="#F59E0B" 
                        strokeWidth={2} 
                        strokeDasharray="5 5"
                        fillOpacity={1} 
                        fill="url(#colorRain)" 
                        isAnimationActive={true}
                        animationDuration={2000}
                      />

                      <ReferenceDot 
                        x={peakPoint.time} 
                        y={peakPoint.level} 
                        r={6} 
                        fill="#0D9488" 
                        stroke="white" 
                        strokeWidth={4} 
                        label={{ position: 'top', value: 'PEAK DISCHARGE', fill: '#0D9488', fontSize: 9, fontWeight: 900, dy: -10 }} 
                      />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-8 bg-amber-50 rounded-[2.5rem] border border-amber-100 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 bg-amber-200/50 rounded-2xl flex items-center justify-center mb-6">
                     <AlertOctagon className="w-5 h-5 text-amber-700" />
                  </div>
                  <h4 className="text-xl font-serif text-amber-900 mb-2">Forensic Breakdown</h4>
                  <p className="text-xs text-amber-900/60 leading-relaxed">
                     {activeEvent.insight}
                  </p>
                </div>
                <button className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-800 mt-6 tracking-widest hover:gap-4 transition-all">
                   View Breach Scan <ChevronRight className="w-3 h-3" />
                </button>
             </motion.div>

             <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-8 bg-[#FAF9F6] rounded-[2.5rem] border border-black/5 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 bg-[#0B3D3D]/10 rounded-2xl flex items-center justify-center mb-6">
                     <Cpu className="w-5 h-5 text-[#0B3D3D]" />
                  </div>
                  <h4 className="text-xl font-serif text-[#1A1D1A] mb-2">AI Response Audit</h4>
                  <p className="text-xs text-black/50 leading-relaxed">
                     The system correctly predicted the 72h vulnerability window but flagged a 40-minute delay in NDRF arrival due to unmapped road blockages.
                  </p>
                </div>
                <button className="flex items-center gap-2 text-[10px] font-black uppercase text-[#0B3D3D] mt-6 tracking-widest hover:gap-4 transition-all">
                   System Logs <ChevronRight className="w-3 h-3" />
                </button>
             </motion.div>
          </div>
        </div>

        {/* Chronological Sequence (Sidebar) */}
        <div className="lg:col-span-4 bg-white p-6 md:p-8 rounded-[2.5rem] md:rounded-[3rem] border border-black/5 shadow-xl shadow-black/5 flex flex-col h-full min-h-[400px] md:min-h-[500px]">
           <div className="flex items-center gap-3 mb-10 pb-6 border-b border-black/5">
              <Clock className="w-5 h-5 text-black/30" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#1A1D1A]">Event Chronology</h3>
           </div>
           
           <div className="relative flex-1">
              <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-black/[0.03]" />
              <div className="space-y-12 relative z-10">
                 {activeEvent.timeline.map((item, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, x: 10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: 0.1 * idx }}
                      className="flex gap-6 group"
                    >
                       <div className="w-10 h-10 rounded-2xl bg-white border border-black/10 flex items-center justify-center shadow-sm group-hover:bg-[#1A1D1A] group-hover:text-white transition-all">
                          {item.icon}
                       </div>
                       <div>
                          <div className="flex items-center gap-3 mb-1">
                             <span className="text-[10px] font-black text-black/30 uppercase font-mono tracking-tighter">{item.time}</span>
                             <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md ${
                                item.status === 'Breach' ? 'bg-red-50 text-red-600' : 
                                item.status === 'Critical' ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-[#0B3D3D]'
                             }`}>
                                {item.status}
                             </span>
                          </div>
                          <p className="text-xs text-black/70 leading-relaxed group-hover:text-black transition-colors">{item.evt}</p>
                       </div>
                    </motion.div>
                 ))}
              </div>
           </div>

           <div className="mt-12 p-6 bg-black/[0.02] rounded-3xl border border-black/5 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md mb-4">
                 <FileText className="w-6 h-6 text-black/30" />
              </div>
              <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mb-1">Peer Review Status</p>
              <p className="text-xs font-serif text-teal-800">Verified by AERIS Core v4.2</p>
           </div>
        </div>
      </div>
    </div>
  );
}
