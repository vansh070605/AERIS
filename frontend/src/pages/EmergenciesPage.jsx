import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Search, RefreshCw, Zap, X, CheckCircle } from 'lucide-react';
import { listEmergencies, dispatch, reportEmergency } from '../services/api';
import { useAuthStore } from '../store';

const SEV_COLORS = { low: 'var(--green)', medium: 'var(--yellow)', high: 'var(--orange)', critical: 'var(--red)' };
const STATUS_PILL = {
    pending: 'pill-yellow', dispatched: 'pill-blue',
    in_progress: 'pill-orange', resolved: 'pill-green', cancelled: 'pill-gray',
};

function EmergencyRow({ e, onDispatch, canDispatch, idx }) {
    const sev = e.predicted_severity || 'medium';
    const isCritical = sev === 'critical';

    return (
        <tr className="animate-fade-up" style={{
            animationDelay: `${idx * 30}ms`,
            background: isCritical ? 'rgba(255,64,96,0.04)' : 'transparent',
        }}>
            <td style={{ padding: '12px 16px', width: 24 }}>
                <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: SEV_COLORS[sev] || 'var(--text3)',
                    boxShadow: isCritical ? '0 0 8px var(--red)' : 'none',
                    animation: isCritical ? 'pulse-dot 1.2s ease-in-out infinite' : 'none',
                }} />
            </td>
            <td style={{ padding: '12px 8px', fontFamily: 'JetBrains Mono', fontSize: 11, color: 'var(--text3)' }}>
                #{e.id}
            </td>
            <td style={{ padding: '12px 8px' }}>
                <span className={`type-badge type-${e.emergency_type}`}>{e.emergency_type}</span>
            </td>
            <td style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: 12, color: 'var(--text1)', marginBottom: 2 }}>
                    {e.address || `${e.latitude?.toFixed(4)}, ${e.longitude?.toFixed(4)}`}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {e.people_affected} people · Injury {e.injury_level}/10
                </div>
            </td>
            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                <span style={{
                    fontSize: 11, fontWeight: 800, fontFamily: 'JetBrains Mono',
                    color: SEV_COLORS[sev] || 'var(--text3)',
                }}>
                    {sev?.toUpperCase()}
                </span>
                {e.severity_confidence != null && (
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                        {(e.severity_confidence * 100).toFixed(0)}% conf.
                    </div>
                )}
            </td>
            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                <span className={`pill ${STATUS_PILL[e.status] || 'pill-gray'}`}>
                    {e.status?.replace('_', ' ')}
                </span>
            </td>
            {canDispatch && (
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {e.status === 'pending' && (
                        <button
                            onClick={() => onDispatch(e.id)}
                            className="btn"
                            style={{
                                padding: '5px 12px', fontSize: 11,
                                background: 'rgba(0,212,255,0.1)',
                                border: '1px solid rgba(0,212,255,0.3)',
                                color: 'var(--cyan)',
                            }}
                            onMouseEnter={el => { el.currentTarget.style.background = 'var(--cyan)'; el.currentTarget.style.color = '#050a14'; }}
                            onMouseLeave={el => { el.currentTarget.style.background = 'rgba(0,212,255,0.1)'; el.currentTarget.style.color = 'var(--cyan)'; }}
                        >
                            <Zap size={11} /> Dispatch
                        </button>
                    )}
                </td>
            )}
        </tr>
    );
}

function SliderField({ label, name, min, max, value, onChange, color = 'var(--cyan)' }) {
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
                <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono', color, fontWeight: 700 }}>{value}</span>
            </div>
            <input type="range" min={min} max={max} value={value} onChange={e => onChange(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: color }} />
        </div>
    );
}

function ReportForm({ onClose }) {
    const [form, setForm] = useState({
        emergency_type: 'medical', latitude: 28.6139, longitude: 77.2090,
        injury_level: 5, people_affected: 1, hazard_level: 3,
        description: '', address: '', reporter_name: '',
    });
    const [result, setResult] = useState(null);
    const qc = useQueryClient();

    const mutation = useMutation({
        mutationFn: data => reportEmergency(data).then(r => r.data),
        onSuccess: data => { setResult(data); qc.invalidateQueries(['emergencies']); },
    });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    if (result) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={20} style={{ color: 'var(--green)' }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text1)' }}>Emergency Reported</span>
                <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)' }}>#{result.id}</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text3)' }}>Predicted Severity</span>
                    <span style={{ color: SEV_COLORS[result.predicted_severity] || 'var(--text1)', fontWeight: 800, fontFamily: 'JetBrains Mono' }}>
                        {result.predicted_severity?.toUpperCase()}
                    </span>
                </div>
                {result.ml_prediction?.confidence != null && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text3)' }}>ML Confidence</span>
                        <span style={{ color: 'var(--cyan)', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                            {(result.ml_prediction.confidence * 100).toFixed(1)}%
                        </span>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--text3)' }}>Status</span>
                    <span className="pill pill-yellow">Pending Dispatch</span>
                </div>
            </div>

            {result.ml_prediction?.shap_values && (
                <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        SHAP Feature Importance
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {Object.entries(result.ml_prediction.shap_values)
                            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                            .slice(0, 5)
                            .map(([feat, val]) => (
                                <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                                    <span style={{ width: 120, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{feat.replace(/_/g, ' ')}</span>
                                    <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%', borderRadius: 99, transition: 'width 0.5s ease',
                                            width: `${Math.min(100, Math.abs(val) * 300)}%`,
                                            background: val > 0 ? 'var(--red)' : 'var(--green)',
                                        }} />
                                    </div>
                                    <span style={{ width: 44, textAlign: 'right', fontFamily: 'JetBrains Mono', color: val > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>
                                        {val > 0 ? '+' : ''}{val.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Done</button>
                <button onClick={() => setResult(null)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>Report Another</button>
            </div>
        </div>
    );

    return (
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Type</label>
                    <select value={form.emergency_type} onChange={e => set('emergency_type', e.target.value)} className="form-input">
                        {['medical', 'fire', 'accident', 'flood', 'crime', 'other'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Address</label>
                    <input value={form.address} onChange={e => set('address', e.target.value)} className="form-input" placeholder="Location description" />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Latitude</label>
                    <input type="number" step="0.0001" value={form.latitude} onChange={e => set('latitude', parseFloat(e.target.value))} className="form-input mono" />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Longitude</label>
                    <input type="number" step="0.0001" value={form.longitude} onChange={e => set('longitude', parseFloat(e.target.value))} className="form-input mono" />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>People Affected</label>
                    <input type="number" min={1} value={form.people_affected} onChange={e => set('people_affected', parseInt(e.target.value))} className="form-input" />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Reporter (optional)</label>
                    <input value={form.reporter_name} onChange={e => set('reporter_name', e.target.value)} className="form-input" placeholder="Name" />
                </div>
            </div>

            <SliderField label={`Injury Level: ${form.injury_level}/10`} min={0} max={10} value={form.injury_level} onChange={v => set('injury_level', v)} color="var(--red)" />
            <SliderField label={`Hazard Level: ${form.hazard_level}/10`} min={0} max={10} value={form.hazard_level} onChange={v => set('hazard_level', v)} color="var(--orange)" />

            <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Description</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                    className="form-input" style={{ resize: 'none', height: 72 }} placeholder="Additional details…" />
            </div>

            {mutation.error && (
                <div style={{ fontSize: 12, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-dim)', borderRadius: 8, border: '1px solid rgba(255,64,96,0.25)' }}>
                    {mutation.error.response?.data?.detail || 'Error reporting emergency'}
                </div>
            )}

            <button type="submit" disabled={mutation.isPending} className="btn btn-danger" style={{ justifyContent: 'center', padding: '10px', fontSize: 13 }}>
                <AlertTriangle size={14} />
                {mutation.isPending ? 'Submitting…' : '🚨 Report Emergency'}
            </button>
        </form>
    );
}

export default function EmergenciesPage() {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sevFilter, setSevFilter] = useState('');
    const [showForm, setShowForm] = useState(false);
    const { user } = useAuthStore();
    const qc = useQueryClient();
    const canDispatch = ['admin', 'dispatcher'].includes(user?.role);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['emergencies', statusFilter, sevFilter],
        queryFn: () => listEmergencies({ page: 1, page_size: 100, status: statusFilter || undefined, severity: sevFilter || undefined }).then(r => r.data),
        refetchInterval: 8000,
    });

    const dispatchMutation = useMutation({
        mutationFn: id => dispatch({ emergency_id: id, algorithm: 'dijkstra' }).then(r => r.data),
        onSuccess: () => qc.invalidateQueries(['emergencies']),
    });

    const filtered = data?.items?.filter(e =>
        !search || e.emergency_type?.includes(search.toLowerCase()) ||
        String(e.id).includes(search) || e.address?.toLowerCase().includes(search.toLowerCase())
    ) || [];

    return (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1600 }}>

            {/* Header */}
            <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', letterSpacing: '-0.03em', marginBottom: 4 }}>Emergency Management</h1>
                    <p style={{ fontSize: 12, color: 'var(--text3)' }}>{data?.total || 0} total incidents · {filtered.length} shown</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => refetch()} className="btn btn-ghost"><RefreshCw size={13} />Refresh</button>
                    {canDispatch && (
                        <button onClick={() => setShowForm(v => !v)} className="btn btn-danger" style={{ gap: 8 }}>
                            {showForm ? <><X size={13} />Cancel</> : <><AlertTriangle size={13} />Report Emergency</>}
                        </button>
                    )}
                </div>
            </div>

            {/* Report form */}
            {showForm && (
                <div className="animate-fade-up" style={{
                    background: 'rgba(11,18,33,0.8)', border: '1px solid rgba(255,64,96,0.25)',
                    borderRadius: 16, padding: 24,
                    boxShadow: 'var(--red-glow)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                        <AlertTriangle size={16} style={{ color: 'var(--red)' }} />
                        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text1)' }}>Report New Emergency</h2>
                    </div>
                    <ReportForm onClose={() => setShowForm(false)} />
                </div>
            )}

            {/* Filters */}
            <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
                    <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} className="form-input"
                        style={{ paddingLeft: 34 }} placeholder="Search by type, ID, or address…" />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="form-input" style={{ width: 150 }}>
                    <option value="">All Status</option>
                    {['pending', 'dispatched', 'in_progress', 'resolved', 'cancelled'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
                <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} className="form-input" style={{ width: 140 }}>
                    <option value="">All Severity</option>
                    {['low', 'medium', 'high', 'critical'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="animate-fade-up table-wrapper">
                <table style={{ width: '100%' }}>
                    <thead>
                        <tr>
                            <th style={{ width: 24 }} />
                            <th>ID</th>
                            <th>Type</th>
                            <th>Location</th>
                            <th style={{ textAlign: 'center' }}>Severity</th>
                            <th style={{ textAlign: 'center' }}>Status</th>
                            {canDispatch && <th style={{ textAlign: 'center' }}>Action</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={canDispatch ? 7 : 6} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading emergencies…</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={canDispatch ? 7 : 6} style={{ padding: '64px 20px', textAlign: 'center' }}>
                                    <AlertTriangle size={36} style={{ margin: '0 auto 12px', color: 'var(--text3)', opacity: 0.3 }} />
                                    <p style={{ color: 'var(--text3)', fontSize: 13, fontWeight: 600 }}>No emergencies found</p>
                                </td>
                            </tr>
                        ) : (
                            filtered.map((e, i) => (
                                <EmergencyRow key={e.id} e={e} idx={i} onDispatch={dispatchMutation.mutate} canDispatch={canDispatch} />
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
