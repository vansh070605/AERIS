import React from 'react';
import { motion } from 'framer-motion';

const mock = [
  { rank: 1, dist: "Patna", infra: "85%", response: "45m", vuln: "Low", score: 92 },
  { rank: 2, dist: "Gaya", infra: "78%", response: "1hr 10m", vuln: "Low", score: 85 },
  { rank: 14, dist: "Muzaffarpur", infra: "62%", response: "2hr 30m", vuln: "Med", score: 65 },
  { rank: 36, dist: "Supaul", infra: "35%", response: "5hr 15m", vuln: "High", score: 38 },
  { rank: 38, dist: "Darbhanga", infra: "28%", response: "6hr 45m", vuln: "Critical", score: 25 },
];

export default function ResilienceScorecardPage() {
  return (
    <div className="w-full h-full flex flex-col pb-8">
      <div className="mb-10 border-b border-black/5 pb-8">
        <h2 className="text-5xl md:text-6xl font-serif text-[#1A1D1A] tracking-tight">Resilience Index</h2>
        <p className="text-black/50 text-xs mt-4 tracking-widest uppercase font-bold">Systematic Ranking of 38 Bihar Subsectors</p>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b-2 border-black/10">
              <th className="p-4 text-[10px] text-black/40 font-bold uppercase tracking-widest w-12 text-center">Rank</th>
              <th className="p-4 text-[10px] text-black/40 font-bold uppercase tracking-widest">Sector Name</th>
              <th className="p-4 text-[10px] text-black/40 font-bold uppercase tracking-widest">Infra Readiness</th>
              <th className="p-4 text-[10px] text-black/40 font-bold uppercase tracking-widest">Response Time</th>
              <th className="p-4 text-[10px] text-black/40 font-bold uppercase tracking-widest">Vulnerability</th>
              <th className="p-4 text-[10px] text-black/40 font-bold uppercase tracking-widest text-right">Index Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {mock.map((row, i) => {
              const crit = row.vuln === 'Critical';
              return (
                <motion.tr key={row.dist} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="hover:bg-black/5 transition-colors">
                  <td className="p-6 text-center text-sm font-bold text-black/40">{row.rank}</td>
                  <td className="p-6 font-serif text-xl text-[#1A1D1A]">{row.dist}</td>
                  <td className="p-6 text-sm text-black/60">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-1 bg-black/10 rounded-full"><div className="h-full bg-[#0B3D3D]" style={{width: row.infra}}/></div>
                      {row.infra}
                    </div>
                  </td>
                  <td className="p-6 text-sm text-black/60">{row.response}</td>
                  <td className="p-6">
                    <span className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full ${crit ? 'bg-red-100 text-red-800' : 'bg-black/5 text-[#1A1D1A]'}`}>{row.vuln}</span>
                  </td>
                  <td className="p-6 text-right font-serif text-3xl font-bold text-[#1A1D1A]">{row.score}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
