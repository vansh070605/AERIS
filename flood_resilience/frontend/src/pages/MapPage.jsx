import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, Tooltip } from 'react-leaflet';

export default function MapPage() {
  const [geoData, setGeoData] = useState(null);

  useEffect(() => {
    // We fetch the geojson locally from public or mock it.
    // For now, we mock a few polygons or instruct how we serve it.
    // Since we created it in data/bihar_districts.geojson
    // A production app would fetch it from the FastAPI endpoint.
    fetch('/bihar_districts.geojson')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => {
        console.error("Missing local geojson file.", err);
        setGeoData(null); 
      });
  }, []);

  const getStyle = (feature) => {
    // Generate random AHP colors for mock if real API not available
    const risk = Math.random();
    let color = '#00cc66';
    if (risk > 0.65) color = '#ff3366';
    else if (risk > 0.45) color = '#ff9900';

    return {
      fillColor: color,
      weight: 1,
      opacity: 1,
      color: 'rgba(0,0,0,0.5)',
      fillOpacity: 0.6
    };
  };

  return (
    <div className="dashboard-grid">
      <div className="glass-panel col-span-8" style={{ padding: 0, overflow: 'hidden' }}>
        <MapContainer center={[25.5, 85.5]} zoom={7} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          {geoData && (
            <GeoJSON data={geoData} style={getStyle}>
              <Tooltip>District View</Tooltip>
            </GeoJSON>
          )}
        </MapContainer>
      </div>
      
      <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="glass-panel">
          <h3>Multi-Criteria Hazard Zoning</h3>
          <p>AHP Weighted Overlay simulating live geographic data metrics including Slope, Permeability, and Rainfall tracking.</p>
        </div>
        
        <div className="glass-panel metric-card">
          <span className="metric-title">High Risk Zones</span>
          <span className="metric-value" style={{ color: 'var(--alert-red)' }}>12 / 38</span>
          <p style={{ fontSize: '0.8rem' }}>Requires immediate NDRF standby.</p>
        </div>

        <div className="glass-panel metric-card">
          <span className="metric-title">Critical Variables</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
            <span className="glass-pill">DEM Slope 30%</span>
            <span className="glass-pill">River Prox 25%</span>
            <span className="glass-pill">Rainfall 15%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
