import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Shield, AlertTriangle, Brain, Route, Truck, BarChart3,
    MapPin, Zap, ChevronRight, Play, CheckCircle, ArrowRight,
    Radio, Activity, Target, TrendingUp, Clock, Users,
} from 'lucide-react';

// ── Problem → Solution steps ──────────────────────────────────────────────────
const STEPS = [
    {
        id: 1,
        icon: AlertTriangle,
        color: '#ff4060',
        label: 'Emergency Reported',
        sub: 'Incident detected',
        title: 'A crisis happens in Chennai',
        description:
            'A road accident is reported near T. Nagar at 6:45 PM — peak rush hour. Multiple callers, chaotic information, unknown severity.',
        problem: 'Traditional systems: dispatcher manually triages calls, guesses severity, radios the nearest patrol. Average decision time: 4–8 minutes.',
        solution: 'AERIS auto-captures incident data (location, type, caller count) and immediately triggers the ML pipeline within 200ms.',
        visual: 'emergency',
    },
    {
        id: 2,
        icon: Brain,
        color: '#a78bfa',
        label: 'AI Severity Prediction',
        sub: 'ML model active',
        title: 'XGBoost predicts severity in <200ms',
        description:
            'The trained XGBoost model analyses 7 features: injury level, hazard score, time of day, day of week, people affected, emergency type, and population density.',
        problem: 'Without ML: all incidents treated with same priority. Critical ones delay. Minor ones waste scarce resources.',
        solution: 'Model predicts severity as CRITICAL with 89% confidence, automatically escalating dispatch priority and resource type requirements.',
        visual: 'ml',
    },
    {
        id: 3,
        icon: Route,
        color: '#00d4ff',
        label: 'Optimal Routing',
        sub: 'Dijkstra / A*',
        title: 'Real road network finds the fastest path',
        description:
            'The Chennai road graph (OSMnx + OpenStreetMap) runs Dijkstra and A* across 50,000+ nodes to find the fastest route considering live road attributes.',
        problem: 'Manual dispatch: "nearest ambulance" by straight-line distance. Ignores one-way streets, congestion, road hierarchy.',
        solution: 'Our composite scoring: travel time + type preference + urgency factor. Selects Kilpauk MC Ambulance — 3.2 km, ETA 8 minutes.',
        visual: 'routing',
    },
    {
        id: 4,
        icon: Truck,
        color: '#00e5a0',
        label: 'Resource Dispatched',
        sub: 'Unit en route',
        title: 'Best-fit unit dispatched instantly',
        description:
            'Ambulance AMB-ANG-001 is assigned, its status updated to "busy", a DispatchLog entry created, and real-time WebSocket updates pushed to all connected dashboards.',
        problem: 'Paper logs, radio confusion, no real-time tracking. Field units often don\'t know the status of other units.',
        solution: 'Full digital audit trail. Every dispatcher sees live unit positions and statuses. Incident closed or escalated with full log.',
        visual: 'dispatch',
    },
    {
        id: 5,
        icon: BarChart3,
        color: '#ffc947',
        label: 'Hotspot Analytics',
        sub: 'DBSCAN clustering',
        title: 'DBSCAN reveals where crises cluster',
        description:
            'After 5,000 incidents, our DBSCAN algorithm (ε=500m, min=5 incidents) identifies statistically significant hotspot clusters across Chennai.',
        problem: 'Post-incident analysis done manually weeks later. No predictive resource positioning. Repeat incidents in same areas.',
        solution: 'Real-time cluster detection: Velachery flagged as CRITICAL (158 incidents, flood-dominant). Resources pre-positioned proactively.',
        visual: 'analytics',
    },
];

// ── Visual panels for each step ───────────────────────────────────────────────
function EmergencyVisual({ active }) {
    const [pulse, setPulse] = useState(0);
    useEffect(() => {
        if (!active) return;
        const t = setInterval(() => setPulse(p => p + 1), 800);
        return () => clearInterval(t);
    }, [active]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Map-like background */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.15, background: 'repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(0,212,255,0.1) 30px, rgba(0,212,255,0.1) 31px), repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(0,212,255,0.1) 30px, rgba(0,212,255,0.1) 31px)' }} />

            {/* Incident location */}
            <div style={{ position: 'relative', textAlign: 'center' }}>
                {[1, 2, 3].map(i => (
                    <div key={i} style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: 30 + i * 40, height: 30 + i * 40,
                        borderRadius: '50%', border: '1.5px solid rgba(255,64,96,0.5)',
                        animation: `ripple ${1 + i * 0.3}s ease-out infinite`,
                        animationDelay: `${i * 0.2}s`,
                        opacity: active ? 1 : 0, transition: 'opacity 0.4s',
                    }} />
                ))}
                <div style={{ position: 'relative', zIndex: 2, width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,64,96,0.2)', border: '2px solid #ff4060', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(255,64,96,0.4)' }}>
                    <AlertTriangle size={24} style={{ color: '#ff4060' }} />
                </div>
                <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text2)', fontWeight: 700 }}>T. Nagar, Chennai</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>18:45 · Road accident · 3 callers</div>

                {active && (
                    <div style={{ marginTop: 12, background: 'rgba(255,64,96,0.1)', border: '1px solid rgba(255,64,96,0.3)', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#ff4060', animation: 'fadeIn 0.5s ease' }}>
                        ⚡ Incident Captured — ML Pipeline Triggered
                    </div>
                )}
            </div>
        </div>
    );
}

function MLVisual({ active }) {
    const features = [
        { name: 'Injury Level', value: 7, max: 10, color: '#ff4060' },
        { name: 'Hazard Score', value: 6, max: 10, color: '#ff8c42' },
        { name: 'People Affected', value: 5, max: 10, color: '#ffc947' },
        { name: 'Hour of Day', value: 8, max: 10, color: '#a78bfa' },
        { name: 'Emergency Type', value: 9, max: 10, color: '#ff4060' },
    ];

    return (
        <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center', height: '100%' }}>
            {features.map((f, i) => (
                <div key={f.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text2)' }}>{f.name}</span>
                        <span style={{ fontSize: 11, color: f.color, fontWeight: 700 }}>{f.value}/{f.max}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', borderRadius: 3, background: f.color,
                            width: active ? `${f.value / f.max * 100}%` : '0%',
                            transition: `width 0.8s cubic-bezier(.4,0,.2,1) ${i * 0.1}s`,
                            boxShadow: `0 0 8px ${f.color}80`,
                        }} />
                    </div>
                </div>
            ))}

            {active && (
                <div style={{
                    marginTop: 8, padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(255,64,96,0.1)', border: '1px solid rgba(255,64,96,0.3)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    animation: 'fadeIn 0.6s ease 0.8s both',
                }}>
                    <div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Predicted Severity</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#ff4060' }}>CRITICAL</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Confidence</div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#00e5a0' }}>89.2%</div>
                    </div>
                </div>
            )}
        </div>
    );
}

function RoutingVisual({ active }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'center' }}>
                {/* Resource node */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(0,229,160,0.15)', border: '1.5px solid #00e5a0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', fontSize: 20 }}>🚑</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>Kilpauk MC</div>
                    <div style={{ fontSize: 10, color: '#00e5a0', fontWeight: 700 }}>Available</div>
                </div>

                {/* Route line */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: 10, color: '#00d4ff', fontWeight: 700 }}>3.2 km</div>
                    <div style={{ position: 'relative', width: '100%', height: 3, background: 'rgba(0,212,255,0.15)', borderRadius: 2 }}>
                        <div style={{
                            position: 'absolute', left: 0, top: 0, height: '100%',
                            background: 'linear-gradient(90deg, #00e5a0, #00d4ff)',
                            borderRadius: 2, boxShadow: '0 0 8px rgba(0,212,255,0.5)',
                            width: active ? '100%' : '0%',
                            transition: 'width 1.2s cubic-bezier(.4,0,.2,1)',
                        }} />
                        {active && <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 10, height: 10, borderRadius: '50%', background: '#00d4ff', boxShadow: '0 0 10px rgba(0,212,255,0.8)', transition: 'opacity 0.4s 1.2s', animation: 'pulse 1s ease infinite' }} />}
                    </div>
                    <div style={{ fontSize: 10, color: '#ffc947', fontWeight: 700 }}>ETA 8 min</div>
                </div>

                {/* Incident node */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,64,96,0.15)', border: '1.5px solid #ff4060', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                        <AlertTriangle size={20} style={{ color: '#ff4060' }} />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>T. Nagar</div>
                    <div style={{ fontSize: 10, color: '#ff4060', fontWeight: 700 }}>CRITICAL</div>
                </div>
            </div>

            {active && (
                <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', animation: 'fadeIn 0.5s ease 1.4s both' }}>
                    Algorithm: <span style={{ color: '#00d4ff', fontWeight: 700 }}>Dijkstra</span> · Nodes computed: <span style={{ color: '#a78bfa', fontWeight: 700 }}>2,841</span>
                </div>
            )}
        </div>
    );
}

function DispatchVisual({ active }) {
    const events = [
        { time: '18:45:02', msg: 'Emergency #4821 created', color: '#ff4060' },
        { time: '18:45:02', msg: 'ML severity: CRITICAL (89%)', color: '#a78bfa' },
        { time: '18:45:03', msg: 'Routing: AMB-ANG-001 selected', color: '#00d4ff' },
        { time: '18:45:03', msg: 'Resource status → busy', color: '#ffc947' },
        { time: '18:45:03', msg: 'DispatchLog #4821 created', color: '#00e5a0' },
        { time: '18:45:04', msg: 'WebSocket broadcast sent', color: '#00d4ff' },
    ];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
            {events.map((e, i) => (
                <div key={i} style={{
                    display: 'flex', gap: 10, alignItems: 'center',
                    opacity: active ? 1 : 0,
                    transform: active ? 'translateX(0)' : 'translateX(-16px)',
                    transition: `all 0.4s ease ${i * 0.12}s`,
                }}>
                    <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace', flexShrink: 0 }}>{e.time}</span>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: e.color, flexShrink: 0, boxShadow: `0 0 6px ${e.color}` }} />
                    <span style={{ fontSize: 11, color: 'var(--text2)' }}>{e.msg}</span>
                </div>
            ))}
        </div>
    );
}

function AnalyticsVisual({ active }) {
    const clusters = [
        { name: 'Velachery', risk: 'CRITICAL', count: 158, color: '#ff4060', x: '60%', y: '65%' },
        { name: 'T. Nagar', risk: 'HIGH', count: 134, color: '#ff8c42', x: '40%', y: '40%' },
        { name: 'Tambaram', risk: 'HIGH', count: 98, color: '#ff8c42', x: '25%', y: '75%' },
        { name: 'OMR', risk: 'MEDIUM', count: 76, color: '#ffc947', x: '80%', y: '50%' },
    ];

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, background: 'repeating-linear-gradient(0deg, transparent, transparent 25px, rgba(0,212,255,0.15) 25px, rgba(0,212,255,0.15) 26px), repeating-linear-gradient(90deg, transparent, transparent 25px, rgba(0,212,255,0.15) 25px, rgba(0,212,255,0.15) 26px)' }} />
            {clusters.map((c, i) => (
                <div key={c.name} style={{
                    position: 'absolute', left: c.x, top: c.y, transform: 'translate(-50%, -50%)',
                    opacity: active ? 1 : 0,
                    transition: `opacity 0.5s ease ${i * 0.2}s`,
                }}>
                    <div style={{
                        width: 40 + (c.count / 20), height: 40 + (c.count / 20),
                        borderRadius: '50%', border: `2px solid ${c.color}`,
                        background: `${c.color}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 11, fontWeight: 800,
                        animation: active ? 'pulse 2s ease infinite' : 'none',
                        animationDelay: `${i * 0.3}s`,
                        boxShadow: `0 0 16px ${c.color}40`,
                    }}>{c.count}</div>
                    <div style={{ textAlign: 'center', marginTop: 4, fontSize: 9, color: c.color, fontWeight: 700 }}>{c.name}</div>
                </div>
            ))}
        </div>
    );
}

const VISUALS = {
    emergency: EmergencyVisual,
    ml: MLVisual,
    routing: RoutingVisual,
    dispatch: DispatchVisual,
    analytics: AnalyticsVisual,
};

// ── Stats bar ─────────────────────────────────────────────────────────────────
const STATS = [
    { value: '< 200ms', label: 'ML Prediction', icon: Brain, color: '#a78bfa' },
    { value: '5,000+', label: 'Incidents Seeded', icon: AlertTriangle, color: '#ff4060' },
    { value: '27', label: 'Chennai Resources', icon: Truck, color: '#00e5a0' },
    { value: '12', label: 'City Zones', icon: MapPin, color: '#00d4ff' },
    { value: '10+', label: 'DBSCAN Clusters', icon: Target, color: '#ffc947' },
    { value: 'Real-time', label: 'WebSocket Feed', icon: Radio, color: '#4f8ef0' },
];

// ── Main Demo Page ─────────────────────────────────────────────────────────────
export default function DemoPage() {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [autoPlay, setAutoPlay] = useState(false);
    const timerRef = useRef(null);

    const step = STEPS[activeStep];
    const VisualComponent = VISUALS[step.visual];

    useEffect(() => {
        if (!autoPlay) { clearInterval(timerRef.current); return; }
        timerRef.current = setInterval(() => {
            setActiveStep(s => (s + 1) % STEPS.length);
        }, 4500);
        return () => clearInterval(timerRef.current);
    }, [autoPlay]);

    return (
        <div style={{ height: '100%', overflowY: 'auto', background: 'var(--bg)', color: 'var(--text1)' }}>
            <style>{`
                @keyframes ripple { 0% { opacity: 0.7; transform: translate(-50%,-50%) scale(0.6); } 100% { opacity: 0; transform: translate(-50%,-50%) scale(1.6); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
                @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
                @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
                @keyframes shimmer { from { background-position: -200% center; } to { background-position: 200% center; } }
            `}</style>

            {/* ── Hero Section ─────────────────────────────────────────────── */}
            <div style={{
                padding: '60px 48px 40px',
                borderBottom: '1px solid var(--border)',
                background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,212,255,0.08), transparent)',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Background radial orbs */}
                <div style={{ position: 'absolute', top: -60, right: -60, width: 320, height: 320, borderRadius: '50%', background: 'rgba(167,139,250,0.04)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: -40, left: -40, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,64,96,0.04)', pointerEvents: 'none' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ padding: '4px 12px', borderRadius: 99, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.25)', fontSize: 11, fontWeight: 700, color: '#00d4ff', letterSpacing: '0.08em' }}>
                        INTERACTIVE DEMO
                    </div>
                    <div style={{ padding: '4px 12px', borderRadius: 99, background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.25)', fontSize: 11, fontWeight: 700, color: '#00e5a0' }}>
                        Chennai, India
                    </div>
                </div>

                <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 12px', lineHeight: 1.15, maxWidth: 640, letterSpacing: '-0.02em' }}>
                    How AEIRAS solves{' '}
                    <span style={{ background: 'linear-gradient(90deg, #ff4060, #ff8c42)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        emergency response
                    </span>
                    {' '}in Chennai
                </h1>

                <p style={{ fontSize: 15, color: 'var(--text2)', maxWidth: 580, lineHeight: 1.65, margin: '0 0 28px' }}>
                    Every second matters in a crisis. AEIRAS combines XGBoost ML prediction, real road network routing,
                    and DBSCAN hotspot detection to dispatch the right resource — faster than any manual process.
                </p>

                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        onClick={() => { setAutoPlay(p => !p); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                            cursor: 'pointer', border: 'none',
                            background: 'linear-gradient(135deg, #00d4ff, #4f8ef0)',
                            color: '#000', boxShadow: '0 4px 20px rgba(0,212,255,0.3)',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,212,255,0.4)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,212,255,0.3)'; }}
                    >
                        {autoPlay
                            ? <><Activity size={14} /> Auto-playing…</>
                            : <><Play size={14} /> Auto-play walkthrough</>}
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                            cursor: 'pointer', background: 'rgba(255,255,255,0.06)',
                            border: '1px solid var(--border)', color: 'var(--text1)',
                            transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    >
                        Go to Dashboard <ArrowRight size={13} />
                    </button>
                </div>
            </div>

            {/* ── Stats Bar ────────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', borderBottom: '1px solid var(--border)' }}>
                {STATS.map((s, i) => (
                    <div key={i} style={{
                        padding: '18px 20px',
                        borderRight: i < STATS.length - 1 ? '1px solid var(--border)' : 'none',
                        display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                        <div style={{ width: 34, height: 34, borderRadius: 9, background: `${s.color}15`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <s.icon size={14} style={{ color: s.color }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Step Walkthrough ─────────────────────────────────────────── */}
            <div style={{ padding: '32px 48px 48px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>
                    The 5-Step Response Pipeline
                </div>

                {/* Step selector */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
                    {STEPS.map((s, i) => {
                        const isActive = i === activeStep;
                        return (
                            <button key={i}
                                onClick={() => { setActiveStep(i); setAutoPlay(false); }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                                    padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    border: `1.5px solid ${isActive ? s.color : 'var(--border)'}`,
                                    background: isActive ? `${s.color}12` : 'transparent',
                                    color: isActive ? s.color : 'var(--text3)',
                                    boxShadow: isActive ? `0 0 16px ${s.color}20` : 'none',
                                }}>
                                <div style={{ width: 20, height: 20, borderRadius: '50%', background: isActive ? s.color : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: isActive ? '#000' : 'var(--text3)' }}>
                                    {isActive ? <CheckCircle size={12} /> : i + 1}
                                </div>
                                {s.label}
                            </button>
                        );
                    })}
                </div>

                {/* Main step content */}
                <div key={activeStep} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
                    animation: 'fadeIn 0.35s ease',
                }}>
                    {/* Left: info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Step badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 40, height: 40, borderRadius: 11, background: `${step.color}18`, border: `1.5px solid ${step.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${step.color}20` }}>
                                <step.icon size={18} style={{ color: step.color }} />
                            </div>
                            <div>
                                <div style={{ fontSize: 10, color: step.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Step {step.id} · {step.sub}</div>
                                <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text1)', lineHeight: 1.25 }}>{step.title}</div>
                            </div>
                        </div>

                        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, margin: 0 }}>
                            {step.description}
                        </p>

                        {/* Problem vs Solution */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(255,64,96,0.05)', border: '1px solid rgba(255,64,96,0.15)' }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: '#ff4060', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>❌ Without AEIRAS</div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{step.problem}</div>
                            </div>
                            <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(0,229,160,0.05)', border: '1px solid rgba(0,229,160,0.15)' }}>
                                <div style={{ fontSize: 10, fontWeight: 800, color: '#00e5a0', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>✅ With AEIRAS</div>
                                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6 }}>{step.solution}</div>
                            </div>
                        </div>

                        {/* Navigation buttons */}
                        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                            <button onClick={() => { setActiveStep(s => Math.max(0, s - 1)); setAutoPlay(false); }}
                                disabled={activeStep === 0}
                                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: activeStep > 0 ? 'pointer' : 'default', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.04)', color: activeStep > 0 ? 'var(--text1)' : 'var(--text3)', opacity: activeStep === 0 ? 0.4 : 1 }}>
                                ← Previous
                            </button>
                            {activeStep < STEPS.length - 1
                                ? <button onClick={() => { setActiveStep(s => s + 1); setAutoPlay(false); }}
                                    style={{ padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${step.color}50`, background: `${step.color}12`, color: step.color }}>
                                    Next Step <ChevronRight size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                </button>
                                : <button onClick={() => navigate('/dashboard')}
                                    style={{ padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg, #00d4ff, #4f8ef0)', color: '#000' }}>
                                    Open Dashboard →
                                </button>
                            }
                        </div>
                    </div>

                    {/* Right: visual */}
                    <div style={{
                        height: 300, borderRadius: 16,
                        background: 'rgba(255,255,255,0.02)',
                        border: `1px solid ${step.color}25`,
                        boxShadow: `0 0 40px ${step.color}10, inset 0 0 40px rgba(0,0,0,0.3)`,
                        overflow: 'hidden', position: 'relative', padding: 20,
                    }}>
                        <VisualComponent active={true} />
                    </div>
                </div>

                {/* ── Feature Grid (bottom) ─────────────────────────────────── */}
                <div style={{ marginTop: 48 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>
                        Explore The System
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                        {[
                            { icon: '🗺️', label: 'Live Map', desc: 'Real-time incident + resource map with hotspot overlay', path: '/map', color: '#4f8ef0' },
                            { icon: '🚨', label: 'Emergencies', desc: 'Browse 5,000 Chennai incidents with ML severity scores', path: '/emergencies', color: '#ff4060' },
                            { icon: '🚑', label: 'Resources', desc: '27 operational units across 12 Chennai zones', path: '/resources', color: '#00e5a0' },
                            { icon: '📡', label: 'Dispatch', desc: 'Trigger AI-powered auto-dispatch for any incident', path: '/dispatch', color: '#ffc947' },
                            { icon: '📊', label: 'Analytics', desc: 'Response time trends, equity metrics, early warnings', path: '/analytics', color: '#a78bfa' },
                            { icon: '⚡', label: 'Dashboard', desc: 'Full system overview with live WebSocket updates', path: '/dashboard', color: '#00d4ff' },
                        ].map(item => (
                            <button key={item.path}
                                onClick={() => navigate(item.path)}
                                style={{
                                    padding: '16px 18px', borderRadius: 12, textAlign: 'left',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${item.color}20`,
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    display: 'flex', gap: 12, alignItems: 'flex-start',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = `${item.color}08`; e.currentTarget.style.borderColor = `${item.color}40`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = `${item.color}20`; e.currentTarget.style.transform = 'none'; }}
                            >
                                <div style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</div>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text1)', marginBottom: 4 }}>{item.label}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>{item.desc}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
