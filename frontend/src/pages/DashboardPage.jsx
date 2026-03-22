import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, listShelters } from '../services/api';
import {
    Droplets, Users, Truck, Home, AlertTriangle,
    Waves, Activity, CloudRain, LifeBuoy, Gauge
} from 'lucide-react';

const SEVERITY_COLORS = {
    catastrophic: '#ff2d55',
    severe: '#ff6b35',
    moderate: '#ffc947',
    low: '#00e5a0',
};

function StatCard({ icon: Icon, label, value, sub, color = '#38bdf8', bg }) {
    return (
        <div className="glass" style={{
            padding: '18px 20px', borderRadius: 14,
            border: `1px solid ${color}22`,
            background: bg || `${color}08`,
            minWidth: 0,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: `${color}18`, border: `1px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Icon size={16} style={{ color }} />
                </div>
                <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text1)', lineHeight: 1 }} className="mono">{value}</div>
            {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
        </div>
    );
}

export default function DashboardPage() {
    const { data: stats } = useQuery({ queryKey: ['dashboard'], queryFn: () => getDashboardStats().then(r => r.data) });
    const { data: shelters } = useQuery({ queryKey: ['shelters'], queryFn: () => listShelters().then(r => r.data) });

    const inc = stats?.flood_incidents || {};
    const res = stats?.resources || {};
    const sh = stats?.shelters || {};
    const perf = stats?.performance || {};
    const wl = stats?.water_levels || {};

    const resourcesByType = res.by_type || {};

    return (
        <div style={{ padding: 24 }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', margin: 0 }}>
                    <Waves size={20} style={{ color: '#38bdf8', marginRight: 8, verticalAlign: 'text-bottom' }} />
                    Flood Operations Dashboard
                </h1>
                <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>
                    Chennai Urban Flood Response — Real-time monitoring and dispatch
                </p>
            </div>

            {/* Top Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                <StatCard icon={Droplets} label="Active Floods" value={inc.active || 0} sub={`${inc.today || 0} today · ${inc.total || 0} total`} color="#38bdf8" />
                <StatCard icon={AlertTriangle} label="Catastrophic" value={inc.catastrophic_active || 0} sub={`${inc.people_stranded || 0} people stranded`} color="#ff2d55" />
                <StatCard icon={Truck} label="Resources Available" value={res.available || 0} sub={`${res.busy || 0} deployed · ${res.total || 0} total`} color="#00e5a0" />
                <StatCard icon={Home} label="Shelter Occupancy" value={`${sh.occupancy_pct || 0}%`} sub={`${sh.current_occupancy || 0} / ${sh.total_capacity || 0}`} color="#a78bfa" />
                <StatCard icon={CloudRain} label="Zones Flooded" value={wl.zones_flooded || 0} sub="Water level > 0.3m" color="#ffc947" />
                <StatCard icon={Gauge} label="Avg Response" value={`${perf.avg_response_time_min || 0}m`} sub="Response time (last hour)" color="#4f8ef0" />
            </div>

            {/* Resource Breakdown */}
            <div className="glass" style={{ padding: 20, borderRadius: 14, marginBottom: 24, border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>
                    <LifeBuoy size={14} style={{ color: '#00e5a0', marginRight: 8, verticalAlign: 'text-bottom' }} />
                    Rescue Resource Deployment
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    {Object.entries(resourcesByType).map(([type, data]) => {
                        const pct = data.total > 0 ? Math.round((data.busy || 0) / data.total * 100) : 0;
                        const typeLabel = type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                        return (
                            <div key={type} style={{
                                padding: '12px 14px', borderRadius: 10,
                                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                            }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>{typeLabel}</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                                    <span className="mono" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text1)' }}>{data.busy || 0}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>/ {data.total || 0} deployed</span>
                                </div>
                                <div style={{ marginTop: 8, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }}>
                                    <div style={{
                                        height: '100%', borderRadius: 99, width: `${pct}%`,
                                        background: pct > 80 ? '#ff4060' : pct > 50 ? '#ffc947' : '#00e5a0',
                                        transition: 'width 0.5s ease',
                                    }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Shelters */}
            {shelters && shelters.length > 0 && (
                <div className="glass" style={{ padding: 20, borderRadius: 14, border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>
                        <Home size={14} style={{ color: '#a78bfa', marginRight: 8, verticalAlign: 'text-bottom' }} />
                        Flood Shelters ({shelters.length})
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                        {shelters.slice(0, 8).map(s => {
                            const pct = s.total_capacity > 0 ? Math.round(s.current_occupancy / s.total_capacity * 100) : 0;
                            return (
                                <div key={s.id} style={{
                                    padding: '10px 14px', borderRadius: 10,
                                    background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                                    display: 'flex', alignItems: 'center', gap: 12,
                                }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                                            {s.current_occupancy}/{s.total_capacity} · {s.has_medical_facility ? '🏥' : ''} {s.has_food_supply ? '🍚' : ''} {s.has_power_backup ? '⚡' : ''}
                                        </div>
                                    </div>
                                    <div className="mono" style={{
                                        fontSize: 13, fontWeight: 700,
                                        color: pct > 80 ? '#ff4060' : pct > 50 ? '#ffc947' : '#00e5a0',
                                    }}>{pct}%</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
