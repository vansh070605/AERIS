import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getResponseEfficiency, getResourceUtilization, getZoneRisk } from '../services/api';
import { BarChart3, Droplets, Truck, MapPin, AlertTriangle, TrendingDown } from 'lucide-react';

const SEVERITY_COLORS = { catastrophic: '#ff2d55', severe: '#ff6b35', moderate: '#ffc947', low: '#00e5a0' };

export default function AnalyticsPage() {
    const { data: efficiency } = useQuery({ queryKey: ['responseEfficiency'], queryFn: () => getResponseEfficiency({}).then(r => r.data) });
    const { data: utilization } = useQuery({ queryKey: ['resourceUtilization'], queryFn: () => getResourceUtilization().then(r => r.data) });
    const { data: zoneRisk } = useQuery({ queryKey: ['zoneRisk'], queryFn: () => getZoneRisk().then(r => r.data) });

    const bySeverity = efficiency?.by_severity || {};
    const resUtil = utilization?.resource_utilization || {};
    const zones = zoneRisk?.zone_metrics || [];

    return (
        <div style={{ padding: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', margin: 0, marginBottom: 20 }}>
                <BarChart3 size={20} style={{ color: '#a78bfa', marginRight: 8, verticalAlign: 'text-bottom' }} />
                Flood Response Analytics
            </h1>

            {/* Response Time by Severity */}
            <div className="glass" style={{ padding: 20, borderRadius: 14, marginBottom: 20, border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>
                    <TrendingDown size={14} style={{ color: '#38bdf8', marginRight: 8 }} />
                    Response Time by Flood Severity
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    {Object.entries(bySeverity).map(([sev, data]) => (
                        <div key={sev} style={{
                            padding: '14px 16px', borderRadius: 10,
                            background: (SEVERITY_COLORS[sev] || '#38bdf8') + '08',
                            border: `1px solid ${(SEVERITY_COLORS[sev] || '#38bdf8')}25`,
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: SEVERITY_COLORS[sev] || '#38bdf8', textTransform: 'uppercase', marginBottom: 8 }}>{sev}</div>
                            <div className="mono" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text1)' }}>{data.avg?.toFixed(1) || 0}<span style={{ fontSize: 12, color: 'var(--text3)' }}> min</span></div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                                {data.count || 0} dispatches · Min: {data.min?.toFixed(1) || 0}m · Max: {data.max?.toFixed(1) || 0}m
                            </div>
                        </div>
                    ))}
                    {Object.keys(bySeverity).length === 0 && (
                        <div style={{ padding: 20, color: 'var(--text3)', fontSize: 13 }}>No dispatch data yet. Run a simulation or report incidents to see analytics.</div>
                    )}
                </div>
            </div>

            {/* Resource Utilization */}
            <div className="glass" style={{ padding: 20, borderRadius: 14, marginBottom: 20, border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>
                    <Truck size={14} style={{ color: '#00e5a0', marginRight: 8 }} />
                    Resource Utilization by Type
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    {Object.entries(resUtil).map(([type, data]) => {
                        const pct = data.utilization_pct || 0;
                        const label = type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        const barColor = pct > 80 ? '#ff4060' : pct > 50 ? '#ffc947' : '#00e5a0';
                        return (
                            <div key={type} style={{
                                padding: '14px 16px', borderRadius: 10,
                                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)' }}>{label}</span>
                                    <span className="mono" style={{ fontSize: 16, fontWeight: 800, color: barColor }}>{pct}%</span>
                                </div>
                                <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', marginBottom: 8 }}>
                                    <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: barColor, transition: 'width 0.5s' }} />
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                                    Available: {data.available || 0} · Busy: {data.busy || 0} · Total: {data.total || 0}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Zone Risk Table */}
            <div className="glass" style={{ padding: 20, borderRadius: 14, border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>
                    <MapPin size={14} style={{ color: '#ffc947', marginRight: 8 }} />
                    Zone Flood Risk Assessment
                </h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Zone', 'Risk Score', 'Water Level', 'Elevation', 'Drainage', 'Resources', 'Shelters', 'Population', 'Underserved'].map(h => (
                                    <th key={h} style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {zones.sort((a, b) => (b.flood_risk_score || 0) - (a.flood_risk_score || 0)).map(z => {
                                const riskPct = Math.round((z.flood_risk_score || 0) * 100);
                                const riskColor = riskPct > 70 ? '#ff2d55' : riskPct > 50 ? '#ff6b35' : riskPct > 30 ? '#ffc947' : '#00e5a0';
                                return (
                                    <tr key={z.zone_id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '8px 10px' }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)' }}>{z.zone_name}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text3)' }}>{z.code}</div>
                                        </td>
                                        <td style={{ padding: '8px 10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <div style={{ width: 40, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                                                    <div style={{ width: `${riskPct}%`, height: '100%', borderRadius: 99, background: riskColor }} />
                                                </div>
                                                <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: riskColor }}>{riskPct}%</span>
                                            </div>
                                        </td>
                                        <td className="mono" style={{ padding: '8px 10px', fontSize: 12, color: (z.current_water_level_m || 0) > 1 ? '#ff4060' : '#38bdf8' }}>{(z.current_water_level_m || 0).toFixed(1)}m</td>
                                        <td className="mono" style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text2)' }}>{z.elevation_m}m</td>
                                        <td className="mono" style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text2)' }}>{z.drainage_capacity_m3s} m³/s</td>
                                        <td className="mono" style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text2)' }}>{z.total_resources || 0}</td>
                                        <td className="mono" style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text2)' }}>{z.shelter_capacity || 0}</td>
                                        <td className="mono" style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text2)' }}>{(z.population || 0).toLocaleString()}</td>
                                        <td style={{ padding: '8px 10px' }}>
                                            {z.is_underserved ? (
                                                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#ff206020', color: '#ff2d55', border: '1px solid #ff2d5540' }}>⚠ At Risk</span>
                                            ) : (
                                                <span style={{ fontSize: 10, color: 'var(--text3)' }}>Adequate</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
