import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Map, Truck, Radio, BarChart3,
    Droplets, Shield, Wifi, WifiOff, Bell, LogOut,
    ChevronRight, Activity, Waves, CloudRain
} from 'lucide-react';
import { useAuthStore, useUIStore, useEmergencyStore } from '../store';
import { useWebSocket } from '../hooks/useWebSocket';

const NAV_ITEMS = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Flood Dashboard', accent: '#00d4ff' },
    { to: '/map', icon: Map, label: 'Flood Map', accent: '#4f8ef0' },
    { to: '/emergencies', icon: Droplets, label: 'Flood Incidents', accent: '#ff4060' },
    { to: '/resources', icon: Truck, label: 'Rescue Resources', accent: '#00e5a0' },
    { to: '/dispatch', icon: Radio, label: 'Dispatch Center', accent: '#ffc947' },
    { to: '/analytics', icon: BarChart3, label: 'Flood Analytics', accent: '#a78bfa' },
    { to: '/demo', icon: CloudRain, label: 'Flood Simulator', accent: '#38bdf8' },
];

const ROLE_COLORS = {
    admin: { bg: 'rgba(255,64,96,0.12)', color: '#ff4060', border: 'rgba(255,64,96,0.25)' },
    dispatcher: { bg: 'rgba(0,212,255,0.1)', color: '#00d4ff', border: 'rgba(0,212,255,0.2)' },
    viewer: { bg: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: 'rgba(167,139,250,0.2)' },
};

function LiveClock() {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);
    return (
        <span className="mono" style={{ color: 'var(--text2)', fontSize: 12 }}>
            {time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
    );
}

export default function AppLayout() {
    const { isAuthenticated, user, logout } = useAuthStore();
    const { wsConnected, notifications } = useUIStore();
    const { liveCount } = useEmergencyStore();
    const location = useLocation();
    useWebSocket();

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    const unread = notifications.filter(n => !n.read).length;
    const roleMeta = ROLE_COLORS[user?.role] || ROLE_COLORS.viewer;
    const currentPage = NAV_ITEMS.find(n => location.pathname.startsWith(n.to))?.label || 'AERIS Flood';

    return (
        <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', overflow: 'hidden', position: 'relative' }}>
            <div className="bg-mesh" />

            {/* ── Sidebar ──────────────────────────── */}
            <aside style={{
                width: 220, flexShrink: 0, zIndex: 10, display: 'flex', flexDirection: 'column',
                background: 'rgba(8,13,26,0.95)',
                borderRight: '1px solid var(--border)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
            }}>

                {/* Logo */}
                <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(79,142,240,0.15))',
                            border: '1px solid rgba(56,189,248,0.35)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 16px rgba(56,189,248,0.2)',
                        }}>
                            <Waves size={16} style={{ color: '#38bdf8' }} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text1)', letterSpacing: '-0.02em' }}>
                                AERIS Flood
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.08em', fontWeight: 600, textTransform: 'uppercase' }}>
                                Chennai Response
                            </div>
                        </div>
                    </div>
                </div>

                {/* WS Status strip */}
                <div style={{
                    margin: '12px 12px 4px',
                    padding: '7px 10px',
                    borderRadius: 8,
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: wsConnected ? 'rgba(0,229,160,0.07)' : 'rgba(255,64,96,0.07)',
                    border: `1px solid ${wsConnected ? 'rgba(0,229,160,0.2)' : 'rgba(255,64,96,0.2)'}`,
                }}>
                    <span className={wsConnected ? 'status-dot available' : 'status-dot critical'} style={{ width: 6, height: 6 }} />
                    {wsConnected
                        ? <><Wifi size={11} style={{ color: 'var(--green)' }} /><span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>Live Feed Active</span></>
                        : <><WifiOff size={11} style={{ color: 'var(--red)' }} /><span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>Disconnected</span></>
                    }
                    {liveCount > 0 && (
                        <span style={{ marginLeft: 'auto', background: 'var(--red)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '1px 6px' }}>
                            {liveCount}
                        </span>
                    )}
                </div>

                {/* Section: Main */}
                <div style={{ padding: '12px 12px 4px' }}>
                    <div className="section-label" style={{ paddingLeft: 4, marginBottom: 6 }}>Flood Operations</div>
                </div>

                {/* Nav Links */}
                <nav style={{ flex: 1, padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
                    {NAV_ITEMS.map(({ to, icon: Icon, label, accent }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            style={({ isActive }) => isActive ? { '--nav-accent': accent } : {}}
                        >
                            <div style={{
                                width: 28, height: 28, borderRadius: 7,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'rgba(255,255,255,0.05)',
                            }}>
                                <Icon size={14} />
                            </div>
                            <span>{label}</span>
                            <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: 0.3 }} />
                        </NavLink>
                    ))}
                </nav>

                {/* System status */}
                <div style={{ margin: '8px 12px', padding: '10px 12px', borderRadius: 10, background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Activity size={11} style={{ color: '#38bdf8' }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#38bdf8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Flood Response Active</span>
                    </div>
                </div>

                {/* User Card */}
                <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.03)', borderRadius: 10,
                        border: '1px solid var(--border)', padding: '10px 12px',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 8,
                                background: `linear-gradient(135deg, ${roleMeta.bg}, rgba(255,255,255,0.05))`,
                                border: `1px solid ${roleMeta.border}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 800, fontSize: 13, color: roleMeta.color,
                            }}>
                                {user?.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {user?.username || 'User'}
                                </div>
                                <div style={{
                                    fontSize: 10, fontWeight: 600, color: roleMeta.color,
                                    textTransform: 'uppercase', letterSpacing: '0.06em',
                                }}>
                                    {user?.role}
                                </div>
                            </div>
                        </div>
                        <button onClick={logout} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '6px 10px', fontSize: 12 }}>
                            <LogOut size={13} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main ───────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

                {/* Top bar */}
                <header style={{
                    height: 52, flexShrink: 0, display: 'flex', alignItems: 'center',
                    padding: '0 24px', gap: 16,
                    background: 'rgba(8,13,26,0.7)',
                    borderBottom: '1px solid var(--border)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                }}>
                    {/* Breadcrumb */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                        <Waves size={13} style={{ color: '#38bdf8' }} />
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>AERIS Flood</span>
                        <ChevronRight size={12} style={{ color: 'var(--text3)' }} />
                        <span style={{ fontSize: 12, color: 'var(--text1)', fontWeight: 600 }}>{currentPage}</span>
                    </div>

                    {/* Live counter */}
                    {liveCount > 0 && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: 'rgba(255,64,96,0.1)', border: '1px solid rgba(255,64,96,0.25)',
                            borderRadius: 99, padding: '4px 12px',
                        }}>
                            <Droplets size={11} style={{ color: 'var(--red)' }} className="animate-pulse-slow" />
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)' }} className="mono">{liveCount} active floods</span>
                        </div>
                    )}

                    {/* Notifications bell */}
                    <button style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                        <Bell size={16} style={{ color: 'var(--text2)' }} />
                        {unread > 0 && (
                            <span style={{
                                position: 'absolute', top: 0, right: 0, width: 14, height: 14,
                                background: 'var(--red)', borderRadius: 99,
                                fontSize: 9, fontWeight: 800, color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {unread > 9 ? '9+' : unread}
                            </span>
                        )}
                    </button>

                    {/* Divider */}
                    <div style={{ width: 1, height: 20, background: 'var(--border2)' }} />

                    {/* Clock */}
                    <LiveClock />
                </header>

                {/* Page content */}
                <div style={{ flex: 1, overflow: 'auto' }}>
                    <Outlet />
                </div>
            </div>

            {/* Toast Notifications */}
            <NotificationToasts />
        </div>
    );
}

function NotificationToasts() {
    const { notifications, clearNotification } = useUIStore();
    const recent = notifications.slice(0, 4);

    return (
        <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
            {recent.map(n => (
                <div
                    key={n.id}
                    className="animate-slide-in glass"
                    style={{
                        minWidth: 280, maxWidth: 340, borderRadius: 12, padding: '12px 16px',
                        pointerEvents: 'auto',
                        border: n.severity === 'critical' ? '1px solid rgba(255,64,96,0.35)' : '1px solid rgba(56,189,248,0.25)',
                        background: n.severity === 'critical' ? 'rgba(255,64,96,0.08)' : 'rgba(56,189,248,0.06)',
                        boxShadow: n.severity === 'critical' ? 'var(--red-glow)' : '0 0 20px rgba(56,189,248,0.15)',
                    }}
                >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <Droplets size={15} style={{ color: n.severity === 'critical' ? 'var(--red)' : '#38bdf8', flexShrink: 0, marginTop: 1 }} />
                        <p style={{ fontSize: 12, color: 'var(--text1)', flex: 1, lineHeight: 1.5 }}>{n.message}</p>
                        <button onClick={() => clearNotification(n.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 14, padding: 0, lineHeight: 1 }}>
                            ✕
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
