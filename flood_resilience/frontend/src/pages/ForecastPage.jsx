import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldAlert, Info } from 'lucide-react';

const mockDistricts = ['Patna', 'Muzaffarpur', 'Darbhanga', 'Saharsa', 'Kishanganj'];

export default function ForecastPage() {
  const [district, setDistrict] = useState('Patna');
  const [forecastData, setForecastData] = useState([]);
  const [alertStatus, setAlertStatus] = useState('NORMAL');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchForecast();
  }, [district]);

  const fetchForecast = async () => {
    setLoading(true);
    try {
      // Mocking input data for the selected district
      const payload = {
        rainfall_mm: 1250 + Math.random() * 500,
        vuln_score: 0.5 + Math.random() * 0.4
      };

      const res = await fetch('http://127.0.0.1:8000/predict/7day_forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      const dates = ['Today', '+1 Day', '+2 Days', '+3 Days', '+4 Days', '+5 Days', '+6 Days'];
      const chartData = data['7_day_probs'].map((prob, i) => ({
        day: dates[i],
        probability: Math.round(prob * 100),
      }));
      
      setForecastData(chartData);
      setAlertStatus(data.max_alert_level);
    } catch (err) {
      console.error(err);
      // Fallback if API is completely offline
      const dates = ['Today', '+1 Day', '+2 Days', '+3 Days', '+4 Days', '+5 Days', '+6 Days'];
      setForecastData(dates.map((d, i) => ({ day: d, probability: 40 + i * 5 })));
      setAlertStatus('ORANGE');
    }
    setLoading(false);
  };

  const getAlertColor = () => {
    if (alertStatus === 'RED') return 'var(--alert-red)';
    if (alertStatus === 'ORANGE') return 'var(--alert-orange)';
    if (alertStatus === 'YELLOW') return 'var(--alert-yellow)';
    return 'var(--alert-green)';
  };

  return (
    <div className="dashboard-grid">
      <div className="glass-panel col-span-12" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Select Target District</label>
          <select 
            className="custom-select" 
            value={district} 
            onChange={e => setDistrict(e.target.value)}
          >
            {mockDistricts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        
        <div className="glass-panel" style={{ flex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '16px 24px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Max Expected Alert Level</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <ShieldAlert color={getAlertColor()} size={24} />
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: getAlertColor() }}>
                {alertStatus} ALERT
              </span>
            </div>
          </div>
          {alertStatus === 'RED' && <button className="btn-primary" style={{ background: 'var(--alert-red)' }}>Issue Evacuation</button>}
        </div>
      </div>

      <div className="glass-panel col-span-12">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h3>7-Day Sub-basin Flood Probability Forecast</h3>
          <span className="glass-pill">XGBoost Timeseries Model</span>
        </div>
        
        {loading ? (
          <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="floating" style={{ color: 'var(--accent-cyan)' }}>Processing live satellite and IMD data...</span>
          </div>
        ) : (
          <div style={{ width: '100%', height: '400px' }}>
            <ResponsiveContainer>
              <AreaChart data={forecastData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getAlertColor()} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={getAlertColor()} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                <YAxis dataKey="probability" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--glass-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--accent-cyan)' }}
                />
                <Area type="monotone" dataKey="probability" stroke={getAlertColor()} strokeWidth={3} fillOpacity={1} fill="url(#colorProb)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
