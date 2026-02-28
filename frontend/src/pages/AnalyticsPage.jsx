import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart2, AlertOctagon, MapPin, Clock, Activity,
    TrendingUp, TrendingDown, Shield
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
    LineChart, Line, Area, AreaChart
} from 'recharts';
import { getEquity, getResponseTimes, getEarlyWarnings } from '../services/api';

const TOOLTIP_STYLE = {
    background: 'rgba(11,18,33,0.97)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    fontSize: 12,
    color: 'var(--text1)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

function MetricCard({ icon: Icon, label, value, sub, color = 'var(--cyan)', glow }) {
    return (
        <div className="animate-fade-up" style={{
            background: 'rgba(11,18,33,0.7)',
            border: `1px solid ${color}25`,
            borderRadius: 14,
            padding: '18px 20px',
            transition: 'box-shadow 0.25s',
            position: 'relative',
            overflow: 'hidden',
        }}
            onMouseEnter={e => { if (glow) e.currentTarget.style.boxShadow = glow; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
        >
            <div style={{ position: 'absolute', top: 0, right: 0, width: '55%', height: 2, background: `linear-gradient(90deg, transparent, ${color})` }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</p>
                    <p style={{ fontSize: 30, fontWeight: 800, color: 'var(--text1)', fontFamily: 'JetBrains Mono', letterSpacing: '-0.04em', marginBottom: 4 }}>{value ?? '—'}</p>
                    {sub && <p style={{ fontSize: 11, color: 'var(--text3)' }}>{sub}</p>}
                </div>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                    <Icon size={17} />
                </div>
            </div>
        </div>
    );
}

const TABS = [
    { id: 'equity', label: 'Equity', icon: Shield },
    { id: 'response', label: 'Response', icon: Clock },
    { id: 'warnings', label: 'Warnings', icon: AlertOctagon },
];

export default function AnalyticsPage() {
    const [tab, setTab] = useState('equity');
    const [days, setDays] = useState(30);

    const { data: equity } = useQuery({ queryKey: ['equity'], queryFn: () => getEquity().then(r => r.data) });
    const { data: responseTimes } = useQuery({ queryKey: ['response-times', days], queryFn: () => getResponseTimes({ days }).then(r => r.data) });
    const { data: warnings } = useQuery({ queryKey: ['early-warnings'], queryFn: () => getEarlyWarnings().then(r => r.data) });

    const summary = equity?.summary;

    const zoneData = equity?.zone_metrics?.map(z => ({
        name: z.zone_code,
        'Avg Response': z.avg_response_time_min ?? 0,
        'Equity %': ((z.equity_score ?? 0) * 100).toFixed(0),
    })) || [];

    const typeData = responseTimes?.by_emergency_type
        ? Object.entries(responseTimes.by_emergency_type).map(([type, s]) => ({ name: type, 'Avg (min)': s.avg, count: s.count }))
        : [];

    const hourData = responseTimes?.by_hour_of_day
        ? Object.entries(responseTimes.by_hour_of_day).map(([h, s]) => ({ hour: `${h}h`, avg: s.avg, count: s.count }))
        : [];

    return (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1600 }}>

            {/* Header */}
            <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', letterSpacing: '-0.03em', marginBottom: 4 }}>Analytics & Equity</h1>
                    <p style={{ fontSize: 12, color: 'var(--text3)' }}>System performance, fairness metrics and early warnings</p>
                </div>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setTab(id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                                background: tab === id ? 'rgba(0,212,255,0.12)' : 'transparent',
                                color: tab === id ? 'var(--cyan)' : 'var(--text3)',
                                transition: 'all 0.18s',
                            }}
                            onMouseEnter={e => { if (tab !== id) e.currentTarget.style.color = 'var(--text2)'; }}
                            onMouseLeave={e => { if (tab !== id) e.currentTarget.style.color = 'var(--text3)'; }}
                        >
                            <Icon size={13} />{label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary metric cards */}
            {summary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                    <MetricCard icon={Clock} label="Avg Response Time"
                        value={summary.global_avg_response_time_min ? `${summary.global_avg_response_time_min}m` : '0m'}
                        sub="system-wide average" color="var(--cyan)" glow="var(--cyan-glow)" />
                    <MetricCard icon={AlertOctagon} label="Underserved Zones"
                        value={summary.underserved_zones_count ?? 0}
                        sub="requiring reallocation" color="var(--orange)" />
                    <MetricCard icon={BarChart2} label="Gini Coefficient"
                        value={summary.fairness_gini?.toFixed(3) ?? '0.000'}
                        sub="fairness index (0=equal)" color="var(--purple)" />
                    <MetricCard icon={Activity} label="Equity Rating"
                        value={summary.equity_rating || 'N/A'}
                        sub="based on Gini score"
                        color={summary.equity_rating === 'Good' ? 'var(--green)' : summary.equity_rating === 'Fair' ? 'var(--orange)' : 'var(--red)'}
                        glow={summary.equity_rating === 'Good' ? 'var(--green-glow)' : ''} />
                </div>
            )}

            {/* EQUITY TAB */}
            {tab === 'equity' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Zone bar chart */}
                    <div style={{ background: 'rgba(11,18,33,0.65)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px' }}>
                        <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 16 }}>Response Time by Zone (minutes)</h2>
                        {zoneData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={zoneData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} width={35} />
                                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                                    <Bar dataKey="Avg Response" fill="var(--cyan)" radius={[5, 5, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>No data yet</div>
                        )}
                    </div>

                    {/* Underserved zones */}
                    {equity?.underserved_zones?.length > 0 && (
                        <div style={{ background: 'rgba(11,18,33,0.65)', border: '1px solid rgba(255,140,66,0.25)', borderRadius: 16, padding: '18px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                <AlertOctagon size={14} style={{ color: 'var(--orange)' }} />
                                <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>Underserved Zones — {equity.underserved_zones.length}</h2>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {equity.underserved_zones.map(z => (
                                    <div key={z.zone_id} style={{
                                        display: 'flex', alignItems: 'center', gap: 14,
                                        padding: '12px 14px', borderRadius: 10,
                                        background: 'rgba(255,140,66,0.05)', border: '1px solid rgba(255,140,66,0.2)',
                                    }}>
                                        <MapPin size={13} style={{ color: 'var(--orange)', flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', marginBottom: 3 }}>{z.zone_name}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                                                {z.avg_response_time_min}m avg response · {z.total_resources} resources · Equity {(z.equity_score * 100).toFixed(0)}%
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--orange)', fontFamily: 'JetBrains Mono' }}>{(z.underserved_score * 100).toFixed(0)}%</div>
                                            <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'capitalize' }}>{z.risk_level} risk</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Zone table */}
                    {equity?.zone_metrics?.length > 0 && (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Zone</th>
                                        <th style={{ textAlign: 'right' }}>Avg Resp (min)</th>
                                        <th style={{ textAlign: 'right' }}>Dispatches</th>
                                        <th style={{ textAlign: 'right' }}>Resources</th>
                                        <th style={{ textAlign: 'right' }}>Equity</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {equity.zone_metrics.map(z => (
                                        <tr key={z.zone_id}>
                                            <td>
                                                <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{z.zone_name}</span>
                                                <span style={{ color: 'var(--text3)', fontSize: 11, marginLeft: 6 }}>({z.zone_code})</span>
                                            </td>
                                            <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', color: 'var(--text1)' }}>{z.avg_response_time_min || '—'}</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono' }}>{z.total_dispatches}</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono' }}>{z.total_resources}</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', color: z.is_underserved ? 'var(--orange)' : 'var(--green)' }}>
                                                {(z.equity_score * 100).toFixed(0)}%
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={z.is_underserved ? 'pill pill-orange' : 'pill pill-green'}>
                                                    {z.is_underserved ? 'Underserved' : 'Adequate'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* RESPONSE TAB */}
            {tab === 'response' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Day selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>Time window:</span>
                        {[7, 30, 90].map(d => (
                            <button key={d} onClick={() => setDays(d)}
                                style={{
                                    padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                    border: `1px solid ${days === d ? 'rgba(0,212,255,0.4)' : 'var(--border)'}`,
                                    background: days === d ? 'rgba(0,212,255,0.1)' : 'transparent',
                                    color: days === d ? 'var(--cyan)' : 'var(--text3)',
                                    transition: 'all 0.15s',
                                }}
                            >{d}d</button>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                        {/* By type */}
                        <div style={{ background: 'rgba(11,18,33,0.65)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px' }}>
                            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 14 }}>Response by Emergency Type</h2>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={typeData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} width={32} />
                                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                                    <Bar dataKey="Avg (min)" fill="var(--blue)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {/* By hour */}
                        <div style={{ background: 'rgba(11,18,33,0.65)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 20px' }}>
                            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 14 }}>Response by Hour of Day</h2>
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={hourData}>
                                    <defs>
                                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--purple)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="var(--purple)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} width={32} />
                                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                                    <Area type="monotone" dataKey="avg" stroke="var(--purple)" fill="url(#areaGrad)" strokeWidth={2} dot={false} name="Avg (min)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {typeData.length > 0 && (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr><th>Emergency Type</th><th style={{ textAlign: 'right' }}>Avg (min)</th><th style={{ textAlign: 'right' }}>Min</th><th style={{ textAlign: 'right' }}>Max</th><th style={{ textAlign: 'right' }}>Count</th></tr>
                                </thead>
                                <tbody>
                                    {typeData.map(d => (
                                        <tr key={d.name}>
                                            <td><span className={`type-badge type-${d.name}`}>{d.name}</span></td>
                                            <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', color: 'var(--text1)' }}>{d['Avg (min)']}m</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', color: 'var(--green)' }}>—</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', color: 'var(--red)' }}>—</td>
                                            <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono' }}>{d.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* WARNINGS TAB */}
            {tab === 'warnings' && warnings && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border)' }}>
                        <Activity size={13} style={{ color: 'var(--text3)' }} />
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                            Generated {new Date(warnings.generated_at).toLocaleString()} · Model: {warnings.model}
                        </span>
                    </div>

                    {warnings.warnings?.length > 0 ? warnings.warnings.map((w, i) => (
                        <div key={i} style={{
                            background: w.alert_level === 'HIGH' ? 'rgba(255,64,96,0.06)' : 'rgba(255,140,66,0.05)',
                            border: `1px solid ${w.alert_level === 'HIGH' ? 'rgba(255,64,96,0.3)' : 'rgba(255,140,66,0.3)'}`,
                            borderRadius: 14, padding: '16px 18px',
                            boxShadow: w.alert_level === 'HIGH' ? 'var(--red-glow)' : 'none',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>Zone #{w.zone_id}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                                        {w.incident_count_48h} incidents in last 48h · Risk score: {(w.risk_score * 100).toFixed(0)}%
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--cyan)', marginTop: 6 }}>{w.recommendation}</div>
                                </div>
                                <span className={w.alert_level === 'HIGH' ? 'pill pill-red' : 'pill pill-orange'} style={{ flexShrink: 0 }}>
                                    {w.alert_level}
                                </span>
                            </div>
                            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: 99, transition: 'width 0.5s ease',
                                    width: `${w.risk_score * 100}%`,
                                    background: w.alert_level === 'HIGH' ? 'var(--red)' : 'var(--orange)',
                                }} />
                            </div>
                        </div>
                    )) : (
                        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text3)' }}>
                            <Shield size={36} style={{ margin: '0 auto 14px', color: 'var(--green)', opacity: 0.6 }} />
                            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>All Clear</p>
                            <p style={{ fontSize: 12 }}>No active early warnings. System operating normally.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
