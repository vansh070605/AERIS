import React from 'react';

export default function ScorecardPage() {
  const ranking = [
    { rank: 1, district: 'Patna', maint: 8.5, reach: '92.4%', score: 88.7 },
    { rank: 2, district: 'Gaya', maint: 7.8, reach: '89.0%', score: 83.5 },
    { rank: 3, district: 'Nalanda', maint: 7.5, reach: '85.5%', score: 80.2 },
    { rank: 4, district: 'Rohtas', maint: 6.9, reach: '81.2%', score: 75.1 },
    { rank: 5, district: 'Bhojpur', maint: 6.5, reach: '78.5%', score: 71.7 },
    { rank: 34, district: 'Kishanganj', maint: 3.2, reach: '45.0%', score: 38.5 },
    { rank: 35, district: 'Araria', maint: 2.8, reach: '42.5%', score: 35.2 },
    { rank: 36, district: 'Supaul', maint: 2.5, reach: '38.0%', score: 31.5 },
    { rank: 37, district: 'Madhepura', maint: 2.1, reach: '35.5%', score: 28.2 },
    { rank: 38, district: 'Saharsa', maint: 1.8, reach: '31.0%', score: 24.5 }
  ];

  return (
    <div className="dashboard-grid">
      <div className="glass-panel col-span-12" style={{ paddingBottom: '0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h3>Accountability & Resilience Ratings</h3>
            <p>Ranking Bihar districts by Embankment Maintenance and NDRF Relief Reach Effectiveness.</p>
          </div>
          <button className="btn-primary">Export Report</button>
        </div>
      </div>
      
      <div className="glass-panel col-span-12 data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>District Name</th>
              <th>Maintenance Score (0-10)</th>
              <th>Relief Reach Coverage</th>
              <th>Total Resilience Score</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((row, i) => (
              <tr key={i}>
                <td><span className="glass-pill" style={{ color: '#fff', background: 'transparent' }}>#{row.rank}</span></td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.district}</td>
                <td>{row.maint}</td>
                <td>{row.reach}</td>
                <td style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>{row.score}</td>
                <td>
                  {row.score > 70 ? (
                    <span className="status-indicator status-green">Secure</span>
                  ) : row.score > 40 ? (
                    <span className="status-indicator status-orange">At Risk</span>
                  ) : (
                    <span className="status-indicator status-red">Critical Vulnerability</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
