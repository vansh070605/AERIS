import React, { useState } from 'react';
import { Layers, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import MapPage from './pages/MapPage';
import ForecastPage from './pages/ForecastPage';
import PercPage from './pages/PercPage';
import ScorecardPage from './pages/ScorecardPage';
import './App.css'; // Clear default styles by overwriting or ignoring

function App() {
  const [activeTab, setActiveTab] = useState('map');

  const navItems = [
    { id: 'map', label: 'Live Risk Map', icon: <Layers size={20} /> },
    { id: 'forecast', label: '7-Day Forecast', icon: <Activity size={20} /> },
    { id: 'perc', label: 'PERC Analytics', icon: <AlertTriangle size={20} /> },
    { id: 'scorecard', label: 'Resilience Scorecard', icon: <ShieldCheck size={20} /> },
  ];

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Layers className="sidebar-logo-icon" size={32} />
          <div>
            <h1 className="gradient-text">AERIS Flood</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>PREDICTIVE RESILIENCE</p>
          </div>
        </div>

        <nav className="nav-links">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main-content">
        <header style={{ marginBottom: '32px' }}>
          <div className="glass-pill" style={{ display: 'inline-block', marginBottom: '16px' }}>
            Kosi/Gandak Basin Live Monitoring
          </div>
          <h2>{navItems.find(i => i.id === activeTab)?.label}</h2>
        </header>

        {activeTab === 'map' && <MapPage />}
        {activeTab === 'forecast' && <ForecastPage />}
        {activeTab === 'perc' && <PercPage />}
        {activeTab === 'scorecard' && <ScorecardPage />}
      </main>
    </div>
  );
}

export default App;
