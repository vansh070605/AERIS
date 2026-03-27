import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GuidancePopover from '../components/GuidancePopover';
import { 
  RadialBarChart, RadialBar, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar 
} from 'recharts';
import { Search, ArrowUpDown, Shield, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

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
    <div className="w-full h-full flex flex-col pb-12 overflow-y-auto no-scrollbar bg-[#F8F9F8]">
      {/* Dynamic Header */}
      <div className="mb-8 p-6 md:p-8 bg-white rounded-[2rem] md:rounded-[2.5rem] shadow-sm border border-black/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-4">
            <h2 className="text-2xl md:text-5xl font-serif text-[#1A1D1A] tracking-tight">Resilience Scorecard</h2>
            <GuidancePopover 
              title="Metric Calibration"
              items={[
                { label: "Composite Index", content: "Weighted average of Infrastructure (40%), Response (30%), and Socio-Economic factors (30%).", color: "#0B3D3D" },
                { label: "Rank Inversion", content: "Lower ranking (e.g., #38) indicates critical vulnerability and prioritized resource allocation.", color: "#991b1b" },
                { label: "DNA Mapping", content: "Radar charts visualize sectoral strengths (e.g., strong Social ties vs. weak structural Infra).", color: "#3B82F6" }
              ]}
            />
          </div>
          <div className="flex items-center gap-3 mt-3">
             <span className="px-3 py-1 bg-[#0B3D3D]/10 text-[#0B3D3D] text-[10px] font-bold uppercase tracking-widest rounded-full">Active Monitoring</span>
             <span className="text-black/40 text-xs font-medium italic">Data Refresh 12m ago</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/30" />
            <input 
              type="text" 
              placeholder="Search subsector..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-3 bg-black/5 border-none rounded-2xl text-sm focus:ring-2 focus:ring-[#0B3D3D]/20 transition-all outline-none"
            />
          </div>
        </div>
      </div>

      {/* Analytics Power Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
        {/* Core Readiness (Radial) */}
        <div className="lg:col-span-3 bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-black/5 border border-black/5 flex flex-col items-center justify-between min-h-[350px] md:min-h-[400px]">
          <div className="w-full text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-black/40 mb-6">Aggregate Index</div>
          <div className="relative w-full aspect-square max-w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={12} data={[stateAverage]} startAngle={90} endAngle={450}>
                <RadialBar background dataKey="value" cornerRadius={30} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-5xl font-serif text-[#0B3D3D]">{stateAverage.value}%</div>
              <div className="text-[9px] font-black uppercase tracking-[0.2em] text-black/30 mt-1">Statewide</div>
            </div>
          </div>
          <div className="w-full mt-6 space-y-4">
             <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100/50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-teal-800 uppercase">Trend</span>
                <span className="text-sm font-serif text-teal-900">+4.2 pts</span>
             </div>
          </div>
        </div>

        {/* Sector Comparison (Bar) */}
        <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-black/5 border border-black/5 min-h-[350px] md:min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-black/40">Relative Rankings</div>
            <div className="text-[10px] text-black/30">Representative Subset</div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={districtData.slice(0, 8)}>
              <XAxis dataKey="dist" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#000', opacity: 0.4 }} dy={8} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="score" radius={[6, 6, 6, 6]} barSize={28}>
                {districtData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.score > 85 ? '#0B3D3D' : '#1A1D1A'} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* District Detail (Radar) */}
        <div className="lg:col-span-4 bg-[#1A1D1A] p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl text-white overflow-hidden relative min-h-[350px] md:min-h-[400px]">
          <div className="absolute top-8 left-8 text-[10px] font-bold uppercase tracking-widest opacity-40">Resilience DNA: {selectedDistrict.dist}</div>
          <div className="mt-8 w-full h-full max-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={selectedDistrict.radar}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#fff', fontSize: 10, opacity: 0.6 }} />
                <Radar name={selectedDistrict.dist} dataKey="A" stroke="#4FD1C5" fill="#4FD1C5" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
            <div>
               <div className="text-4xl font-serif">{selectedDistrict.score}</div>
               <div className="text-[9px] uppercase tracking-widest opacity-50">Composite Index</div>
            </div>
            <div className="text-right">
               <div className="text-teal-400 font-bold text-xs">#{selectedDistrict.rank}</div>
               <div className="text-[9px] uppercase tracking-widest opacity-50">State Rank</div>
            </div>
          </div>
        </div>
      </div>

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
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      onClick={() => setSelectedDistrict(row)}
                      className={`${isSelected ? 'bg-[#0B3D3D]/5' : 'hover:bg-black/[0.02]'} cursor-pointer transition-colors group`}
                    >
                      <td className="p-6">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-[#0B3D3D] text-white' : 'bg-black/5 text-black/40'}`}>
                          {row.rank}
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="font-serif text-lg text-[#1A1D1A] group-hover:text-[#0B3D3D] transition-colors">{row.dist}</div>
                        <div className="text-[9px] text-black/30 uppercase font-black tracking-widest mt-0.5">District ID: 0{row.rank}A</div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-1 bg-black/5 rounded-full overflow-hidden">
                            <motion.div initial={{width:0}} animate={{width: `${row.infra}%`}} className={`h-full ${row.infra > 80 ? 'bg-[#0B3D3D]' : row.infra > 50 ? 'bg-amber-500' : 'bg-red-500'}`} />
                          </div>
                          <span className="font-mono text-[10px] font-bold text-black/40">{row.infra}%</span>
                        </div>
                      </td>
                      <td className="p-6">
                         <div className="flex items-center gap-2">
                            <Info className="w-3 h-3 text-black/20" />
                            <span className="text-[10px] font-bold text-black/60 uppercase tracking-tighter">{row.response}</span>
                         </div>
                      </td>
                      <td className="p-6">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isHigh ? 'border-red-100 bg-red-50 text-red-600' : isMed ? 'border-amber-100 bg-amber-50 text-amber-600' : 'border-teal-100 bg-teal-50 text-[#0B3D3D]'}`}>
                          {isHigh ? <AlertTriangle className="w-3 h-3" /> : isMed ? <Info className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                          {row.vuln}
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="font-serif text-3xl font-bold text-[#1A1D1A] group-hover:scale-105 transition-transform duration-300">
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
