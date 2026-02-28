import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, RefreshCw, MapPin, Users, ChevronRight } from 'lucide-react';
import { listResources, updateResource, getResourceAvailability } from '../services/api';
import { useAuthStore } from '../store';

const TYPE_EMOJI = { ambulance: '🚑', fire_truck: '🚒', police_unit: '🚓', rescue_team: '🛟', hazmat_unit: '☢️' };
const TYPE_COLOR = {
    ambulance: { accent: '#4f8ef0', dim: 'rgba(79,142,240,0.1)' },
    fire_truck: { accent: '#ff8c42', dim: 'rgba(255,140,66,0.1)' },
    police_unit: { accent: '#a78bfa', dim: 'rgba(167,139,250,0.1)' },
    rescue_team: { accent: '#00e5a0', dim: 'rgba(0,229,160,0.1)' },
    hazmat_unit: { accent: '#ffc947', dim: 'rgba(255,201,71,0.1)' },
};
const STATUS_META = {
    available: { color: 'var(--green)', pill: 'pill-green', label: 'Available' },
    busy: { color: 'var(--orange)', pill: 'pill-orange', label: 'Deployed' },
    maintenance: { color: 'var(--yellow)', pill: 'pill-yellow', label: 'Maintenance' },
    offline: { color: 'var(--text3)', pill: 'pill-gray', label: 'Offline' },
};

function ResourceCard({ resource, onStatusChange, canEdit }) {
    const tc = TYPE_COLOR[resource.resource_type] || { accent: 'var(--cyan)', dim: 'var(--cyan-dim)' };
    const sm = STATUS_META[resource.status] || STATUS_META.offline;

    return (
        <div className="animate-fade-up" style={{
            background: 'rgba(11,18,33,0.65)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 18,
            transition: 'border-color 0.2s, box-shadow 0.2s',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
        }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = tc.accent + '40'; e.currentTarget.style.boxShadow = `0 0 20px ${tc.accent}15`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: tc.dim, border: `1px solid ${tc.accent}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 22,
                    }}>
                        {TYPE_EMOJI[resource.resource_type] || '🚨'}
                    </div>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', lineHeight: 1.2, marginBottom: 3 }}>{resource.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>{resource.vehicle_id}</div>
                    </div>
                </div>
                <span className={`pill ${sm.pill}`} style={{ flexShrink: 0 }}>{sm.label}</span>
            </div>

            {/* Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                {[
                    { icon: <Truck size={11} />, label: 'Type', value: resource.resource_type?.replace(/_/g, ' ') },
                    { icon: <Users size={11} />, label: 'Crew', value: resource.crew_count ?? '—' },
                    { icon: <MapPin size={11} />, label: 'Base', value: resource.base_station || '—' },
                    { icon: null, label: 'Coords', value: `${resource.latitude?.toFixed(3)}, ${resource.longitude?.toFixed(3)}` },
                ].map(f => (
                    <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: f.label === 'Coords' ? 'JetBrains Mono' : 'inherit' }}>{f.value}</span>
                    </div>
                ))}
            </div>

            {/* Status bar */}
            <div style={{ height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{
                    height: '100%', borderRadius: 99,
                    width: resource.status === 'available' ? '100%' : resource.status === 'busy' ? '70%' : '30%',
                    background: sm.color,
                    transition: 'width 0.4s ease',
                }} />
            </div>

            {/* Status toggles */}
            {canEdit && (
                <div style={{ display: 'flex', gap: 6 }}>
                    {['available', 'busy', 'maintenance'].map(s => {
                        const active = resource.status === s;
                        const m = STATUS_META[s];
                        return (
                            <button key={s} onClick={() => !active && onStatusChange(resource.id, s)} disabled={active}
                                style={{
                                    flex: 1, padding: '5px 4px', borderRadius: 7, fontSize: 10, fontWeight: 700,
                                    textTransform: 'capitalize', cursor: active ? 'default' : 'pointer',
                                    border: `1px solid ${active ? m.color + '60' : 'var(--border)'}`,
                                    background: active ? m.color + '18' : 'transparent',
                                    color: active ? m.color : 'var(--text3)',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = m.color + '50'; e.currentTarget.style.color = m.color; } }}
                                onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)'; } }}
                            >
                                {s}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function SummaryBar({ label, value, total, color }) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                <span style={{ color: 'var(--text2)', fontWeight: 500 }}>{label}</span>
                <span style={{ color, fontWeight: 800, fontFamily: 'JetBrains Mono' }}>{value}</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
                <div style={{ height: '100%', borderRadius: 99, width: `${pct}%`, background: color, transition: 'width 0.5s ease' }} />
            </div>
        </div>
    );
}

export default function ResourcesPage() {
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const { user } = useAuthStore();
    const qc = useQueryClient();
    const canEdit = ['admin', 'dispatcher'].includes(user?.role);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['resources', typeFilter, statusFilter],
        queryFn: () => listResources({ resource_type: typeFilter || undefined, status: statusFilter || undefined, page_size: 100 }).then(r => r.data),
        refetchInterval: 10000,
    });

    const { data: avail } = useQuery({
        queryKey: ['resource-availability'],
        queryFn: () => getResourceAvailability().then(r => r.data),
        refetchInterval: 10000,
    });

    const statusMutation = useMutation({
        mutationFn: ({ id, status }) => updateResource(id, { status }).then(r => r.data),
        onSuccess: () => qc.invalidateQueries(['resources']),
    });

    const resources = data?.items || [];
    const total = avail?.total || 0;

    return (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1600 }}>

            {/* Header */}
            <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', letterSpacing: '-0.03em', marginBottom: 4 }}>Resource Management</h1>
                    <p style={{ fontSize: 12, color: 'var(--text3)' }}>{data?.total || 0} units tracked across all zones</p>
                </div>
                <button onClick={() => refetch()} className="btn btn-ghost" style={{ gap: 8 }}>
                    <RefreshCw size={13} />
                    Refresh
                </button>
            </div>

            {/* Summary panels */}
            {avail && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
                    {/* Stats row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                        {[
                            { label: 'Total Fleet', value: avail.total, color: 'var(--text1)' },
                            { label: 'Available', value: avail.available, color: 'var(--green)' },
                            { label: 'Deployed', value: avail.busy, color: 'var(--orange)' },
                            { label: 'Maintenance', value: avail.maintenance, color: 'var(--yellow)' },
                        ].map(({ label, value, color }) => (
                            <div key={label} className="animate-fade-up" style={{
                                background: 'rgba(11,18,33,0.7)', border: '1px solid var(--border)',
                                borderRadius: 12, padding: '16px 18px',
                            }}>
                                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
                                <div style={{ fontSize: 32, fontWeight: 800, color, fontFamily: 'JetBrains Mono', letterSpacing: '-0.04em' }}>{value ?? '—'}</div>
                            </div>
                        ))}
                    </div>

                    {/* Utilisation breakdown */}
                    <div style={{ background: 'rgba(11,18,33,0.7)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', marginBottom: 14 }}>Fleet Utilisation</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <SummaryBar label="Available" value={avail.available} total={total} color="var(--green)" />
                            <SummaryBar label="Deployed" value={avail.busy} total={total} color="var(--orange)" />
                            <SummaryBar label="Maintenance" value={avail.maintenance} total={total} color="var(--yellow)" />
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="form-input" style={{ width: 160 }}>
                    <option value="">All Types</option>
                    {['ambulance', 'fire_truck', 'police_unit', 'rescue_team', 'hazmat_unit'].map(t => (
                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                    ))}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-input" style={{ width: 150 }}>
                    <option value="">All Status</option>
                    {['available', 'busy', 'maintenance', 'offline'].map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>
                    {resources.length} shown
                </span>
            </div>

            {/* Cards grid */}
            {isLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />)}
                </div>
            ) : resources.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    {resources.map((r, i) => (
                        <div key={r.id} style={{ animationDelay: `${i * 40}ms` }}>
                            <ResourceCard resource={r} canEdit={canEdit} onStatusChange={(id, status) => statusMutation.mutate({ id, status })} />
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
                    <Truck size={40} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>No resources found</p>
                    <p style={{ fontSize: 12 }}>Try changing the filters</p>
                </div>
            )}
        </div>
    );
}
