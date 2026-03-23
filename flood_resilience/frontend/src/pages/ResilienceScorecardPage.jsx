import React from 'react';
import { motion } from 'framer-motion';
import { RadialBarChart, RadialBar, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const mockFull = [
  { rank: 1, dist: "Patna", infra: 85, response: "45m", vuln: "Low", score: 92 },
  { rank: 2, dist: "Gaya", infra: 78, response: "1hr 10m", vuln: "Low", score: 85 },
  { rank: 3, dist: "Nalanda", infra: 72, response: "1hr 25m", vuln: "Low", score: 82 },
  { rank: 4, dist: "Bhagalpur", infra: 70, response: "1hr 40m", vuln: "Med", score: 79 },
  { rank: 14, dist: "Muzaffarpur", infra: 62, response: "2hr 30m", vuln: "Med", score: 65 },
  { rank: 36, dist: "Supaul", infra: 35, response: "5hr 15m", vuln: "High", score: 38 },
  { rank: 38, dist: "Darbhanga", infra: 28, response: "6hr 45m", vuln: "Critical", score: 25 },
];

const radialData = [
  { name: 'Readiness', value: 64, fill: '#0B3D3D' }
];

export default function ResilienceScorecardPage() {
  return (
    <div className="w-full h-full flex flex-col pb-12 overflow-y-auto no-scrollbar">
      <div className="mb-10 border-b border-black/5 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-5xl md:text-6xl font-serif text-[#1A1D1A] tracking-tight">Resilience Index</h2>
          <p className="text-black/50 text-xs mt-4 tracking-widest uppercase font-bold">Systematic Ranking of 38 Bihar Subsectors</p>
        </div>
        <div className="flex gap-4">
           <div className="px-6 py-3 bg-[#0B3D3D]/5 rounded-2xl border border-[#0B3D3D]/10">
              <div className="text-[10px] uppercase font-bold tracking-widest text-[#0B3D3D]">State Avg</div>
              <div className="text-2xl font-serif text-[#0B3D3D]">64.2</div>
           </div>
        </div>
      </div>

      {/* Analytics Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
         <div className="lg:col-span-4 bg-white p-8 rounded-[2rem] shadow-xl shadow-black/5 border border-black/5 flex flex-col items-center justify-center relative overflow-hidden h-[350px]">
            <div className="absolute top-8 left-8 text-[10px] font-bold uppercase tracking-widest text-black/40">Global Readiness Core</div>
            <ResponsiveContainer width="100%" height="100%">
               <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={15} data={radialData} startAngle={90} endAngle={450}>
                  <RadialBar background dataKey="value" cornerRadius={30} />
               </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center mt-6">
               <div className="text-6xl font-serif text-[#0B3D3D]">64%</div>
               <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30 mt-2">Operational</div>
            </div>
         </div>

         <div className="lg:col-span-8 bg-white p-8 rounded-[2rem] shadow-xl shadow-black/5 border border-black/5 h-[350px] relative">
            <div className="absolute top-8 left-8 text-[10px] font-bold uppercase tracking-widest text-black/40">Sector Comparison Matrix</div>
            <ResponsiveContainer width="100%" height="90%" className="mt-8">
               <BarChart data={mockFull} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="dist" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} dy={10} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="score" radius={[8, 8, 8, 8]} barSize={40}>
                     {mockFull.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.score > 75 ? '#0B3D3D' : entry.score > 50 ? '#b45309' : '#991b1b'} fillOpacity={0.8} />
                     ))}
                  </Bar>
               </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Table Section */}
      <div className="bg-white/40 backdrop-blur-md rounded-[2rem] border border-black/5 shadow-xl shadow-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-black/5">
                <th className="p-6 text-[10px] text-black/40 font-bold uppercase tracking-widest w-12 text-center text-[9px]">Rank</th>
                <th className="p-6 text-[10px] text-black/40 font-bold uppercase tracking-widest text-[9px]">Sector Name</th>
                <th className="p-6 text-[10px] text-black/40 font-bold uppercase tracking-widest text-[9px]">Infra Readiness</th>
                <th className="p-6 text-[10px] text-black/40 font-bold uppercase tracking-widest text-[9px]">Response Time</th>
                <th className="p-6 text-[10px] text-black/40 font-bold uppercase tracking-widest text-[9px]">Vulnerability</th>
                <th className="p-6 text-[10px] text-black/40 font-bold uppercase tracking-widest text-right text-[9px]">Index Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {mockFull.map((row, i) => {
                const crit = row.vuln === 'Critical' || row.vuln === 'High';
                const warn = row.vuln === 'Med';
                return (
                  <motion.tr key={row.dist} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="hover:bg-black/5 transition-colors group">
                    <td className="p-6 text-center text-[10px] font-bold text-black/30 group-hover:text-[#0B3D3D] transition-colors">{row.rank}</td>
                    <td className="p-6">
                       <div className="font-serif text-xl text-[#1A1D1A] m-0">{row.dist}</div>
                       <div className="text-[9px] text-black/40 uppercase font-bold tracking-widest mt-1">BIHAR SECTOR ID: 0{row.rank}</div>
                    </td>
                    <td className="p-6 text-sm text-black/60">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-1 bg-black/10 rounded-full overflow-hidden">
                          <motion.div initial={{width:0}} animate={{width: `${row.infra}%`}} transition={{duration: 1, delay: 0.5}} className="h-full bg-[#0B3D3D]" />
                        </div>
                        <span className="font-mono text-[11px] font-bold">{row.infra}%</span>
                      </div>
                    </td>
                    <td className="p-6 text-[11px] font-bold text-black/60 uppercase tracking-widest">{row.response}</td>
                    <td className="p-6">
                      <span className={`text-[9px] font-bold tracking-widest uppercase px-4 py-1.5 rounded-full border ${crit ? 'border-red-200 bg-red-50 text-red-700' : warn ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-teal-200 bg-teal-50 text-[#0B3D3D]'}`}>
                        {row.vuln}
                      </span>
                    </td>
                    <td className="p-6 text-right font-serif text-4xl font-bold text-[#1A1D1A] group-hover:scale-110 transition-transform origin-right">
                       {row.score}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
