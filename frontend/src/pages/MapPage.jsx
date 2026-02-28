import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import { getHeatmap, listResources } from '../services/api';
import { Layers, AlertTriangle, Truck } from 'lucide-react';

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const SEV_COLOR = {
    low: '#00e5a0',
    medium: '#ffc947',
    high: '#ff8c42',
    critical: '#ff4060',
    default: '#4f8ef0',
};

const RES_COLOR = {
    ambulance: '#4f8ef0',
    fire_truck: '#ff8c42',
    police_unit: '#a78bfa',
    rescue_team: '#00e5a0',
    hazmat_unit: '#ffc947',
};

const RES_EMOJI = {
    ambulance: '🚑', fire_truck: '🚒', police_unit: '🚓', rescue_team: '🛟', hazmat_unit: '☢️',
};

function makeEmergencyIcon(sev) {
    const color = SEV_COLOR[sev] || SEV_COLOR.default;
    const size = sev === 'critical' ? 22 : 16;
    const pulse = sev === 'critical' ? `animation:em-pulse 1.4s ease-in-out infinite;` : '';
    return L.divIcon({
        className: '',
        html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${color};
      border:2px solid ${color}aa;
      box-shadow:0 0 ${sev === 'critical' ? 16 : 8}px ${color}99;
      ${pulse}
    "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}

function makeResourceIcon(type, status) {
    const color = RES_COLOR[type] || '#7890b8';
    const emoji = RES_EMOJI[type] || '🚨';
    const dim = status === 'busy' ? 'filter:brightness(0.7)' : '';
    return L.divIcon({
        className: '',
        html: `<div style="
      width:34px;height:34px;border-radius:50%;
      background:${color}1a;
      border:2px solid ${color};
      display:flex;align-items:center;justify-content:center;
      font-size:16px;
      box-shadow:0 0 12px ${color}55;
      ${dim}
    ">${emoji}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
    });
}

const popupStyle = {
    background: 'rgba(11,18,33,0.97)',
    color: '#f0f4ff',
    padding: '12px 14px',
    borderRadius: 12,
    minWidth: 170,
    fontSize: 12,
};

const detailRow = (label, value, valueColor = '#f0f4ff') => `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
    <span style="color:#7890b8;font-size:11px">${label}</span>
    <span style="color:${valueColor};font-weight:600;font-family:'JetBrains Mono',monospace;font-size:11px">${value}</span>
  </div>
`;

export default function MapPage() {
    const [timeWindow, setTimeWindow] = useState(24);
    const [filterType, setFilterType] = useState('');
    const [showRes, setShowRes] = useState(true);
    const [showEm, setShowEm] = useState(true);

    const { data: heatmap, isLoading } = useQuery({
        queryKey: ['heatmap', timeWindow, filterType],
        queryFn: () => getHeatmap({ hours: timeWindow, emergency_type: filterType || undefined }).then(r => r.data),
        refetchInterval: 15000,
    });

    const { data: resData } = useQuery({
        queryKey: ['resources-map'],
        queryFn: () => listResources({ page_size: 100 }).then(r => r.data),
        refetchInterval: 15000,
    });

    const emergencies = heatmap?.points || [];
    const resources = resData?.items || [];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

            {/* ── Toolbar ───────────────────────────── */}
            <div style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
                padding: '0 20px', height: 52,
                background: 'rgba(8,13,26,0.85)',
                borderBottom: '1px solid var(--border)',
                backdropFilter: 'blur(16px)',
            }}>
                <Layers size={15} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', marginRight: 4 }}>Live Map</span>

                {/* Time window buttons */}
                <div style={{ display: 'flex', gap: 4 }}>
                    {[6, 24, 72].map(h => (
                        <button key={h} onClick={() => setTimeWindow(h)} style={{
                            padding: '4px 12px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            border: `1px solid ${timeWindow === h ? 'rgba(0,212,255,0.5)' : 'var(--border)'}`,
                            background: timeWindow === h ? 'rgba(0,212,255,0.12)' : 'transparent',
                            color: timeWindow === h ? 'var(--cyan)' : 'var(--text3)',
                            transition: 'all 0.15s',
                        }}>
                            {h}h
                        </button>
                    ))}
                </div>

                {/* Type filter */}
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="form-input" style={{ width: 130, padding: '4px 10px', fontSize: 11 }}>
                    <option value="">All Types</option>
                    {['medical', 'fire', 'accident', 'flood', 'crime'].map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                </select>

                {/* Layer toggles */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
                    {[
                        { label: 'Emergencies', Icon: AlertTriangle, color: 'var(--red)', checked: showEm, set: setShowEm },
                        { label: 'Resources', Icon: Truck, color: 'var(--cyan)', checked: showRes, set: setShowRes },
                    ].map(({ label, Icon, color, checked, set }) => (
                        <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 12, color: checked ? 'var(--text1)' : 'var(--text3)', userSelect: 'none' }}>
                            <div style={{
                                width: 16, height: 16, borderRadius: 4, border: `2px solid ${checked ? color : 'var(--border)'}`,
                                background: checked ? color + '22' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.15s',
                            }}>
                                {checked && <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />}
                            </div>
                            <input type="checkbox" checked={checked} onChange={e => set(e.target.checked)} style={{ display: 'none' }} />
                            <Icon size={11} style={{ color }} />
                            {label}
                        </label>
                    ))}
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono', paddingLeft: 8, borderLeft: '1px solid var(--border)' }}>
                        {emergencies.length} incidents · {resources.length} resources
                    </span>
                </div>
            </div>

            {/* ── Map ───────────────────────────────── */}
            <div style={{ flex: 1, position: 'relative' }}>
                <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ height: '100%', width: '100%' }} zoomControl={true}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />

                    {/* Emergency markers */}
                    {showEm && emergencies.map(e => (
                        <React.Fragment key={e.id}>
                            <Circle center={[e.lat, e.lon]} radius={e.intensity * 900}
                                pathOptions={{ color: SEV_COLOR[e.severity] || SEV_COLOR.default, fillColor: SEV_COLOR[e.severity] || SEV_COLOR.default, fillOpacity: 0.12, weight: 1, opacity: 0.35 }}
                            />
                            <Marker position={[e.lat, e.lon]} icon={makeEmergencyIcon(e.severity)}>
                                <Popup>
                                    <div style={popupStyle}>
                                        <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 6 }}>
                                            Emergency #{e.id}
                                        </div>
                                        <div dangerouslySetInnerHTML={{
                                            __html:
                                                detailRow('Type', e.type || '—') +
                                                detailRow('Severity', (e.severity || 'unknown').toUpperCase(), SEV_COLOR[e.severity] || 'var(--text1)') +
                                                detailRow('People', e.people_affected ?? '—') +
                                                detailRow('Status', e.status || '—')
                                        }} />
                                    </div>
                                </Popup>
                            </Marker>
                        </React.Fragment>
                    ))}

                    {/* Resource markers */}
                    {showRes && resources.map(r => (
                        <Marker key={`r-${r.id}`} position={[r.latitude, r.longitude]} icon={makeResourceIcon(r.resource_type, r.status)}>
                            <Popup>
                                <div style={popupStyle}>
                                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 6 }}>
                                        {r.name}
                                    </div>
                                    <div dangerouslySetInnerHTML={{
                                        __html:
                                            detailRow('Type', (r.resource_type || '—').replace(/_/g, ' ')) +
                                            detailRow('Status', r.status || '—', r.status === 'available' ? 'var(--green)' : r.status === 'busy' ? 'var(--orange)' : 'var(--yellow)') +
                                            detailRow('ID', r.vehicle_id || '—') +
                                            detailRow('Crew', r.crew_count ?? '—')
                                    }} />
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>

                {/* ── Legend ─────────────────────────── */}
                <div style={{
                    position: 'absolute', bottom: 24, left: 16, zIndex: 1000,
                    background: 'rgba(8,13,26,0.9)',
                    border: '1px solid var(--border)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    backdropFilter: 'blur(20px)',
                    minWidth: 160,
                }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                        Legend
                    </div>

                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Severity
                    </div>
                    {Object.entries(SEV_COLOR).filter(([k]) => k !== 'default').map(([sev, color]) => (
                        <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'capitalize' }}>{sev}</span>
                        </div>
                    ))}

                    <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }} />

                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Resources
                    </div>
                    {Object.entries(RES_COLOR).map(([type, color]) => (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: 'var(--text2)' }}>{type.replace(/_/g, ' ')}</span>
                        </div>
                    ))}
                </div>

                {/* Loading pill */}
                {isLoading && (
                    <div style={{
                        position: 'absolute', top: 16, right: 16, zIndex: 1000,
                        background: 'rgba(8,13,26,0.9)',
                        border: '1px solid rgba(0,212,255,0.3)',
                        borderRadius: 99, padding: '6px 14px',
                        fontSize: 11, color: 'var(--cyan)', fontWeight: 600,
                    }}>
                        Updating map data…
                    </div>
                )}
            </div>

            {/* Inject pulse keyframe */}
            <style>{`
        @keyframes em-pulse {
          0%,100% { transform:scale(1); opacity:1; }
          50%      { transform:scale(1.35); opacity:0.6; }
        }
      `}</style>
        </div>
    );
}
