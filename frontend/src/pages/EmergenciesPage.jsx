import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listFloodIncidents } from '../services/api';
import { Droplets, AlertTriangle, Users, MapPin, Filter, ChevronDown } from 'lucide-react';

const SEVERITY_COLORS = {
    catastrophic: '#ff2d55', severe: '#ff6b35',
    moderate: '#ffc947', low: '#00e5a0',
};

const STATUS_COLORS = {
    pending: '#ffc947', dispatched: '#38bdf8',
    in_progress: '#4f8ef0', evacuating: '#a78bfa',
    resolved: '#00e5a0', cancelled: '#666',
};

export default function EmergenciesPage() {
    const [filters, setFilters] = useState({ severity: '', status: '', page: 1 });

    const { data, isLoading } = useQuery({
        queryKey: ['floodIncidents', filters],
        queryFn: () => listFloodIncidents(filters).then(r => r.data),
    });

    const incidents = data?.items || [];
    const total = data?.total || 0;

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', margin: 0 }}>
                        <Droplets size={20} style={{ color: '#38bdf8', marginRight: 8, verticalAlign: 'text-bottom' }} />
                        Flood Incidents
                    </h1>
                    <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>{total} total incidents</p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {['', 'catastrophic', 'severe', 'moderate', 'low'].map(sev => (
                        <button key={sev} onClick={() => setFilters(f => ({ ...f, severity: sev, page: 1 }))}
                            style={{
                                padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                                border: `1px solid ${filters.severity === sev ? (SEVERITY_COLORS[sev] || '#38bdf8') + '55' : 'var(--border)'}`,
                                background: filters.severity === sev ? (SEVERITY_COLORS[sev] || '#38bdf8') + '15' : 'transparent',
                                color: filters.severity === sev ? (SEVERITY_COLORS[sev] || '#38bdf8') : 'var(--text3)',
                                cursor: 'pointer', textTransform: 'capitalize',
                            }}>
                            {sev || 'All'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Status filter */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {['', 'pending', 'dispatched', 'in_progress', 'evacuating', 'resolved'].map(st => (
                    <button key={st} onClick={() => setFilters(f => ({ ...f, status: st, page: 1 }))}
                        style={{
                            padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                            border: `1px solid ${filters.status === st ? '#38bdf8' + '55' : 'var(--border)'}`,
                            background: filters.status === st ? '#38bdf855' + '15' : 'transparent',
                            color: filters.status === st ? STATUS_COLORS[st] || '#38bdf8' : 'var(--text3)',
                            cursor: 'pointer', textTransform: 'capitalize',
                        }}>
                        {st || 'All Status'}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="glass" style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            {['ID', 'Location', 'Flood Type', 'Water Level', 'Severity', 'Status', 'People', 'Reported'].map(h => (
                                <th key={h} style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'left' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {incidents.map(inc => (
                            <tr key={inc.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text2)' }} className="mono">#{inc.id}</td>
                                <td style={{ padding: '10px 14px' }}>
                                    <div style={{ fontSize: 12, color: 'var(--text1)', fontWeight: 500 }}>{inc.address || `${inc.latitude?.toFixed(4)}, ${inc.longitude?.toFixed(4)}`}</div>
                                </td>
                                <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text2)', textTransform: 'capitalize' }}>{inc.flood_type}</td>
                                <td style={{ padding: '10px 14px' }}>
                                    <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: (inc.water_level_m || 0) > 1.5 ? '#ff4060' : '#38bdf8' }}>
                                        {(inc.water_level_m || 0).toFixed(1)}m
                                    </span>
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                    <span style={{
                                        padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
                                        background: (SEVERITY_COLORS[inc.predicted_severity] || '#666') + '20',
                                        color: SEVERITY_COLORS[inc.predicted_severity] || '#666',
                                        border: `1px solid ${(SEVERITY_COLORS[inc.predicted_severity] || '#666')}40`,
                                    }}>{inc.predicted_severity}</span>
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                    <span style={{
                                        padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                                        background: (STATUS_COLORS[inc.status] || '#666') + '15',
                                        color: STATUS_COLORS[inc.status] || '#666',
                                    }}>{inc.status}</span>
                                </td>
                                <td style={{ padding: '10px 14px' }}>
                                    <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                                        <Users size={11} style={{ marginRight: 4, verticalAlign: 'text-bottom' }} />
                                        {inc.people_stranded || 0} stranded
                                    </span>
                                </td>
                                <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text3)' }}>
                                    {inc.reported_at ? new Date(inc.reported_at).toLocaleDateString() : '-'}
                                </td>
                            </tr>
                        ))}
                        {incidents.length === 0 && (
                            <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>No flood incidents found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {total > 20 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                    <button onClick={() => setFilters(f => ({ ...f, page: Math.max(1, f.page - 1) }))} disabled={filters.page <= 1}
                        className="btn btn-ghost" style={{ fontSize: 12 }}>← Prev</button>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--text3)', padding: '6px 12px' }}>
                        Page {filters.page} / {Math.ceil(total / 20)}
                    </span>
                    <button onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} disabled={filters.page >= Math.ceil(total / 20)}
                        className="btn btn-ghost" style={{ fontSize: 12 }}>Next →</button>
                </div>
            )}
        </div>
    );
}
