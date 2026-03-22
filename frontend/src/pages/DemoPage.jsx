import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { startSimulation, getSimulationStatus, resetSimulation } from '../services/api';
import { CloudRain, Waves, AlertTriangle, Truck, Play, RotateCcw, Droplets } from 'lucide-react';

const SCENARIOS = [
    { id: 'light_rain', label: 'Light Rain', peak: '15 mm/hr', desc: 'Normal monsoon day', color: '#38bdf8' },
    { id: 'moderate_monsoon', label: 'Moderate Monsoon', peak: '45 mm/hr', desc: 'Standard NE monsoon event', color: '#ffc947' },
    { id: 'heavy_monsoon', label: 'Heavy Monsoon', peak: '80 mm/hr', desc: 'Intense rainfall, drainage stressed', color: '#ff6b35' },
    { id: 'chennai_2015', label: 'Chennai 2015', peak: '180 mm/hr', desc: 'Extreme — catastrophic flooding', color: '#ff2d55' },
    { id: 'coastal_surge', label: 'Coastal Surge', peak: '60 mm/hr', desc: 'Storm surge + coastal flooding', color: '#a78bfa' },
];

export default function DemoPage() {
    const [scenario, setScenario] = useState('moderate_monsoon');
    const [duration, setDuration] = useState(6);
    const [result, setResult] = useState(null);

    const simMutation = useMutation({
        mutationFn: () => startSimulation({ scenario, duration_hours: duration, rainfall_intensity_mmph: SCENARIOS.find(s => s.id === scenario)?.peak.replace(' mm/hr', '') || 45 }),
        onSuccess: (res) => setResult(res.data),
    });

    const resetMutation = useMutation({
        mutationFn: () => resetSimulation(),
        onSuccess: () => setResult(null),
    });

    const selScenario = SCENARIOS.find(s => s.id === scenario);

    return (
        <div style={{ padding: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)', margin: 0, marginBottom: 6 }}>
                <CloudRain size={20} style={{ color: '#38bdf8', marginRight: 8, verticalAlign: 'text-bottom' }} />
                Flood Scenario Simulator
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>
                Simulate monsoon rainfall across Chennai and watch flood spread, road blockages, and rescue dispatch in action.
            </p>

            {/* Scenario Selection */}
            <div className="glass" style={{ padding: 20, borderRadius: 14, border: '1px solid var(--border)', marginBottom: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 14 }}>Select Scenario</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 16 }}>
                    {SCENARIOS.map(s => (
                        <button key={s.id} onClick={() => setScenario(s.id)} style={{
                            padding: '14px 16px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                            border: `2px solid ${scenario === s.id ? s.color : 'var(--border)'}`,
                            background: scenario === s.id ? s.color + '12' : 'transparent',
                            transition: 'all 0.2s',
                        }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: scenario === s.id ? s.color : 'var(--text1)' }}>{s.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{s.desc}</div>
                            <div className="mono" style={{ fontSize: 14, fontWeight: 800, color: s.color, marginTop: 6 }}>{s.peak}</div>
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div>
                        <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>Duration (hours)</label>
                        <input type="number" min={1} max={48} value={duration} onChange={e => setDuration(Number(e.target.value))}
                            style={{ display: 'block', marginTop: 4, width: 80, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.05)', color: 'var(--text1)', fontSize: 14 }} />
                    </div>
                    <button onClick={() => simMutation.mutate()} disabled={simMutation.isPending}
                        className="btn" style={{
                            marginTop: 16, padding: '10px 24px', borderRadius: 10,
                            background: selScenario?.color || '#38bdf8', color: '#fff',
                            fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                            opacity: simMutation.isPending ? 0.6 : 1,
                        }}>
                        <Play size={14} />
                        {simMutation.isPending ? 'Simulating...' : 'Run Flood Simulation'}
                    </button>
                    {result && (
                        <button onClick={() => resetMutation.mutate()} className="btn btn-ghost" style={{ marginTop: 16, fontSize: 12 }}>
                            <RotateCcw size={13} /> Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Results */}
            {result && (
                <div style={{ display: 'grid', gap: 16 }}>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                        {[
                            { label: 'Peak Rainfall', value: `${result.peak_rainfall_mmph?.toFixed(0)} mm/hr`, color: '#38bdf8', icon: CloudRain },
                            { label: 'Zones Flooded', value: `${result.zones_flooded} / ${result.total_zones}`, color: '#ffc947', icon: Waves },
                            { label: 'Roads Blocked', value: result.roads_blocked, color: '#ff4060', icon: AlertTriangle },
                            { label: 'Incidents', value: result.incidents_generated, color: '#a78bfa', icon: Droplets },
                        ].map(({ label, value, color, icon: Icon }) => (
                            <div key={label} className="glass" style={{ padding: '14px 16px', borderRadius: 12, border: `1px solid ${color}25`, background: `${color}08` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <Icon size={14} style={{ color }} />
                                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                                </div>
                                <div className="mono" style={{ fontSize: 22, fontWeight: 800, color: 'var(--text1)' }}>{value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Final Water Levels */}
                    <div className="glass" style={{ padding: 20, borderRadius: 14, border: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 14 }}>Final Water Levels by Zone</h3>
                        {(result.final_water_levels || []).sort((a, b) => b.water_level_m - a.water_level_m).map(z => {
                            const pct = Math.min(100, z.water_level_m * 25);
                            const color = z.water_level_m > 2 ? '#ff2d55' : z.water_level_m > 1 ? '#ff6b35' : z.water_level_m > 0.5 ? '#ffc947' : '#38bdf8';
                            return (
                                <div key={z.zone_id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                    <span style={{ width: 110, fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>{z.zone_name}</span>
                                    <div style={{ flex: 1, height: 8, borderRadius: 99, background: 'rgba(255,255,255,0.05)' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: color, transition: 'width 0.5s' }} />
                                    </div>
                                    <span className="mono" style={{ width: 50, fontSize: 12, fontWeight: 700, color, textAlign: 'right' }}>{z.water_level_m.toFixed(2)}m</span>
                                    <span style={{ width: 50, fontSize: 10, color: 'var(--text3)' }}>↕ {z.elevation_m}m</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
