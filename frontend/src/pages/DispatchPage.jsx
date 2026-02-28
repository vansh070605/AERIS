import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Radio, Zap, CheckCircle, Clock, AlertTriangle, MapPin, Navigation, Activity } from 'lucide-react';
import { listDispatchLogs, listEmergencies, dispatch, completeDispatch } from '../services/api';
import { useAuthStore } from '../store';

const STATUS_META = {
    dispatched: { pill: 'pill-cyan', label: 'Dispatched' },
    arrived: { pill: 'pill-blue', label: 'Arrived' },
    completed: { pill: 'pill-green', label: 'Completed' },
    cancelled: { pill: 'pill-gray', label: 'Cancelled' },
};

const SEV_COLOR = { low: 'var(--green)', medium: 'var(--yellow)', high: 'var(--orange)', critical: 'var(--red)' };

function DispatchCard({ log, onComplete, canDispatch }) {
    const meta = STATUS_META[log.dispatch_status] || { pill: 'pill-gray', label: log.dispatch_status };
    const isActive = log.dispatch_status === 'dispatched';

    return (
        <div style={{
            background: isActive ? 'rgba(0,212,255,0.05)' : 'rgba(11,18,33,0.6)',
            border: `1px solid ${isActive ? 'rgba(0,212,255,0.2)' : log.dispatch_status === 'completed' ? 'rgba(0,229,160,0.15)' : 'var(--border)'}`,
            borderRadius: 14,
            padding: '16px 18px',
            transition: 'box-shadow 0.2s',
        }}
            onMouseEnter={e => { if (isActive) e.currentTarget.style.boxShadow = 'var(--cyan-glow)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
        >
            {/* Card Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 3 }}>
                        Emergency #{log.emergency_id}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>
                        Unit #{log.resource_id}
                    </div>
                </div>
                <span className={`pill ${meta.pill}`}>{meta.label}</span>
            </div>

            {/* Metrics grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                    { icon: <MapPin size={11} />, label: 'Distance', value: log.route_distance_km != null ? `${log.route_distance_km.toFixed(2)} km` : '—', color: 'var(--text1)' },
                    { icon: <Clock size={11} />, label: 'Est. ETA', value: log.estimated_travel_time_min != null ? `${log.estimated_travel_time_min.toFixed(1)} min` : '—', color: 'var(--text1)' },
                    { icon: <Navigation size={11} />, label: 'Algorithm', value: log.routing_algorithm || 'dijkstra', color: 'var(--cyan)' },
                    { icon: <Activity size={11} />, label: 'Actual', value: log.actual_travel_time_min != null ? `${log.actual_travel_time_min.toFixed(1)} min` : '—', color: log.actual_travel_time_min ? 'var(--green)' : 'var(--text3)' },
                ].map(({ icon, label, value, color }) => (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 10px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text3)', marginBottom: 4 }}>
                            {icon}
                            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'JetBrains Mono' }}>{value}</div>
                    </div>
                ))}
            </div>

            {/* Timestamp */}
            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono', marginBottom: isActive && canDispatch ? 12 : 0 }}>
                {log.dispatched_at ? new Date(log.dispatched_at).toLocaleString() : '—'}
            </div>

            {/* Complete button */}
            {isActive && canDispatch && (
                <button onClick={() => onComplete(log.id)} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 11, padding: '7px', borderColor: 'rgba(0,229,160,0.3)', color: 'var(--green)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,160,0.12)'; e.currentTarget.style.borderColor = 'rgba(0,229,160,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = 'rgba(0,229,160,0.3)'; }}
                >
                    <CheckCircle size={12} /> Mark Complete
                </button>
            )}
        </div>
    );
}

function ResultPanel({ result }) {
    if (!result) return null;

    if (!result.success) return (
        <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(255,64,96,0.3)', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: 'var(--red)' }}>
            {result.message || 'Dispatch failed'}
        </div>
    );

    return (
        <div className="animate-fade-up" style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.25)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <CheckCircle size={14} style={{ color: 'var(--green)' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>Dispatch Successful</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                    { label: 'Resource', value: result.resource?.name },
                    { label: 'Severity', value: result.severity?.toUpperCase(), color: SEV_COLOR[result.severity] },
                    { label: 'ETA', value: result.route?.estimated_time_min != null ? `${result.route.estimated_time_min} min` : '—', mono: true },
                    { label: 'Distance', value: result.route?.distance_km != null ? `${result.route.distance_km} km` : '—', mono: true },
                    { label: 'Confidence', value: result.confidence != null ? `${(result.confidence * 100).toFixed(1)}%` : '—', mono: true },
                ].map(({ label, value, color, mono }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: color || 'var(--text1)', fontFamily: mono ? 'JetBrains Mono' : 'inherit' }}>{value || '—'}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function DispatchPage() {
    const [selectedId, setSelectedId] = useState('');
    const [algorithm, setAlgorithm] = useState('dijkstra');
    const [result, setResult] = useState(null);
    const { user } = useAuthStore();
    const qc = useQueryClient();
    const canDispatch = ['admin', 'dispatcher'].includes(user?.role);

    const { data: pending } = useQuery({
        queryKey: ['emergencies', 'pending'],
        queryFn: () => listEmergencies({ status: 'pending', page_size: 50 }).then(r => r.data),
        refetchInterval: 5000,
    });

    const { data: logs, isLoading } = useQuery({
        queryKey: ['dispatch-logs'],
        queryFn: () => listDispatchLogs({ page: 1, page_size: 30 }).then(r => r.data),
        refetchInterval: 8000,
    });

    const dispatchMut = useMutation({
        mutationFn: () => dispatch({ emergency_id: parseInt(selectedId), algorithm }).then(r => r.data),
        onSuccess: data => {
            setResult(data);
            qc.invalidateQueries(['dispatch-logs']);
            qc.invalidateQueries(['emergencies']);
        },
        onError: () => setResult({ success: false, message: 'Dispatch failed. No available resources or invalid emergency.' }),
    });

    const completeMut = useMutation({
        mutationFn: id => completeDispatch(id).then(r => r.data),
        onSuccess: () => qc.invalidateQueries(['dispatch-logs']),
    });

    const pendingItems = pending?.items || [];
    const dispatchLogs = logs?.items || [];
    const activeCount = dispatchLogs.filter(l => l.dispatch_status === 'dispatched').length;

    return (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1600 }}>

            {/* Header */}
            <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', letterSpacing: '-0.03em', marginBottom: 4 }}>Dispatch Control Center</h1>
                    <p style={{ fontSize: 12, color: 'var(--text3)' }}>AI-assisted resource assignment and optimal routing</p>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {activeCount > 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)',
                            borderRadius: 10, padding: '7px 14px',
                        }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--cyan)', boxShadow: '0 0 8px var(--cyan)', animation: 'pulse-dot 1.5s infinite' }} />
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--cyan)' }}>{activeCount} active dispatch{activeCount !== 1 ? 'es' : ''}</span>
                        </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>
                        {pendingItems.length} emergency pending
                    </div>
                </div>
            </div>

            {/* Main grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>

                {/* ── Left: Dispatch Panel ──────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    <div style={{ background: 'rgba(11,18,33,0.7)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Radio size={14} style={{ color: 'var(--cyan)' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Auto Dispatch</div>
                                <div style={{ fontSize: 10, color: 'var(--text3)' }}>AI picks the optimal unit</div>
                            </div>
                        </div>

                        {/* Emergency selector */}
                        <div>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
                                Select Pending Emergency
                            </label>
                            <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="form-input">
                                <option value="">— Choose emergency —</option>
                                {pendingItems.map(e => (
                                    <option key={e.id} value={e.id}>
                                        #{e.id} · {e.emergency_type} · {e.predicted_severity?.toUpperCase() || 'PENDING'}
                                    </option>
                                ))}
                            </select>
                            {pendingItems.length === 0 && (
                                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>No pending emergencies</p>
                            )}
                        </div>

                        {/* Algorithm selector */}
                        <div>
                            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7 }}>
                                Routing Algorithm
                            </label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {['dijkstra', 'astar'].map(algo => {
                                    const active = algorithm === algo;
                                    return (
                                        <button key={algo} onClick={() => setAlgorithm(algo)} style={{
                                            flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                            textTransform: 'capitalize', letterSpacing: '0.03em',
                                            border: `1px solid ${active ? 'rgba(0,212,255,0.4)' : 'var(--border)'}`,
                                            background: active ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.03)',
                                            color: active ? 'var(--cyan)' : 'var(--text3)',
                                            transition: 'all 0.15s',
                                        }}
                                            onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.25)'; e.currentTarget.style.color = 'var(--text2)'; } }}
                                            onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)'; } }}
                                        >
                                            {algo}
                                        </button>
                                    );
                                })}
                            </div>
                            <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 5 }}>
                                {algorithm === 'dijkstra' ? 'Shortest path by road distance' : 'Heuristic-optimal for speed'}
                            </p>
                        </div>

                        {/* Dispatch separator */}
                        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--border2), transparent)' }} />

                        {/* Dispatch button */}
                        {canDispatch ? (
                            <button
                                onClick={() => { setResult(null); dispatchMut.mutate(); }}
                                disabled={!selectedId || dispatchMut.isPending}
                                className="btn btn-primary"
                                style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14 }}
                            >
                                <Zap size={15} />
                                {dispatchMut.isPending ? 'Computing Optimal Route…' : 'Dispatch Optimal Unit'}
                            </button>
                        ) : (
                            <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid var(--border)', fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
                                Dispatcher or Admin role required
                            </div>
                        )}

                        {/* Result */}
                        <ResultPanel result={result} />
                    </div>

                    {/* Info box */}
                    <div style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>How it works</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.7 }}>
                            The AI selects the nearest available unit using the chosen routing algorithm on a graph of Delhi NCR roads, then ML confidence scoring ranks candidates.
                        </div>
                    </div>
                </div>

                {/* ── Right: Dispatch Log Panel ─────── */}
                <div style={{ background: 'rgba(11,18,33,0.65)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {/* Panel header */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Activity size={14} style={{ color: 'var(--text2)' }} />
                            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)' }}>Active Dispatches</h2>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'JetBrains Mono' }}>
                            {dispatchLogs.length} total · {activeCount} active
                        </span>
                    </div>

                    {/* Cards grid */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                        {isLoading ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 14 }} />)}
                            </div>
                        ) : dispatchLogs.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text3)', gap: 12 }}>
                                <Radio size={40} style={{ opacity: 0.2 }} />
                                <p style={{ fontSize: 13, fontWeight: 600 }}>No dispatch records</p>
                                <p style={{ fontSize: 11 }}>Dispatches will appear here once an emergency is handled</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                {dispatchLogs.map((log, i) => (
                                    <div key={log.id} className="animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                                        <DispatchCard log={log} onComplete={id => completeMut.mutate(id)} canDispatch={canDispatch} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
