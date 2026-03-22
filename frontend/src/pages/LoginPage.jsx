import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { login, getMe } from '../services/api';
import { Shield, AlertTriangle, Eye, EyeOff, Zap, Lock, User } from 'lucide-react';

const DEMO_ROLES = [
    { role: 'admin', label: 'Admin', icon: '⚡', color: '#ff4060', u: 'admin', p: 'Admin@AEIRAS2024' },
    { role: 'dispatcher', label: 'Dispatcher', icon: '📡', color: '#00d4ff', u: 'dispatcher1', p: 'Dispatch@123' },
    { role: 'viewer', label: 'Viewer', icon: '👁️', color: '#a78bfa', u: 'viewer1', p: 'Viewer@123' },
];

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { setAuth } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const { data } = await login(username, password);
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            const { data: me } = await getMe();
            setAuth(me, data.access_token, data.refresh_token);
            navigate('/dashboard');
        } catch (err) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setError(err.response?.data?.detail || 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const quickLogin = (u, p) => { setUsername(u); setPassword(p); setError(''); };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background layers */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 0,
                background: `
          radial-gradient(ellipse 70% 60% at 50% 0%, rgba(0,212,255,0.06) 0%, transparent 65%),
          radial-gradient(ellipse 50% 40% at 10% 100%, rgba(79,142,240,0.07) 0%, transparent 60%),
          radial-gradient(ellipse 40% 30% at 90% 50%, rgba(167,139,250,0.05) 0%, transparent 55%)
        `,
            }} />

            {/* Grid texture */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 0, opacity: 0.3,
                backgroundImage: `
          linear-gradient(rgba(0,212,255,0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.08) 1px, transparent 1px)
        `,
                backgroundSize: '80px 80px',
                maskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 0%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(ellipse 60% 60% at 50% 50%, black 0%, transparent 100%)',
            }} />

            {/* Floating orbs */}
            <div className="animate-float" style={{
                position: 'absolute', top: '15%', left: '8%', width: 300, height: 300,
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
                pointerEvents: 'none', filter: 'blur(40px)', zIndex: 0,
            }} />
            <div className="animate-float delay-400" style={{
                position: 'absolute', bottom: '10%', right: '6%', width: 250, height: 250,
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 70%)',
                pointerEvents: 'none', filter: 'blur(40px)', zIndex: 0,
            }} />

            {/* Card */}
            <div className="animate-fade-up" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420, padding: '0 20px' }}>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 64, height: 64, borderRadius: 18,
                        background: 'linear-gradient(135deg, rgba(0,212,255,0.18), rgba(79,142,240,0.12))',
                        border: '1px solid rgba(0,212,255,0.35)',
                        marginBottom: 16,
                        boxShadow: '0 0 40px rgba(0,212,255,0.18), inset 0 1px 0 rgba(255,255,255,0.1)',
                    }}>
                        <Shield size={28} style={{ color: 'var(--cyan)' }} />
                    </div>
                    <h1 style={{
                        fontSize: 28, fontWeight: 900, letterSpacing: '-0.04em',
                        background: 'linear-gradient(135deg, var(--text1) 40%, var(--cyan) 100%)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        marginBottom: 6,
                    }}>AEIRAS</h1>
                    <p style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, letterSpacing: '0.04em' }}>
                        AI Emergency Intelligence & Resource Allocation System
                    </p>
                </div>

                {/* Form card */}
                <div style={{
                    background: 'rgba(11,18,33,0.8)',
                    border: '1px solid var(--border)',
                    borderRadius: 20,
                    padding: 28,
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset',
                }}>
                    <div style={{ marginBottom: 24 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text1)', marginBottom: 4 }}>Sign in to continue</h2>
                        <p style={{ fontSize: 12, color: 'var(--text3)' }}>Secure access for authorized emergency personnel</p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Username */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                Username
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value)}
                                    className="form-input"
                                    style={{ paddingLeft: 36 }}
                                    placeholder="Enter username"
                                    autoComplete="username"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="form-input"
                                    style={{ paddingLeft: 36, paddingRight: 40 }}
                                    placeholder="Enter password"
                                    autoComplete="current-password"
                                    required
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)',
                                    display: 'flex', alignItems: 'center',
                                }}>
                                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="animate-fade-up" style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                background: 'rgba(255,64,96,0.1)', border: '1px solid rgba(255,64,96,0.3)',
                                borderRadius: 8, padding: '10px 12px',
                            }}>
                                <AlertTriangle size={13} style={{ color: 'var(--red)', flexShrink: 0 }} />
                                <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>
                            </div>
                        )}

                        {/* Submit */}
                        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 20px', fontSize: 14, marginTop: 4 }}>
                            {loading ? (
                                <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="20" strokeLinecap="round" />
                                    </svg>
                                    Authenticating...
                                </>
                            ) : (
                                <><Zap size={14} /> Sign In</>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>QUICK DEMO</span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                    </div>

                    {/* Demo role buttons */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        {DEMO_ROLES.map(({ role, label, icon, color, u, p }) => (
                            <button
                                key={role}
                                type="button"
                                onClick={() => quickLogin(u, p)}
                                style={{
                                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                    padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                                    background: `${color}0f`,
                                    border: `1px solid ${color}30`,
                                    transition: 'all 0.18s',
                                    outline: 'none',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = `${color}1a`; e.currentTarget.style.borderColor = `${color}55`; }}
                                onMouseLeave={e => { e.currentTarget.style.background = `${color}0f`; e.currentTarget.style.borderColor = `${color}30`; }}
                            >
                                <span style={{ fontSize: 18 }}>{icon}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: '0.04em' }}>{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', marginTop: 20 }}>
                    🔒 Encrypted · Role-based access · Audit logged
                </p>
            </div>

            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
}
