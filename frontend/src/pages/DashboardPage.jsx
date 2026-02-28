import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Truck, Clock, Zap, Activity, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Legend,
} from 'recharts';
import { getDashboardStats, listEmergencies, getResourceAvailability } from '../services/api';

const SEV_COLOR = { low: '#00e5a0', medium: '#ffc947', high: '#ff8c42', critical: '#ff4060' };
const SEV_LABEL_COLOR = { low: 'var(--green)', medium: 'var(--yellow)', high: 'var(--orange)', critical: 'var(--red)' };

const TOOLTIP_STYLE = {
    background: 'rgba(11,18,33,0.97)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    fontSize: 12,
    color: 'var(--text1)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

function StatCard({ icon: Icon, label, value, sub, color, trend }) {
    const colors = {
        red: { accent: 'var(--red)', bg: 'var(--red-dim)', border: 'rgba(255,64,96,0.2)', glow: 'var(--red-glow)' },
        green: { accent: 'var(--green)', bg: 'var(--green-dim)', border: 'rgba(0,229,160,0.2)', glow: 'var(--green-glow)' },
        orange: { accent: 'var(--orange)', bg: 'var(--orange-dim)', border: 'rgba(255,140,66,0.2)', glow: '' },
        cyan: { accent: 'var(--cyan)', bg: 'var(--cyan-dim)', border: 'rgba(0,212,255,0.2)', glow: 'var(--cyan-glow)' },
    };
    const c = colors[color] || colors.cyan;

    return (
        <div className="animate-fade-up" style={{
            background: 'rgba(11,18,33,0.7)',
            border: `1px solid ${c.border}`,
            borderRadius: 16,
            padding: '20px 22px',
            position: 'relative',
            overflow: 'hidden',
            transition: 'box-shadow 0.25s',
        }}
            onMouseEnter={e => { if (c.glow) e.currentTarget.style.boxShadow = c.glow; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
        >
            {/* Top accent line */}
            <div style={{ position: 'absolute', top: 0, right: 0, left: '40%', height: 2, background: `linear-gradient(90deg, transparent, ${c.accent})` }} />

            {/* Background icon watermark */}
            <div style={{ position: 'absolute', right: -8, bottom: -8, opacity: 0.04 }}>
                <Icon size={80} />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                        {label}
                    </p>
                    <p style={{ fontSize: 36, fontWeight: 800, color: 'var(--text1)', lineHeight: 1, letterSpacing: '-0.03em', fontFamily: 'JetBrains Mono', marginBottom: 6 }}>
                        {value ?? '—'}
                    </p>
                    {sub && <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>{sub}</p>}
                </div>
                <div style={{
                    width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                    background: c.bg, border: `1px solid ${c.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: c.accent,
                }}>
                    <Icon size={18} />
                </div>
            </div>

            {trend !== undefined && (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: trend >= 0 ? 'var(--red)' : 'var(--green)' }}>
                    {trend >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                    <span style={{ fontWeight: 600 }}>{Math.abs(trend)}% from last hour</span>
                </div>
            )}
        </div>
    );
}

function EmergencyRow({ e, delay = 0 }) {
    const sev = e.predicted_severity || 'medium';
    return (
        <div className="animate-fade-up" style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 16px',
            borderRadius: 10,
            background: sev === 'critical' ? 'rgba(255,64,96,0.05)' : 'rgba(255,255,255,0.025)',
            border: `1px solid ${sev === 'critical' ? 'rgba(255,64,96,0.2)' : 'rgba(255,255,255,0.06)'}`,
            transition: 'background 0.15s',
            animationDelay: `${delay}ms`,
        }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={el => { el.currentTarget.style.background = sev === 'critical' ? 'rgba(255,64,96,0.05)' : 'rgba(255,255,255,0.025)'; }}
        >
            <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: SEV_COLOR[sev] || '#555',
                boxShadow: `0 0 8px ${SEV_COLOR[sev] || '#555'}`,
                animation: sev === 'critical' ? 'pulse-dot 1.2s ease-in-out infinite' : 'none',
            }} />
            <span className="type-badge" style={{ flexShrink: 0 }}>
                <span className={`type-${e.emergency_type}`}>{e.emergency_type}</span>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: SEV_LABEL_COLOR[sev], display: 'inline', marginRight: 8 }}>
                    {sev?.toUpperCase()}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline' }}>
                    {e.address || `${e.latitude?.toFixed(3)}, ${e.longitude?.toFixed(3)}`}
                </span>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                    #{e.id} · {e.people_affected} affected
                </div>
            </div>
            <StatusPill status={e.status} />
        </div>
    );
}

function StatusPill({ status }) {
    const map = {
        pending: { cls: 'pill-yellow', label: 'Pending' },
        dispatched: { cls: 'pill-blue', label: 'Dispatched' },
        in_progress: { cls: 'pill-orange', label: 'Active' },
        resolved: { cls: 'pill-green', label: 'Resolved' },
        cancelled: { cls: 'pill-gray', label: 'Cancelled' },
    };
    const m = map[status] || { cls: 'pill-gray', label: status };
    return <span className={`pill ${m.cls}`} style={{ flexShrink: 0 }}>{m.label}</span>;
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={TOOLTIP_STYLE}>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontWeight: 600 }}>{label}</p>
            {payload.map(p => (
                <div key={p.name} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.fill }} />
                    <span style={{ color: 'var(--text2)', fontSize: 11 }}>{p.name}:</span>
                    <span style={{ color: 'var(--text1)', fontWeight: 700, fontSize: 12, fontFamily: 'JetBrains Mono' }}>{p.value}</span>
                </div>
            ))}
        </div>
    );
};

export default function DashboardPage() {
    const { data: stats } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: () => getDashboardStats().then(r => r.data),
        refetchInterval: 8000,
    });

    const { data: emergencies } = useQuery({
        queryKey: ['emergencies', 'latest'],
        queryFn: () => listEmergencies({ page: 1, page_size: 20 }).then(r => r.data),
        refetchInterval: 5000,
    });

    const { data: availability } = useQuery({
        queryKey: ['resource-availability'],
        queryFn: () => getResourceAvailability().then(r => r.data),
        refetchInterval: 8000,
    });

    const severityData = emergencies?.items
        ? Object.entries(
            emergencies.items.reduce((a, e) => {
                const s = e.predicted_severity || 'unknown';
                a[s] = (a[s] || 0) + 1;
                return a;
            }, {})
        ).map(([name, value]) => ({ name, value }))
        : [];

    const resourceData = availability?.by_type
        ? Object.entries(availability.by_type).map(([type, s]) => ({
            name: type.replace(/_/g, ' '),
            Available: s.available || 0,
            Busy: s.busy || 0,
            Maintenance: s.maintenance || 0,
        }))
        : [];

    return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1600 }}>

            {/* Header */}
            <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', letterSpacing: '-0.03em', marginBottom: 4 }}>
                        Emergency Command Dashboard
                    </h1>
                    <p style={{ fontSize: 12, color: 'var(--text3)' }}>Real-time situational awareness &middot; Auto-refreshes every 5s</p>
                </div>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.25)',
                    borderRadius: 10, padding: '8px 14px',
                }}>
                    <Activity size={13} style={{ color: 'var(--green)' }} className="animate-pulse-slow" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        System Operational
                    </span>
                </div>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <StatCard icon={AlertTriangle} label="Active Emergencies" value={stats?.emergencies?.active ?? 0}
                    sub={`${stats?.emergencies?.today ?? 0} reported today`} color="red" />
                <StatCard icon={Truck} label="Resources Available" value={stats?.resources?.available ?? 0}
                    sub={`${stats?.resources?.busy ?? 0} currently deployed`} color="green" />
                <StatCard icon={Clock} label="Avg Response Time"
                    value={stats?.performance?.avg_response_time_min ? `${stats.performance.avg_response_time_min}m` : '—'}
                    sub="last hour average" color="orange" />
                <StatCard icon={Zap} label="Critical Incidents" value={stats?.emergencies?.critical_active ?? 0}
                    sub="requiring immediate response" color="red" />
            </div>

            {/* Middle row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>

                {/* Live feed */}
                <div style={{ background: 'rgba(11,18,33,0.6)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 8px var(--red)', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
                            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Live Emergency Feed</h2>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono', fontWeight: 500 }}>
                            {emergencies?.total ?? 0} total incidents
                        </span>
                    </div>
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto' }}>
                        {emergencies?.items?.slice(0, 10).map((e, i) => (
                            <EmergencyRow key={e.id} e={e} delay={i * 50} />
                        ))}
                        {(!emergencies?.items?.length) && (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                                <Activity size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                                <p>No active emergencies</p>
                                <p style={{ fontSize: 11, marginTop: 4 }}>System monitoring all zones</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Severity donut */}
                <div style={{ background: 'rgba(11,18,33,0.6)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 20px' }}>
                    <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>Severity Distribution</h2>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>Current incident breakdown</p>

                    {severityData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={severityData} cx="50%" cy="50%" innerRadius={52} outerRadius={80} dataKey="value" paddingAngle={3} strokeWidth={0}>
                                        {severityData.map(e => (
                                            <Cell key={e.name} fill={SEV_COLOR[e.name] || '#334'} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [v, n.toUpperCase()]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                                {severityData.map(d => (
                                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: SEV_COLOR[d.name] || '#555', flexShrink: 0, boxShadow: `0 0 6px ${SEV_COLOR[d.name]}` }} />
                                        <span style={{ fontSize: 12, color: 'var(--text2)', flex: 1, textTransform: 'capitalize' }}>{d.name}</span>
                                        <span style={{ fontSize: 12, color: 'var(--text1)', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>{d.value}</span>
                                        <div style={{ width: 48, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', borderRadius: 99,
                                                width: `${Math.round((d.value / (emergencies?.total || 1)) * 100)}%`,
                                                background: SEV_COLOR[d.name],
                                            }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', gap: 8 }}>
                            <TrendingUp size={28} style={{ opacity: 0.3 }} />
                            <p style={{ fontSize: 12 }}>No data yet</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Resource utilization */}
            <div style={{ background: 'rgba(11,18,33,0.6)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 20px' }}>
                <div style={{ marginBottom: 16 }}>
                    <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>Resource Fleet Status</h2>
                    <p style={{ fontSize: 11, color: 'var(--text3)' }}>Utilisation by unit type</p>
                </div>
                {resourceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={resourceData} barSize={14} barGap={3}>
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text3)', fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: 'var(--text3)', fontFamily: 'Inter' }} axisLine={false} tickLine={false} width={30} />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text2)', paddingTop: 8 }} />
                            <Bar dataKey="Available" fill="var(--green)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Busy" fill="var(--orange)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Maintenance" fill="var(--yellow)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13, gap: 10 }}>
                        <Truck size={20} style={{ opacity: 0.3 }} />
                        Loading resource data…
                    </div>
                )}
            </div>
        </div>
    );
}
