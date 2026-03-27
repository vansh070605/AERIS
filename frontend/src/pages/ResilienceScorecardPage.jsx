import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GuidancePopover from '../components/GuidancePopover';
import { 
  RadialBarChart, RadialBar, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, AreaChart, Area
} from 'recharts';
import { Search, ArrowUpDown, Shield, AlertTriangle, CheckCircle2, Info, Download, TrendingUp, Layers, Zap, Activity } from 'lucide-react';

const districtData = [
  { rank: 1, dist: "Patna", infra: 92, response: "38m", vuln: "Low", score: 94, radar: [ { subject: 'Infra', A: 92 }, { subject: 'Response', A: 95 }, { subject: 'Economic', A: 88 }, { subject: 'Social', A: 92 }, { subject: 'Health', A: 90 } ] },
  { rank: 2, dist: "Gaya", infra: 85, response: "1hr 05m", vuln: "Low", score: 88, radar: [ { subject: 'Infra', A: 85 }, { subject: 'Response', A: 82 }, { subject: 'Economic', A: 84 }, { subject: 'Social', A: 88 }, { subject: 'Health', A: 86 } ] },
  { rank: 3, dist: "Nalanda", infra: 82, response: "1hr 15m", vuln: "Low", score: 84, radar: [ { subject: 'Infra', A: 82 }, { subject: 'Response', A: 78 }, { subject: 'Economic', A: 80 }, { subject: 'Social', A: 85 }, { subject: 'Health', A: 82 } ] },
  { rank: 4, dist: "Bhagalpur", infra: 78, response: "1hr 35m", vuln: "Med", score: 81, radar: [ { subject: 'Infra', A: 78 }, { subject: 'Response', A: 75 }, { subject: 'Economic', A: 82 }, { subject: 'Social', A: 78 }, { subject: 'Health', A: 80 } ] },
  { rank: 5, dist: "Muzaffarpur", infra: 75, response: "1hr 50m", vuln: "Med", score: 78, radar: [ { subject: 'Infra', A: 75 }, { subject: 'Response', A: 70 }, { subject: 'Economic', A: 78 }, { subject: 'Social', A: 80 }, { subject: 'Health', A: 75 } ] },
  { rank: 6, dist: "Rohtas", infra: 72, response: "2hr 10m", vuln: "Med", score: 75, radar: [ { subject: 'Infra', A: 72 }, { subject: 'Response', A: 68 }, { subject: 'Economic', A: 75 }, { subject: 'Social', A: 78 }, { subject: 'Health', A: 72 } ] },
  { rank: 12, dist: "Purnia", infra: 65, response: "3hr 20m", vuln: "Med", score: 68, radar: [ { subject: 'Infra', A: 65 }, { subject: 'Response', A: 60 }, { subject: 'Economic', A: 65 }, { subject: 'Social', A: 70 }, { subject: 'Health', A: 68 } ] },
  { rank: 18, dist: "Khagaria", infra: 58, response: "4hr 15m", vuln: "High", score: 55, radar: [ { subject: 'Infra', A: 58 }, { subject: 'Response', A: 50 }, { subject: 'Economic', A: 52 }, { subject: 'Social', A: 58 }, { subject: 'Health', A: 55 } ] },
  { rank: 25, dist: "Saharsa", infra: 48, response: "5hr 30m", vuln: "High", score: 45, radar: [ { subject: 'Infra', A: 48 }, { subject: 'Response', A: 42 }, { subject: 'Economic', A: 45 }, { subject: 'Social', A: 50 }, { subject: 'Health', A: 48 } ] },
  { rank: 36, dist: "Supaul", infra: 38, response: "6hr 10m", vuln: "Critical", score: 32, radar: [ { subject: 'Infra', A: 38 }, { subject: 'Response', A: 30 }, { subject: 'Economic', A: 32 }, { subject: 'Social', A: 40 }, { subject: 'Health', A: 35 } ] },
  { rank: 38, dist: "Darbhanga", infra: 32, response: "7hr 45m", vuln: "Critical", score: 28, radar: [ { subject: 'Infra', A: 32 }, { subject: 'Response', A: 25 }, { subject: 'Economic', A: 28 }, { subject: 'Social', A: 35 }, { subject: 'Health', A: 30 } ] },
];

const stateAverage = { value: 68, fill: '#0B3D3D' };

export default function ResilienceScorecardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });
  const [selectedDistrict, setSelectedDistrict] = useState(districtData[0]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 200 } }
  };

  const filteredData = useMemo(() => {
    let sorted = [...districtData].filter(d => 
      d.dist.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sorted;
  }, [searchTerm, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="w-full h-full flex flex-col pb-12 overflow-y-auto no-scrollbar bg-[#F8F9F8] px-4 md:px-8">
      {/* Premium System Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 pt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div>
          <div className="flex items-center gap-4">
            <h2 className="text-4xl md:text-6xl font-serif text-[#1A1D1A] tracking-tight leading-none">Resilience.<br /><span className="text-black/20 italic">Scorecard.</span></h2>
            <GuidancePopover 
              title="Metric Calibration"
              items={[
                { label: "Composite Index", content: "Weighted average of Infrastructure (40%), Response (30%), and Socio-Economic factors (30%).", color: "#0B3D3D" },
                { label: "Rank Inversion", content: "Lower ranking (e.g., #38) indicates critical vulnerability and prioritized resource allocation.", color: "#991b1b" },
                { label: "DNA Mapping", content: "Radar charts visualize sectoral strengths (e.g., strong Social ties vs. weak structural Infra).", color: "#3B82F6" }
              ]}
            />
          </div>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-[#0B3D3D]/40">Intelligence Framework v2.4.0 • BIHAR STATE</p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#0B3D3D]/30" />
            <input 
              type="text" 
              placeholder="Filter by subsector..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border border-black/5 rounded-2xl text-sm focus:ring-4 focus:ring-[#0B3D3D]/5 transition-all outline-none shadow-sm"
            />
          </div>
          <button className="p-4 bg-[#1A1D1A] text-white rounded-2xl hover:bg-black transition-colors shadow-xl shadow-black/10 group">
            <Download size={20} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </motion.div>

      {/* High-Fidelity KPI Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
      >
        {[
          { label: 'Readiness Index', val: `${stateAverage.value}%`, trend: '+4.2', icon: Shield, color: 'text-[#0B3D3D]', bg: 'bg-[#0B3D3D]/5' },
          { label: 'Infrastructure', val: '72/100', trend: '+12.1', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Response Velocity', val: '1.4h', trend: '-22%', icon: Activity, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Critical Hotspots', val: '12', trend: 'STABLE', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' }
        ].map((kpi, i) => (
          <motion.div key={i} variants={itemVariants} className={`p-6 rounded-[2rem] border border-black/5 shadow-xl shadow-black/5 ${kpi.bg} relative overflow-hidden group hover:-translate-y-1 transition-transform duration-500`}>
             <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
               <kpi.icon size={120} />
             </div>
             <div className="flex justify-between items-start mb-4">
               <div className={`p-3 rounded-2xl bg-white shadow-sm ${kpi.color}`}>
                 <kpi.icon size={20} />
               </div>
               <span className={`text-[10px] font-black px-2 py-1 rounded-full bg-white/50 border border-black/5 ${kpi.color}`}>{kpi.trend}</span>
             </div>
             <div className="text-3xl font-serif text-[#1A1D1A] mb-1">{kpi.val}</div>
             <div className="text-[10px] font-bold uppercase tracking-widest text-black/40">{kpi.label}</div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div initial={{opacity:0, scale:0.98}} animate={{opacity:1, scale:1}} transition={{delay: 0.4}} className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* District Detail (Radar) - Repositioned for Prominence */}
        <div className="lg:col-span-4 bg-[#1A1D1A] p-6 md:p-8 rounded-[3rem] shadow-2xl text-white overflow-hidden relative min-h-[450px] group transition-all duration-700 hover:shadow-[#0B3D3D]/20">
          <div className="absolute top-8 left-8">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-1">Sector DNA Map</div>
            <h3 className="text-2xl font-serif text-teal-400">{selectedDistrict.dist}</h3>
          </div>
          
          <div className="mt-12 w-full h-[300px] pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={selectedDistrict.radar}>
                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#fff', fontSize: 10, opacity: 0.4, fontWeight: 700 }} />
                <Radar 
                  name={selectedDistrict.dist} 
                  dataKey="A" 
                  stroke="#4FD1C5" 
                  strokeWidth={2}
                  fill="#4FD1C5" 
                  fillOpacity={0.15} 
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end bg-gradient-to-t from-[#1A1D1A] pt-8">
            <div>
               <div className="text-5xl font-serif text-white tracking-tighter tabular-nums leading-none">{selectedDistrict.score}</div>
               <div className="text-[9px] uppercase tracking-widest opacity-40 font-black mt-2">Index Integrity Score</div>
            </div>
            <div className="text-right">
               <div className="text-teal-400 font-black tracking-widest text-lg">#{selectedDistrict.rank}</div>
               <div className="text-[9px] uppercase tracking-widest opacity-40 font-black">Region Rank</div>
            </div>
          </div>
        </div>

        {/* Sector Strength Flow (Area Chart) */}
        <div className="lg:col-span-8 bg-white p-6 md:p-10 rounded-[3rem] shadow-2xl shadow-black/5 border border-black/5 min-h-[450px] relative overflow-hidden">
          <div className="flex justify-between items-end mb-10">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0B3D3D]/40 mb-2">Comparative Flow Analytics</div>
              <h3 className="text-xl font-serif text-[#1A1D1A]">Readiness Dispersion Matrix</h3>
            </div>
            <div className="flex gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0B3D3D]" />
              <div className="w-2.5 h-2.5 rounded-full bg-black/10" />
            </div>
          </div>
          
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={districtData.slice(0, 10)}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B3D3D" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#0B3D3D" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="dist" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#000', opacity: 0.3, fontWeight: 700 }} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '16px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#0B3D3D" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                  animationDuration={2000}
                />
                <Area 
                  type="monotone" 
                  dataKey="infra" 
                  stroke="rgba(0,0,0,0.1)" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  fill="transparent" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="absolute top-0 right-0 p-10 pointer-events-none opacity-[0.03]">
             <Activity size={300} strokeWidth={0.5} />
          </div>
        </div>
      </motion.div>

      {/* Modern Table Card */}
      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] border border-black/5 shadow-2xl shadow-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-black/[0.02] border-b border-black/5">
                <th onClick={() => requestSort('rank')} className="p-6 cursor-pointer hover:bg-black/5 transition-colors group">
                  <div className="flex items-center gap-2 text-[10px] text-black/40 font-bold uppercase tracking-widest">
                    Rank <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th className="p-6 text-[10px] text-black/40 font-bold uppercase tracking-widest">Sector Profile</th>
                <th onClick={() => requestSort('infra')} className="p-6 cursor-pointer hover:bg-black/5 transition-colors group">
                  <div className="flex items-center gap-2 text-[10px] text-black/40 font-bold uppercase tracking-widest">
                    Infrastructure <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
                <th className="p-6 text-[10px] text-black/40 font-bold uppercase tracking-widest">Response Dynamic</th>
                <th className="p-6 text-[10px] text-black/40 font-bold uppercase tracking-widest">Risk Level</th>
                <th onClick={() => requestSort('score')} className="p-6 text-right cursor-pointer hover:bg-black/5 transition-colors group">
                  <div className="flex items-center justify-end gap-2 text-[10px] text-black/40 font-bold uppercase tracking-widest">
                    Index Score <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              <AnimatePresence>
                {filteredData.map((row, i) => {
                  const isHigh = row.vuln === 'Critical' || row.vuln === 'High';
                  const isMed = row.vuln === 'Med';
                  const isSelected = selectedDistrict.dist === row.dist;

                  return (
                    <motion.tr 
                      key={row.dist} 
                      layoutId={`row-${row.dist}`}
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setSelectedDistrict(row)}
                      className={`${isSelected ? 'bg-[#0B3D3D]/5 relative after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-[#0B3D3D]' : 'hover:bg-black/[0.02]'} cursor-pointer transition-all duration-300 group`}
                    >
                      <td className="p-6">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black transition-all duration-500 scale-90 group-hover:scale-100 ${isSelected ? 'bg-[#0B3D3D] text-white' : 'bg-black/5 text-black/40 group-hover:bg-[#0B3D3D]/10'}`}>
                          {row.rank}
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-2xl bg-[#0B3D3D]/5 flex items-center justify-center group-hover:bg-[#0B3D3D]/10 transition-colors">
                             <Layers size={16} className="text-[#0B3D3D]/40" />
                           </div>
                           <div>
                             <div className="font-serif text-lg text-[#1A1D1A] group-hover:text-[#0B3D3D] transition-colors">{row.dist}</div>
                             <div className="text-[8px] text-black/30 font-black uppercase tracking-[0.2em] mt-0.5">District ID · AERIS-0{row.rank}</div>
                           </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1 bg-black/5 rounded-full overflow-hidden">
                            <motion.div initial={{width:0}} animate={{width: `${row.infra}%`}} className={`h-full ${row.infra > 80 ? 'bg-[#10B981]' : row.infra > 50 ? 'bg-amber-400' : 'bg-red-500'}`} />
                          </div>
                          <span className="font-mono text-[10px] font-black text-black/30 tabular-nums">{row.infra}%</span>
                        </div>
                      </td>
                      <td className="p-6">
                         <div className="flex items-center gap-2">
                            <TrendingUp className={`w-3 h-3 ${parseInt(row.response) < 60 ? 'text-teal-500' : 'text-amber-500'}`} />
                            <span className="text-[10px] font-black text-[#1A1D1A]/60 uppercase tracking-tighter tabular-nums">{row.response}</span>
                         </div>
                      </td>
                      <td className="p-6">
                        <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-2xl text-[8px] font-black uppercase tracking-[0.15em] border transition-all duration-300 ${isHigh ? 'border-red-100 bg-red-50 text-red-600 shadow-sm shadow-red-100' : isMed ? 'border-amber-100 bg-amber-50 text-amber-600' : 'border-teal-100 bg-teal-50 text-teal-700'}`}>
                          {isHigh ? <AlertTriangle className="w-3 h-3" /> : isMed ? <Zap className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                          {row.vuln}
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="font-serif text-4xl font-bold text-[#1A1D1A] group-hover:scale-110 transition-transform duration-500 tabular-nums origin-right">
                          {row.score}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        {filteredData.length === 0 && (
          <div className="p-20 text-center text-black/20 font-serif text-2xl">
            No districts match your search...
          </div>
        )}
      </div>
    </div>
  );
}
