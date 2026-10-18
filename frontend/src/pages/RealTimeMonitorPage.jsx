import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GuidancePopover from '../components/GuidancePopover';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { Radio, TrendingUp, TrendingDown, Minus, AlertTriangle, Shield, Waves, Activity, RefreshCw } from 'lucide-react';
import { API_BASE } from '../config/api';

const REFRESH_INTERVAL = 10;

function FlyToStation({ station }) {
  const map = useMap();
  useEffect(() => {
    if (station) {
      map.flyTo([station.lat, station.lng], 9, { duration: 0.8 });
    }
  }, [station, map]);
  return null;
}

function TrendIcon({ trend }) {
  if (trend === 'Rising') return <TrendingUp className="w-3.5 h-3.5 text-red-600" />;
  if (trend === 'Falling') return <TrendingDown className="w-3.5 h-3.5 text-green-600" />;
  return <Minus className="w-3.5 h-3.5 text-amber-600" />;
}

function AlertPill({ type }) {
  const cls = type === 'Above Danger Level'
    ? 'border-red-200 bg-red-50 text-red-700'
    : type === 'Above Warning Level'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-teal-200 bg-teal-50 text-[#0B3D3D]';
  const label = type === 'Above Danger Level' ? 'DANGER'
    : type === 'Above Warning Level' ? 'WARNING' : 'NORMAL';
  return <span className={`text-[8px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${cls}`}>{label}</span>;
}

export default function RealTimeMonitorPage() {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [loading, setLoading] = useState(true);
  const [geoData, setGeoData] = useState(null);
  const tableRef = useRef(null);

  const fetchData = () => {
    fetch(`${API_BASE}/telemetry/realtime`)
      .then(r => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { console.error('Telemetry API offline', e); setLoading(false); });
  };

  useEffect(() => {
    fetchData();
    fetch('/bihar_districts_real.geojson').then(r => r.json()).then(setGeoData).catch(() => console.log('GeoJSON load error'));
    const dataTimer = setInterval(() => { fetchData(); setCountdown(REFRESH_INTERVAL); }, REFRESH_INTERVAL * 1000);
    const tickTimer = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => { clearInterval(dataTimer); clearInterval(tickTimer); };
  }, []);

  const handleMarkerClick = (station) => {
    setSelected(station.station);
    // Scroll to row in table
    setTimeout(() => {
      const row = document.getElementById(`row-${station.station.replace(/\s/g, '-')}`);
      if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const stations = data?.stations || [];
  const dangerCount = stations.filter(s => s.alert_type === 'Above Danger Level').length;
  const warningCount = stations.filter(s => s.alert_type === 'Above Warning Level').length;
  const avgBreach = stations.length > 0
    ? (stations.reduce((sum, s) => sum + s.breach_prob, 0) / stations.length * 100).toFixed(1)
    : '—';

  // Build district → stations map for GeoJSON polygon coloring
  const districtMap = useMemo(() => {
    const map = {};
    for (const s of stations) {
      if (!map[s.district]) {
        map[s.district] = { stations: [], alert_type: 'Normal', maxBreach: 0 };
      }
      map[s.district].stations.push(s);
      map[s.district].maxBreach = Math.max(map[s.district].maxBreach, s.breach_prob);
      // Keep worst alert
      const rank = { 'Above Danger Level': 3, 'Above Warning Level': 2, 'Normal': 1 };
      if ((rank[s.alert_type] || 0) > (rank[map[s.district].alert_type] || 0)) {
        map[s.district].alert_type = s.alert_type;
      }
    }
    return map;
  }, [stations]);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-6 gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif text-[#1A1D1A] tracking-tight leading-tight">River Pulse.</h2>
            <GuidancePopover 
              title="Telemetry Systems"
              items={[
                { label: "Sensor Latency", content: "Gauges transmit data via LoRaWAN/Satellite. Maximum latency is 10s during normal operations.", color: "#0B3D3D" },
                { label: "Station Calibration", content: "Zero-level (MSL) is calibrated monthly against Survey of India benchmarks.", color: "#3B82F6" },
                { label: "Breach Logic", content: "Breach probability is calculated using current level velocity and embankment soil saturation models.", color: "#F59E0B" }
              ]}
            />
          </div>
          <p className="text-black/50 text-xs mt-2 tracking-widest uppercase font-bold">
            Live Telemetry · {stations.length} Gauges · 5 Basins
          </p>
          <p className="text-black/40 text-sm mt-2 max-w-md leading-relaxed">
            Live monitoring of 18 river gauge stations across Bihar. Our XGBoost ML models predict breach risk and flood probability for each station in real-time. Data auto-refreshes every 10 seconds.
          </p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#0B3D3D]/5 rounded-full border border-[#0B3D3D]/10 w-full sm:w-auto justify-center">
            <RefreshCw className={`w-3.5 h-3.5 text-[#0B3D3D] ${countdown <= 2 ? 'animate-spin' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#0B3D3D]">
              Refresh: {countdown}s
            </span>
          </div>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0 overflow-y-auto no-scrollbar xl:overflow-hidden">
        {/* Left ΓÇö GIS Map */}
        <div className="xl:w-[45%] flex flex-col gap-4 h-[600px] xl:h-[75vh]">
          <div className="flex-1 rounded-[2rem] overflow-hidden shadow-2xl shadow-black/10 border border-black/5 relative bg-[#F4F2EC]">
            {!loading && (
              <MapContainer center={[25.8, 85.8]} zoom={window.innerWidth < 1024 ? 6.5 : 7} scrollWheelZoom={true} dragging={true} tap={false} className="w-full h-full" zoomControl={true}>
                <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                {geoData && (
                  <GeoJSON
                    key={`pulse-map-${window.innerWidth}`}
                    data={geoData}
                    style={(feature) => {
                      const distName = feature.properties.NAME_2;
                      const info = districtMap[distName];
                      if (!info) return { fillColor: '#166534', fillOpacity: 0.15, color: '#1A1D1A', weight: 1, opacity: 0.3 };
                      const color = info.alert_type === 'Above Danger Level' ? '#991b1b'
                        : info.alert_type === 'Above Warning Level' ? '#b45309' : '#166534';
                      const isActive = selected && info.stations.some(s => s.station === selected);
                      return {
                        fillColor: color,
                        fillOpacity: isActive ? 0.7 : 0.5,
                        color: '#1A1D1A',
                        weight: isActive ? 2 : 1,
                        opacity: 0.5,
                      };
                    }}
                    onEachFeature={(feature, layer) => {
                      const distName = feature.properties.NAME_2 || 'Unknown';
                      const info = districtMap[distName];
                      const label = info
                        ? `${distName} — ${info.stations.map(s => s.station).join(', ')}\nAlert: ${info.alert_type}\nBreach: ${(info.maxBreach * 100).toFixed(0)}%`
                        : distName;
                      layer.bindTooltip(label, {
                        className: 'bg-[#FAF9F6] text-[#1A1D1A] border-none shadow-xl font-sans text-[10px] uppercase tracking-wider font-bold rounded-md px-3 py-2',
                        sticky: true, direction: 'auto'
                      });
                      layer.on({
                        mouseover: (e) => { e.target.setStyle({ weight: 2, fillOpacity: 0.5 }); e.target.bringToFront(); },
                        mouseout: (e) => {
                          const inf = districtMap[distName];
                          const isAct = selected && inf?.stations.some(s => s.station === selected);
                          e.target.setStyle({ weight: isAct ? 2 : 1, fillOpacity: isAct ? 0.5 : (inf ? 0.3 : 0.08) });
                        },
                        click: () => {
                          if (info && info.stations.length > 0) {
                            handleMarkerClick(info.stations[0]);
                          }
                        }
                      });
                    }}
                  />
                )}
                {selected && <FlyToStation station={stations.find(s => s.station === selected)} />}
              </MapContainer>
            )}
            {/* Map Legend */}
            <div className="absolute bottom-4 left-4 z-[40] bg-white/90 backdrop-blur-md rounded-xl px-4 py-3 shadow-lg border border-black/5">
              <div className="text-[8px] font-bold uppercase tracking-widest text-black/40 mb-2">Alert Status</div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#991b1b]" /><span className="text-[9px] font-bold text-black/60">Danger Level</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#b45309]" /><span className="text-[9px] font-bold text-black/60">Warning Level</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-[#166534]" /><span className="text-[9px] font-bold text-black/60">Normal</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Summary + Table */}
        <div className="xl:w-[55%] flex flex-col gap-4 min-h-0">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex flex-col items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mb-1" />
              <div className="text-2xl font-serif text-[#991b1b] font-bold">{dangerCount}</div>
              <div className="text-[8px] font-bold tracking-widest uppercase text-red-400 mt-1">Above Danger</div>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex flex-col items-center">
              <Waves className="w-5 h-5 text-amber-600 mb-1" />
              <div className="text-2xl font-serif text-[#b45309] font-bold">{warningCount}</div>
              <div className="text-[8px] font-bold tracking-widest uppercase text-amber-400 mt-1">Above Warning</div>
            </div>
            <div className="bg-[#0B3D3D]/5 border border-[#0B3D3D]/10 rounded-2xl p-4 flex flex-col items-center">
              <Shield className="w-5 h-5 text-[#0B3D3D] mb-1" />
              <div className="text-2xl font-serif text-[#0B3D3D] font-bold">{avgBreach}%</div>
              <div className="text-[8px] font-bold tracking-widest uppercase text-[#0B3D3D]/50 mt-1">Avg Breach Risk</div>
            </div>
          </div>

          {/* Data Table */}
          <div ref={tableRef} className="flex-1 bg-white/60 backdrop-blur-md rounded-[1.5rem] border border-black/5 shadow-xl shadow-black/5 overflow-hidden flex flex-col min-h-0">
            <div className="overflow-x-auto overflow-y-auto flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                <thead className="sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                  <tr className="border-b border-black/10">
                    <th className="px-4 py-3 text-[8px] text-black/40 font-bold uppercase tracking-widest">Station</th>
                    <th className="px-4 py-3 text-[8px] text-black/40 font-bold uppercase tracking-widest">River</th>
                    <th className="px-4 py-3 text-[8px] text-black/40 font-bold uppercase tracking-widest">District</th>
                    <th className="px-4 py-3 text-[8px] text-black/40 font-bold uppercase tracking-widest text-center">Level (m)</th>
                    <th className="px-4 py-3 text-[8px] text-black/40 font-bold uppercase tracking-widest text-center">DL (m)</th>
                    <th className="px-4 py-3 text-[8px] text-black/40 font-bold uppercase tracking-widest text-center">Trend</th>
                    <th className="px-4 py-3 text-[8px] text-black/40 font-bold uppercase tracking-widest text-center">Breach</th>
                    <th className="px-4 py-3 text-[8px] text-black/40 font-bold uppercase tracking-widest text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {stations.map((s, i) => {
                    const isActive = selected === s.station;
                    const levelPct = Math.min(100, (s.current_level / s.hfl) * 100);
                    const barColor = s.alert_type === 'Above Danger Level' ? '#991b1b'
                      : s.alert_type === 'Above Warning Level' ? '#b45309' : '#0B3D3D';

                    return (
                      <motion.tr
                        id={`row-${s.station.replace(/\s/g, '-')}`}
                        key={s.station}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => { setSelected(s.station); }}
                        className={`cursor-pointer transition-all duration-200 ${isActive ? 'bg-[#0B3D3D]/5 ring-1 ring-[#0B3D3D]/20' : 'hover:bg-black/[0.02]'}`}
                      >
                        <td className="px-4 py-3">
                          <div className="text-xs font-bold text-[#1A1D1A]">{s.station}</div>
                          <div className="text-[8px] text-black/30 font-bold uppercase tracking-widest">{s.basin}</div>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-black/60 font-medium">{s.river}</td>
                        <td className="px-4 py-3 text-[11px] text-black/60 font-medium">{s.district}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-xs font-bold font-mono text-[#1A1D1A]">{s.current_level}</div>
                          <div className="w-16 h-1 bg-black/10 rounded-full overflow-hidden mt-1 mx-auto">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${levelPct}%`, backgroundColor: barColor }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-mono text-black/50">{s.danger_level}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <TrendIcon trend={s.trend} />
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${s.trend === 'Rising' ? 'text-red-600' : s.trend === 'Falling' ? 'text-green-600' : 'text-amber-600'}`}>
                              {s.trend}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-12 h-1.5 bg-black/10 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.breach_prob * 100}%`, backgroundColor: s.breach_prob > 0.6 ? '#991b1b' : s.breach_prob > 0.3 ? '#b45309' : '#166534' }} />
                            </div>
                            <span className="text-[10px] font-mono font-bold text-black/60">{(s.breach_prob * 100).toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center"><AlertPill type={s.alert_type} /></td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Footer */}
            <div className="shrink-0 px-4 py-2 border-t border-black/5 bg-white/80 flex items-center justify-between">
              <div className="text-[8px] font-bold uppercase tracking-widest text-black/30 flex items-center gap-2">
                <Activity className="w-3 h-3" /> ML-Powered Predictions · XGBoost Models
              </div>
              <div className="text-[8px] font-bold uppercase tracking-widest text-black/30">
                {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
