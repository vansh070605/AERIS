import React from 'react';
import { AlertCircle, Target, TrendingDown } from 'lucide-react';

export default function PercPage() {
  const metrics = [
    { label: "Total Area Flooded", value: "3,450 km²", icon: <TrendingDown /> },
    { label: "Population Affected", value: "1.24 Million", icon: <AlertCircle /> },
    { label: "Crop Destroyed", value: "24,500 Ha", icon: <TrendingDown /> },
    { label: "Total Recovery Cost", value: "₹450.5 Cr", icon: <Target /> },
  ];

  const insights = [
    { district: "Patna", loss: "4,500 Ha", ai: "Significant flooding primarily due to exceptional rainfall (1450 mm) combined with low natural permeability." },
    { district: "Darbhanga", loss: "3,200 Ha", ai: "Primarily flooded due to embankment breach (Age: 35 yrs, Maintenance Score: 3.2)." },
    { district: "Muzaffarpur", loss: "2,900 Ha", ai: "Localized waterlogging caused by sudden upstream surge and high density urban settlement." }
  ];

  return (
    <div className="dashboard-grid">
      <div className="glass-panel col-span-12">
        <h3>Post-Event Learning Engine (PERC)</h3>
        <p>Analyzing historical flood events to extract lessons learned and drive future algorithmic resilience.</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginTop: '24px' }}>
          {metrics.map((m, idx) => (
            <div key={idx} className="glass-panel metric-card" style={{ padding: '16px', border: '1px solid rgba(0, 102, 255, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)' }}>
                {m.icon}
                <span className="metric-title">{m.label}</span>
              </div>
              <span className="metric-value">{m.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-12">
        <h3 style={{ marginBottom: '16px' }}>Worst Hit Districts & AI Post-Mortem</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {insights.map((insight, idx) => (
            <div key={idx} className="glass-panel" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <div style={{ minWidth: '150px' }}>
                <h4 style={{ margin: 0, color: 'var(--accent-cyan)' }}>{insight.district}</h4>
                <p style={{ fontSize: '0.875rem' }}>Loss: {insight.loss}</p>
              </div>
              <div style={{ width: '1px', height: '40px', background: 'var(--glass-border)' }}></div>
              <div style={{ flex: 1 }}>
                <span className="glass-pill" style={{ marginBottom: '8px', display: 'inline-block', fontSize: '0.75rem' }}>AI CAUSAL ANALYSIS</span>
                <p style={{ color: 'var(--text-primary)', margin: 0 }}>{insight.ai}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
