import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    GoogleMap, useJsApiLoader, Marker, InfoWindow,
    DirectionsRenderer, Circle, StandaloneSearchBox,
} from '@react-google-maps/api';
import { useQuery } from '@tanstack/react-query';
import { getHeatmap, listResources, getHotspots } from '../services/api';
import {
    Search, Crosshair, Phone, Clock, Star, MapPin,
    Navigation, X, ChevronLeft, ChevronRight, Layers,
    AlertTriangle, Truck, Send, CheckCircle, Filter,
    Hospital, ShieldCheck, Flame,
} from 'lucide-react';
import { ALL_INDIA_CITIES } from '../data/indiaCities';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const LIBRARIES = ['places', 'geometry'];
const DEFAULT_CENTER = { lat: 13.0827, lng: 80.2707 }; // Chennai

const SEV_COLOR = { low: '#00e5a0', medium: '#ffc947', high: '#ff8c42', critical: '#ff4060', default: '#4f8ef0' };
const RES_COLOR = { ambulance: '#4f8ef0', fire_truck: '#ff8c42', police_unit: '#a78bfa', rescue_team: '#00e5a0', hazmat_unit: '#ffc947' };
const RES_EMOJI = { ambulance: '🚑', fire_truck: '🚒', police_unit: '🚓', rescue_team: '🛟', hazmat_unit: '☢️' };

const SERVICE_TABS = [
    { type: 'hospital', label: 'Hospitals', icon: '🏥', color: '#ea4335', mapColor: '#ea4335', letter: 'H' },
    { type: 'police', label: 'Police', icon: '🚓', color: '#1a73e8', mapColor: '#1a73e8', letter: 'P' },
    { type: 'fire_station', label: 'Fire Stations', icon: '🚒', color: '#ff6d00', mapColor: '#ff6d00', letter: 'F' },
];

const DARK_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#0d1426' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#7890b8' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1426' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bdbdbd' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#1a2644' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#111a2e' }] },
    { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#243050' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#071324' }] },
];
const MAP_OPTIONS = { styles: DARK_MAP_STYLE, disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', clickableIcons: false };

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371, dL = ((lat2 - lat1) * Math.PI) / 180, dN = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dL / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dN / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Google Maps-style markers
function gmapServiceMarkerIcon(letter, color) {
    const c = color.replace('#', '%23');
    return {
        url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46"><path d="M18 0C8.06 0 0 8.06 0 18c0 13.55 18 28 18 28s18-14.45 18-28C36 8.06 27.94 0 18 0z" fill="${c}"/><circle cx="18" cy="18" r="11" fill="white" opacity="0.9"/><text x="18" y="23" font-size="13" font-weight="900" text-anchor="middle" font-family="Arial" fill="${c}">${letter}</text></svg>`,
        scaledSize: { width: 36, height: 46 },
        anchor: { x: 18, y: 46 },
    };
}
function gpsLocationIcon() {
    return {
        url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="%234285f422"/><circle cx="24" cy="24" r="14" fill="%234285f430"/><circle cx="24" cy="24" r="8" fill="%234285f4" stroke="%23fff" stroke-width="2.5"/></svg>`,
        scaledSize: { width: 48, height: 48 },
        anchor: { x: 24, y: 24 },
    };
}
function emergencyMarkerIcon(sev) {
    const color = SEV_COLOR[sev] || SEV_COLOR.default, s = sev === 'critical' ? 26 : 18;
    return { url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${s / 2 - 3}" fill="${color}" stroke="${color}aa" stroke-width="2"/></svg>`, scaledSize: { width: s, height: s } };
}
function resourceMarkerIcon(type) {
    const color = (RES_COLOR[type] || '#7890b8').replace('#', '%23'), emoji = encodeURIComponent(RES_EMOJI[type] || '🚨');
    return { url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><circle cx="18" cy="18" r="16" fill="%23111a2e" stroke="${color}" stroke-width="2"/><text x="18" y="24" font-size="16" text-anchor="middle">${emoji}</text></svg>`, scaledSize: { width: 36, height: 36 } };
}

// ── Star Rating ─────────────────────────────────────────────────────────────
function StarRating({ rating, count }) {
    if (!rating) return null;
    const full = Math.floor(rating), half = rating % 1 >= 0.5;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#ffa000' }}>{rating.toFixed(1)}</span>
            <div style={{ display: 'flex', gap: 1 }}>
                {[1, 2, 3, 4, 5].map(i => (
                    <svg key={i} width="10" height="10" viewBox="0 0 24 24">
                        <path fill={i <= full ? '#ffa000' : (i === full + 1 && half ? '#ffa000' : '#555')} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                ))}
            </div>
            {count && <span style={{ fontSize: 10, color: 'var(--text3)' }}>({count.toLocaleString()})</span>}
        </div>
    );
}

// ── Google Maps-style Left Sidebar ──────────────────────────────────────────
function PlacesSidebar({ services, loading, activeTab, onTabChange, onSelect, selectedPlace, onClose, origin, allIndiaMode, scannedCount }) {
    const show = services.length > 0 || loading;
    if (!show && !loading) return null;

    const filtered = services.filter(s => s.serviceType === activeTab);
    const tab = SERVICE_TABS.find(t => t.type === activeTab);

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 900,
            width: 360, background: '#0b1221',
            boxShadow: '4px 0 32px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column',
            borderRight: '1px solid rgba(255,255,255,0.08)',
        }}>
            {/* Header */}
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 99, background: tab?.color + '22', border: `1.5px solid ${tab?.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                            {tab?.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text1)' }}>
                                {allIndiaMode ? '🇮🇳 All India Services' : `${tab?.label} Near You`}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                                {allIndiaMode
                                    ? loading
                                        ? `Scanning city ${scannedCount}/${ALL_INDIA_CITIES.length} · ${filtered.length} found…`
                                        : `${filtered.length} ${tab?.label.toLowerCase()} · all states`
                                    : loading ? 'Searching nearby…' : `${filtered.length} results found`}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}>
                        <X size={14} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 6 }}>
                    {SERVICE_TABS.map(t => (
                        <button key={t.type} onClick={() => onTabChange(t.type)}
                            style={{ flex: 1, padding: '6px 4px', borderRadius: 10, fontSize: 10, fontWeight: 800, cursor: 'pointer', border: `1.5px solid ${activeTab === t.type ? t.color : 'var(--border)'}`, background: activeTab === t.type ? t.color + '18' : 'transparent', color: activeTab === t.type ? t.color : 'var(--text3)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <span style={{ fontSize: 13 }}>{t.icon}</span>
                            {t.label.split(' ')[0]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading && filtered.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center' }}>
                        <div style={{ width: 28, height: 28, border: `3px solid ${tab?.color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Finding {tab?.label.toLowerCase()} near you…</div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>No {tab?.label.toLowerCase()} found nearby.</div>
                ) : (
                    filtered.map((place, i) => {
                        const isSelected = selectedPlace?.place_id === place.place_id;
                        const etaColor = place.responseTime?.minutes <= 10 ? '#00e5a0' : place.responseTime?.minutes <= 20 ? '#ffc947' : '#ff8c42';
                        const photoUrl = place.photos?.[0]?.getUrl({ maxWidth: 80, maxHeight: 80 });

                        return (
                            <div key={place.place_id || i}
                                onClick={() => onSelect(place)}
                                style={{
                                    display: 'flex', gap: 12, padding: '13px 16px',
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    cursor: 'pointer',
                                    background: isSelected ? `${tab?.color}10` : 'transparent',
                                    borderLeft: isSelected ? `3px solid ${tab?.color}` : '3px solid transparent',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                            >
                                {/* Photo or icon */}
                                <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: tab?.color + '15', border: `1.5px solid ${tab?.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {photoUrl ? (
                                        <img src={photoUrl} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <span style={{ fontSize: 28 }}>{tab?.icon}</span>
                                    )}
                                </div>

                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: isSelected ? tab?.color : 'var(--text1)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {i + 1}. {place.name}
                                    </div>
                                    <StarRating rating={place.rating} count={place.user_ratings_total} />
                                    <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {place.city ? `📍 ${place.city}${place.state ? `, ${place.state}` : ''} · ` : ''}{place.vicinity}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' }}>
                                        {place.opening_hours && (
                                            <span style={{ fontSize: 10, fontWeight: 700, color: place.opening_hours.open_now ? '#00e5a0' : '#ff4060' }}>
                                                {place.opening_hours.open_now ? '● Open now' : '● Closed'}
                                            </span>
                                        )}
                                        {place.responseTime && (
                                            <span style={{ fontSize: 11, fontWeight: 800, color: etaColor, fontFamily: 'monospace', background: etaColor + '15', padding: '1px 6px', borderRadius: 5 }}>
                                                {place.responseTime.minutes} min · {place.responseTime.distance}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Arrow */}
                                <ChevronRight size={14} style={{ color: isSelected ? tab?.color : 'var(--text3)', flexShrink: 0, alignSelf: 'center' }} />
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 10, color: 'var(--text3)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00e5a0', flexShrink: 0 }} />
                Powered by Google Places API · Live data
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

// ── Place Detail Panel (right side, like Google Maps info panel) ─────────────
function PlaceDetailPanel({ place, onClose, onGetDirections }) {
    if (!place) return null;
    const tab = SERVICE_TABS.find(t => t.type === place.serviceType);
    const photoUrl = place.photos?.[0]?.getUrl({ maxWidth: 340, maxHeight: 180 });
    const etaColor = place.responseTime?.minutes <= 10 ? '#00e5a0' : place.responseTime?.minutes <= 20 ? '#ffc947' : '#ff8c42';

    return (
        <div style={{
            position: 'absolute', top: 16, right: 16, zIndex: 1000, width: 300,
            background: '#0b1221', border: `1px solid ${tab?.color}40`,
            borderRadius: 16, overflow: 'hidden',
            boxShadow: `0 0 30px ${tab?.color}20, 0 8px 40px rgba(0,0,0,0.5)`,
        }}>
            {/* Photo */}
            {photoUrl ? (
                <div style={{ height: 140, background: '#111a2e', position: 'relative' }}>
                    <img src={photoUrl} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,18,33,0.7) 0%, transparent 50%)' }} />
                </div>
            ) : (
                <div style={{ height: 80, background: tab?.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                    {tab?.icon}
                </div>
            )}

            {/* Close */}
            <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 99, background: 'rgba(0,0,0,0.5)', border: 'none', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} />
            </button>

            <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text1)', marginBottom: 4 }}>{place.name}</div>
                <StarRating rating={place.rating} count={place.user_ratings_total} />

                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {place.vicinity && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <MapPin size={12} style={{ color: 'var(--text3)', flexShrink: 0, marginTop: 1 }} />
                            <span style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.4 }}>{place.vicinity}</span>
                        </div>
                    )}
                    {place.opening_hours && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <Clock size={12} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: place.opening_hours.open_now ? '#00e5a0' : '#ff4060' }}>
                                {place.opening_hours.open_now ? 'Open now' : 'Currently closed'}
                            </span>
                        </div>
                    )}
                    {place.responseTime && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, background: etaColor + '10', border: `1px solid ${etaColor}30`, borderRadius: 10, padding: '8px 10px' }}>
                            <Navigation size={13} style={{ color: etaColor, flexShrink: 0 }} />
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 900, color: etaColor, fontFamily: 'monospace', lineHeight: 1 }}>{place.responseTime.minutes} min</div>
                                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{place.responseTime.distance} away</div>
                            </div>
                        </div>
                    )}
                </div>

                <button onClick={onGetDirections}
                    style={{ marginTop: 12, width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${tab?.color}, ${tab?.color}cc)`, color: '#fff', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 4px 16px ${tab?.color}40` }}>
                    <Navigation size={13} /> Get Directions
                </button>
            </div>
        </div>
    );
}

// ── GPS Dispatch Panel (bottom-right) ──────────────────────────────────────
function GpsDispatchPanel({ myLocation, nearestResource, routeToNearest, dispatching, dispatched, onDispatch, onClear, accuracy }) {
    if (!myLocation) return null;
    return (
        <div style={{ position: 'absolute', bottom: 80, right: 16, zIndex: 1000, width: 280, background: 'rgba(8,13,26,0.97)', border: '1px solid rgba(66,133,244,0.4)', borderRadius: 14, backdropFilter: 'blur(24px)', boxShadow: '0 0 24px rgba(66,133,244,0.15)', overflow: 'hidden' }}>
            <div style={{ background: 'rgba(66,133,244,0.08)', borderBottom: '1px solid rgba(66,133,244,0.2)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'rgba(66,133,244,0.2)', border: '1px solid rgba(66,133,244,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={13} style={{ color: '#4285f4' }} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text1)' }}>Your Location</div>
                    <div style={{ fontSize: 9, color: 'var(--text3)' }}>±{Math.round(accuracy || 0)}m · GPS Active</div>
                </div>
                <button onClick={onClear} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}><X size={11} /></button>
            </div>
            <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'monospace', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '4px 0', marginBottom: 8 }}>
                    {myLocation.lat.toFixed(5)}°N, {myLocation.lng.toFixed(5)}°E
                </div>
                {nearestResource ? (
                    <>
                        {routeToNearest && (
                            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                {[['ETA', routeToNearest.duration], ['Dist', routeToNearest.distance]].map(([l, v]) => (
                                    <div key={l} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '7px 8px', border: '1px solid var(--border)' }}>
                                        <div style={{ fontSize: 8, color: 'var(--text3)', fontWeight: 700, marginBottom: 2, textTransform: 'uppercase' }}>{l}</div>
                                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--cyan)', fontFamily: 'monospace' }}>{v}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 9, border: '1px solid var(--border)', padding: '8px 10px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>{RES_EMOJI[nearestResource.resource_type] || '🚨'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nearestResource.name}</div>
                                <div style={{ fontSize: 9, color: 'var(--text3)' }}>{nearestResource.dist?.toFixed(1)} km away</div>
                            </div>
                        </div>
                        {dispatched ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '8px', borderRadius: 9, background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)' }}>
                                <CheckCircle size={13} style={{ color: 'var(--green)' }} /><span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>Unit Dispatched!</span>
                            </div>
                        ) : (
                            <button onClick={onDispatch} disabled={dispatching} style={{ width: '100%', padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', background: dispatching ? 'rgba(66,133,244,0.3)' : 'linear-gradient(135deg,#4285f4,#1a6fe8)', color: '#fff', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                                {dispatching ? <><div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Dispatching…</> : <><Send size={12} /> Dispatch Nearest Unit</>}
                            </button>
                        )}
                    </>
                ) : (
                    <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', padding: '6px 0' }}>No AEIRAS units nearby</div>
                )}
            </div>
        </div>
    );
}

// ── Main MapPage ────────────────────────────────────────────────────────────
export default function MapPage() {
    const [timeWindow, setTimeWindow] = useState(24);
    const [filterType, setFilterType] = useState('');
    const [showRes, setShowRes] = useState(true);
    const [showEm, setShowEm] = useState(true);
    const [showHotspots, setShowHotspots] = useState(false);
    const [selectedEmergency, setSelectedEmergency] = useState(null);
    const [selectedResource, setSelectedResource] = useState(null);
    const [directions, setDirections] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [nearbyServices, setNearbyServices] = useState([]);
    const [servicesLoading, setServicesLoading] = useState(false);
    const [activeServiceTab, setActiveServiceTab] = useState('hospital');
    const [selectedPlace, setSelectedPlace] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [allIndiaMode, setAllIndiaMode] = useState(false);
    const [scannedCount, setScannedCount] = useState(0);
    // GPS state
    const [myLocation, setMyLocation] = useState(null);
    const [myLocationAccuracy, setMyLocationAccuracy] = useState(0);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [nearestResource, setNearestResource] = useState(null);
    const [routeToNearest, setRouteToNearest] = useState(null);
    const [dispatching, setDispatching] = useState(false);
    const [dispatched, setDispatched] = useState(false);

    const mapRef = useRef(null);
    const searchBoxRef = useRef(null);
    const watchIdRef = useRef(null);

    const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY, libraries: LIBRARIES });

    const { data: heatmap, isLoading: mapLoading } = useQuery({
        queryKey: ['heatmap', timeWindow, filterType],
        queryFn: () => getHeatmap({ hours: timeWindow, emergency_type: filterType || undefined }).then(r => r.data),
        refetchInterval: 15000,
    });
    const { data: resData } = useQuery({
        queryKey: ['resources-map'],
        queryFn: () => listResources({ page_size: 100 }).then(r => r.data),
        refetchInterval: 15000,
    });

    const { data: hotspotsData } = useQuery({
        queryKey: ['hotspots', showHotspots],
        queryFn: () => getHotspots({ hours: 2160, min_samples: 5 }).then(r => r.data),
        enabled: showHotspots,
        staleTime: 60000,
    });
    const hotspotClusters = hotspotsData?.clusters || [];

    const emergencies = heatmap?.points || [];
    const resources = resData?.items || [];
    const availableResources = resources.filter(r => r.status === 'available');

    // ── Calc response time ───────────────────────────────────────────────
    const calcResponseTime = useCallback((svc, destLat, destLng) => {
        if (!window.google) return;
        new window.google.maps.DirectionsService().route({
            origin: new window.google.maps.LatLng(svc.lat, svc.lng),
            destination: new window.google.maps.LatLng(destLat, destLng),
            travelMode: window.google.maps.TravelMode.DRIVING,
            drivingOptions: { departureTime: new Date(), trafficModel: 'bestguess' },
        }, (result, status) => {
            if (status === 'OK') {
                const leg = result.routes[0]?.legs[0];
                const minutes = Math.ceil((leg.duration_in_traffic?.value || leg.duration.value) / 60);
                setNearbyServices(prev => prev.map(s => s.place_id === svc.place_id ? { ...s, responseTime: { minutes, distance: leg.distance.text } } : s));
            }
        });
    }, []);

    // ── Fetch nearby services ─────────────────────────────────────────────
    const fetchNearbyServices = useCallback((lat, lng) => {
        if (!window.google || !mapRef.current) return;
        const placeSvc = new window.google.maps.places.PlacesService(mapRef.current);
        SERVICE_TABS.forEach(({ type, label }) => {
            const keyword = type === 'fire_station' ? 'fire station' : type === 'police' ? 'police station' : 'hospital';
            placeSvc.nearbySearch(
                { location: { lat, lng }, rankBy: window.google.maps.places.RankBy.DISTANCE, type, keyword },
                (results, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                        const tagged = results.slice(0, 20).map(r => ({
                            ...r,
                            serviceType: type,
                            lat: r.geometry.location.lat(),
                            lng: r.geometry.location.lng(),
                            responseTime: null,
                        }));
                        setNearbyServices(prev => {
                            const existingIds = new Set(prev.map(x => x.place_id));
                            const newOnes = tagged.filter(t => !existingIds.has(t.place_id));
                            newOnes.forEach(s => calcResponseTime(s, lat, lng));
                            return [...prev, ...newOnes];
                        });
                    }
                }
            );
        });
    }, [calcResponseTime]);

    // ── All India: sequential queue — one city at a time, 350ms apart ──────
    const allIndiaCancelRef = useRef(false);
    const fetchAllIndiaServices = useCallback(() => {
        if (!window.google || !mapRef.current) return;
        allIndiaCancelRef.current = false;
        setAllIndiaMode(true);
        setSidebarOpen(true);
        setSelectedPlace(null);
        setDirections(null);
        setNearbyServices([]);
        setScannedCount(0);
        setServicesLoading(true);
        mapRef.current.setCenter({ lat: 22.9734, lng: 78.6569 });
        mapRef.current.setZoom(5);

        let idx = 0;
        const processNext = () => {
            if (allIndiaCancelRef.current || idx >= ALL_INDIA_CITIES.length || !mapRef.current) {
                setServicesLoading(false);
                return;
            }
            const city = ALL_INDIA_CITIES[idx++];
            setScannedCount(idx);
            const placeSvc = new window.google.maps.places.PlacesService(mapRef.current);
            let pending = SERVICE_TABS.length;
            const collected = [];
            SERVICE_TABS.forEach(({ type }) => {
                const keyword = type === 'fire_station' ? 'fire station' : type === 'police' ? 'police station' : 'hospital';
                placeSvc.nearbySearch(
                    { location: { lat: city.lat, lng: city.lng }, radius: 25000, type, keyword },
                    (results, status) => {
                        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                            results.slice(0, 3).forEach(r => collected.push({
                                ...r, serviceType: type,
                                lat: r.geometry.location.lat(),
                                lng: r.geometry.location.lng(),
                                responseTime: null, city: city.name, state: city.state,
                            }));
                        }
                        if (--pending === 0) {
                            setNearbyServices(prev => {
                                const seen = new Set(prev.map(x => x.place_id));
                                return [...prev, ...collected.filter(c => !seen.has(c.place_id))];
                            });
                            setTimeout(processNext, 350);
                        }
                    }
                );
            });
        };
        processNext();
    }, []);

    const stopAllIndia = () => {
        allIndiaCancelRef.current = true;
        setAllIndiaMode(false);
        setServicesLoading(false);
        setScannedCount(0);
        setNearbyServices([]);
        setSidebarOpen(false);
    };


    // ── On map load → auto-locate ─────────────────────────────────────────
    const onMapLoad = useCallback((map) => {
        mapRef.current = map;
        setTimeout(() => {
            if (!navigator.geolocation) return;
            setGpsLoading(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude, lng = pos.coords.longitude;
                    setMyLocation({ lat, lng });
                    setMyLocationAccuracy(pos.coords.accuracy);
                    setGpsLoading(false);
                    map.panTo({ lat, lng });
                    map.setZoom(14);
                    // Auto-fetch nearby services — like "hospital near me"
                    setNearbyServices([]);
                    setServicesLoading(true);
                    setSidebarOpen(true);
                    setTimeout(() => {
                        fetchNearbyServices(lat, lng);
                        setServicesLoading(false);
                    }, 700);
                },
                () => setGpsLoading(false),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }, 1500);
    }, [fetchNearbyServices]);

    // ── Locate Me button ──────────────────────────────────────────────────
    const locateMe = useCallback(() => {
        if (!navigator.geolocation) return;
        setGpsLoading(true);
        setDispatched(false);
        if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                const lat = pos.coords.latitude, lng = pos.coords.longitude;
                setMyLocation({ lat, lng });
                setMyLocationAccuracy(pos.coords.accuracy);
                setGpsLoading(false);
                mapRef.current?.panTo({ lat, lng });
                mapRef.current?.setZoom(14);
                setNearbyServices([]);
                setServicesLoading(true);
                setSidebarOpen(true);
                setTimeout(() => { fetchNearbyServices(lat, lng); setServicesLoading(false); }, 500);
                if (availableResources.length > 0) {
                    const nearest = availableResources.reduce((best, r) => {
                        const d = haversine(lat, lng, r.latitude, r.longitude);
                        return !best || d < best.dist ? { ...r, dist: d } : best;
                    }, null);
                    setNearestResource(nearest);
                    if (nearest && window.google) {
                        new window.google.maps.DirectionsService().route({
                            origin: new window.google.maps.LatLng(nearest.latitude, nearest.longitude),
                            destination: new window.google.maps.LatLng(lat, lng),
                            travelMode: window.google.maps.TravelMode.DRIVING,
                        }, (result, status) => {
                            if (status === 'OK') {
                                const leg = result.routes[0]?.legs[0];
                                setRouteToNearest({ duration: leg.duration.text, distance: leg.distance.text });
                            }
                        });
                    }
                }
            },
            () => setGpsLoading(false),
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
    }, [availableResources, fetchNearbyServices]);

    // ── Select a place → show detail + route ─────────────────────────────
    const handleSelectPlace = useCallback((place) => {
        setSelectedPlace(place);
        if (!myLocation && !window.google) return;
        const dest = myLocation;
        if (!dest) return;
        setRouteLoading(true);
        new window.google.maps.DirectionsService().route({
            origin: new window.google.maps.LatLng(place.lat, place.lng),
            destination: new window.google.maps.LatLng(dest.lat, dest.lng),
            travelMode: window.google.maps.TravelMode.DRIVING,
            drivingOptions: { departureTime: new Date(), trafficModel: 'bestguess' },
        }, (result, status) => {
            setRouteLoading(false);
            if (status === 'OK') {
                setDirections(result);
                const bounds = new window.google.maps.LatLngBounds();
                result.routes[0].overview_path.forEach(p => bounds.extend(p));
                mapRef.current?.fitBounds(bounds, { top: 60, left: sidebarOpen ? 380 : 60, right: 340, bottom: 60 });
            }
        });
    }, [myLocation, sidebarOpen]);

    const clearMyLocation = () => {
        if (watchIdRef.current) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
        setMyLocation(null); setNearestResource(null); setRouteToNearest(null);
        setDispatched(false); setGpsLoading(false); setNearbyServices([]);
        setSidebarOpen(false); setSelectedPlace(null); setDirections(null);
    };

    const calcRoute = useCallback((emergency) => {
        if (!window.google || !availableResources.length) return;
        const nearest = availableResources.reduce((best, r) => { const d = haversine(emergency.lat, emergency.lon, r.latitude, r.longitude); return !best || d < best.dist ? { ...r, dist: d } : best; }, null);
        if (!nearest) return;
        setRouteLoading(true);
        new window.google.maps.DirectionsService().route({ origin: new window.google.maps.LatLng(nearest.latitude, nearest.longitude), destination: new window.google.maps.LatLng(emergency.lat, emergency.lon), travelMode: window.google.maps.TravelMode.DRIVING }, (result, status) => {
            setRouteLoading(false);
            if (status === 'OK') { setDirections(result); const bounds = new window.google.maps.LatLngBounds(); result.routes[0].overview_path.forEach(p => bounds.extend(p)); mapRef.current?.fitBounds(bounds); }
        });
    }, [availableResources]);

    useEffect(() => () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); }, []);

    if (loadError) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--red)' }}>Google Maps failed to load.</div>;
    if (!isLoaded) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--cyan)' }}>Loading Google Maps…</div>;

    const activeTabCfg = SERVICE_TABS.find(t => t.type === activeServiceTab);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
            {/* Toolbar */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', height: 52, background: 'rgba(8,13,26,0.95)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(16px)', zIndex: 1001 }}>
                <Layers size={14} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', flexShrink: 0 }}>Live Map</span>

                {/* Search */}
                <StandaloneSearchBox onLoad={ref => { searchBoxRef.current = ref; }} onPlacesChanged={() => {
                    const places = searchBoxRef.current?.getPlaces();
                    if (!places?.length) return;
                    const place = places[0];
                    const lat = place.geometry.location.lat(), lng = place.geometry.location.lng();
                    setMyLocation({ lat, lng }); setMyLocationAccuracy(0);
                    mapRef.current?.panTo({ lat, lng }); mapRef.current?.setZoom(14);
                    setNearbyServices([]); setServicesLoading(true); setSidebarOpen(true); setSelectedPlace(null);
                    setTimeout(() => { fetchNearbyServices(lat, lng); setServicesLoading(false); }, 500);
                }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--cyan)', pointerEvents: 'none' }} />
                        <input type="text" placeholder="Search hospitals, police, fire stations…" style={{ width: 240, padding: '6px 10px 6px 28px', borderRadius: 8, border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.06)', color: 'var(--text1)', fontSize: 11, outline: 'none', fontFamily: 'Inter, sans-serif' }} />
                    </div>
                </StandaloneSearchBox>

                {/* All India Button */}
                <button
                    onClick={allIndiaMode ? stopAllIndia : fetchAllIndiaServices}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', border: `1px solid ${allIndiaMode ? 'rgba(255,193,7,0.6)' : 'var(--border)'}`, background: allIndiaMode ? 'rgba(255,193,7,0.12)' : 'rgba(255,255,255,0.04)', color: allIndiaMode ? '#ffc107' : 'var(--text3)', transition: 'all 0.15s', flexShrink: 0 }}
                >
                    {allIndiaMode
                        ? <><div style={{ width: 10, height: 10, border: '2px solid #ffc107', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Scanning {scannedCount}/{ALL_INDIA_CITIES.length}</>
                        : <>🇮🇳 All India</>}
                </button>

                {/* Locate Me */}
                <button onClick={myLocation ? clearMyLocation : locateMe} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', border: `1px solid ${myLocation ? 'rgba(66,133,244,0.6)' : 'var(--border)'}`, background: myLocation ? 'rgba(66,133,244,0.15)' : 'rgba(255,255,255,0.04)', color: myLocation ? '#4285f4' : 'var(--text3)', transition: 'all 0.15s', flexShrink: 0 }}>
                    {gpsLoading ? <><div style={{ width: 10, height: 10, border: '2px solid #4285f4', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Locating…</> : myLocation ? <><Crosshair size={12} /> My Location</> : <><Crosshair size={12} /> Locate Me</>}
                </button>

                {/* Time */}
                <div style={{ display: 'flex', gap: 4 }}>
                    {[6, 24, 72].map(h => (
                        <button key={h} onClick={() => setTimeWindow(h)} style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${timeWindow === h ? 'rgba(0,212,255,0.5)' : 'var(--border)'}`, background: timeWindow === h ? 'rgba(0,212,255,0.12)' : 'transparent', color: timeWindow === h ? 'var(--cyan)' : 'var(--text3)' }}>{h}h</button>
                    ))}
                </div>

                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="form-input" style={{ width: 110, padding: '4px 8px', fontSize: 11 }}>
                    <option value="">All Types</option>
                    {['medical', 'fire', 'accident', 'flood', 'crime'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                    {[{ label: 'Emergencies', color: 'var(--red)', checked: showEm, set: setShowEm }, { label: 'Resources', color: 'var(--cyan)', checked: showRes, set: setShowRes }, { label: 'Hotspots', color: '#ff6b35', checked: showHotspots, set: setShowHotspots }].map(({ label, color, checked, set }) => (
                        <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, color: checked ? 'var(--text1)' : 'var(--text3)', userSelect: 'none' }}>
                            <div style={{ width: 12, height: 12, borderRadius: 3, border: `2px solid ${checked ? color : 'var(--border)'}`, background: checked ? color + '22' : 'transparent', transition: 'all 0.15s' }}><input type="checkbox" checked={checked} onChange={e => set(e.target.checked)} style={{ display: 'none' }} /></div>
                            {label}
                        </label>
                    ))}
                    <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono', paddingLeft: 8, borderLeft: '1px solid var(--border)' }}>
                        {emergencies.length} incidents · {resources.length} resources{showHotspots ? ` · ${hotspotClusters.length} hotspots` : ''}{nearbyServices.length > 0 ? ` · ${nearbyServices.length} services` : ''}
                    </span>
                </div>
            </div>

            {/* Map area + sidebar */}
            <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
                {/* Left Sidebar */}
                {sidebarOpen && (
                    <PlacesSidebar
                        services={nearbyServices}
                        loading={servicesLoading}
                        activeTab={activeServiceTab}
                        onTabChange={setActiveServiceTab}
                        onSelect={handleSelectPlace}
                        selectedPlace={selectedPlace}
                        onClose={() => { setSidebarOpen(false); setSelectedPlace(null); setDirections(null); setAllIndiaMode(false); allIndiaCancelRef.current = true; setNearbyServices([]); }}
                        origin={myLocation}
                        allIndiaMode={allIndiaMode}
                        scannedCount={scannedCount}
                    />
                )}

                {/* Map */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <GoogleMap
                        mapContainerStyle={{ height: '100%', width: '100%' }}
                        center={DEFAULT_CENTER} zoom={5}
                        options={MAP_OPTIONS}
                        onLoad={onMapLoad}
                    >
                        {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true, polylineOptions: { strokeColor: activeTabCfg?.color || '#4285f4', strokeOpacity: 0.9, strokeWeight: 5 } }} />}

                        {/* GPS dot */}
                        {myLocation && <Marker position={{ lat: myLocation.lat, lng: myLocation.lng }} icon={gpsLocationIcon()} zIndex={300} title="Your Location" />}

                        {/* Nearby service markers — Google Maps style */}
                        {nearbyServices.map((svc, i) => {
                            const cfg = SERVICE_TABS.find(t => t.type === svc.serviceType);
                            const isSelected = selectedPlace?.place_id === svc.place_id;
                            return (
                                <Marker
                                    key={svc.place_id || i}
                                    position={{ lat: svc.lat, lng: svc.lng }}
                                    icon={gmapServiceMarkerIcon(cfg?.letter || '?', isSelected ? '#fff' : cfg?.color)}
                                    zIndex={isSelected ? 200 : 100}
                                    onClick={() => { setActiveServiceTab(svc.serviceType); setSidebarOpen(true); handleSelectPlace(svc); }}
                                />
                            );
                        })}

                        {/* Emergency radius circles + markers */}
                        {showEm && emergencies.map(em => (
                            <React.Fragment key={em.id}>
                                <Circle center={{ lat: em.lat, lng: em.lon }} radius={em.intensity * 900} options={{ strokeColor: SEV_COLOR[em.severity] || SEV_COLOR.default, strokeOpacity: 0.35, strokeWeight: 1, fillColor: SEV_COLOR[em.severity] || SEV_COLOR.default, fillOpacity: 0.1 }} />
                                <Marker position={{ lat: em.lat, lng: em.lon }} icon={emergencyMarkerIcon(em.severity)} onClick={() => { setSelectedEmergency(em); setSelectedResource(null); }} />
                            </React.Fragment>
                        ))}

                        {/* Hotspot clusters */}
                        {showHotspots && hotspotClusters.map(hs => {
                            const riskColor = hs.risk_level === 'CRITICAL' ? '#ff4060' : hs.risk_level === 'HIGH' ? '#ff8c42' : '#ffc947';
                            return (
                                <React.Fragment key={`hs-${hs.cluster_id}`}>
                                    <Circle
                                        center={{ lat: hs.center_lat, lng: hs.center_lon }}
                                        radius={Math.max(300, hs.radius_km * 1000)}
                                        options={{
                                            strokeColor: riskColor,
                                            strokeOpacity: 0.8,
                                            strokeWeight: 2,
                                            fillColor: riskColor,
                                            fillOpacity: 0.15,
                                        }}
                                    />
                                    <Marker
                                        position={{ lat: hs.center_lat, lng: hs.center_lon }}
                                        icon={{
                                            url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="${riskColor.replace('#', '%23')}" opacity="0.85"/><text x="16" y="20" font-size="11" font-weight="900" text-anchor="middle" font-family="Arial" fill="white">${hs.incident_count}</text></svg>`,
                                            scaledSize: { width: 32, height: 32 },
                                            anchor: { x: 16, y: 16 },
                                        }}
                                        title={`${hs.risk_level} Hotspot: ${hs.incident_count} incidents (${hs.dominant_type})`}
                                    />
                                </React.Fragment>
                            );
                        })}

                        {/* Resource markers */}
                        {showRes && resources.map(r => (
                            <Marker key={`r-${r.id}`} position={{ lat: r.latitude, lng: r.longitude }} icon={resourceMarkerIcon(r.resource_type)} opacity={r.status === 'busy' ? 0.45 : 1} onClick={() => { setSelectedResource(r); setSelectedEmergency(null); }} />
                        ))}

                        {/* Emergency info window */}
                        {selectedEmergency && (
                            <InfoWindow position={{ lat: selectedEmergency.lat, lng: selectedEmergency.lon }} onCloseClick={() => setSelectedEmergency(null)}>
                                <div style={{ background: '#0b1221', color: '#f0f4ff', padding: '12px 14px', borderRadius: 10, minWidth: 190, fontFamily: 'Inter, sans-serif' }}>
                                    <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 7, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 5 }}>Emergency #{selectedEmergency.id}</div>
                                    {[['Type', selectedEmergency.type || '—'], ['Severity', (selectedEmergency.severity || '?').toUpperCase()], ['People', selectedEmergency.people_affected ?? '—']].map(([l, v]) => (
                                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                            <span style={{ color: '#7890b8', fontSize: 10 }}>{l}</span>
                                            <span style={{ color: l === 'Severity' ? SEV_COLOR[selectedEmergency.severity] || '#f0f4ff' : '#f0f4ff', fontWeight: 700, fontSize: 10 }}>{v}</span>
                                        </div>
                                    ))}
                                    <button onClick={() => { calcRoute(selectedEmergency); setSelectedEmergency(null); }} style={{ marginTop: 9, width: '100%', padding: '6px 0', borderRadius: 7, background: 'rgba(0,212,255,0.18)', border: '1px solid rgba(0,212,255,0.4)', color: '#00d4ff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                                        Route Nearest Unit
                                    </button>
                                </div>
                            </InfoWindow>
                        )}

                        {/* Resource info window */}
                        {selectedResource && (
                            <InfoWindow position={{ lat: selectedResource.latitude, lng: selectedResource.longitude }} onCloseClick={() => setSelectedResource(null)}>
                                <div style={{ background: '#0b1221', color: '#f0f4ff', padding: '12px 14px', borderRadius: 10, minWidth: 180, fontFamily: 'Inter, sans-serif' }}>
                                    <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 7 }}>{RES_EMOJI[selectedResource.resource_type] || '🚨'} {selectedResource.name}</div>
                                    {[['Status', selectedResource.status], ['Type', (selectedResource.resource_type || '').replace(/_/g, ' ')], ['Vehicle', selectedResource.vehicle_id || '—']].map(([l, v]) => (
                                        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                            <span style={{ color: '#7890b8', fontSize: 10 }}>{l}</span>
                                            <span style={{ color: l === 'Status' ? (selectedResource.status === 'available' ? '#00e5a0' : '#ff8c42') : '#f0f4ff', fontWeight: 700, fontSize: 10 }}>{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </InfoWindow>
                        )}
                    </GoogleMap>

                    {/* Place Detail Panel (right) */}
                    <PlaceDetailPanel
                        place={selectedPlace}
                        onClose={() => { setSelectedPlace(null); setDirections(null); }}
                        onGetDirections={() => selectedPlace && handleSelectPlace(selectedPlace)}
                    />

                    {/* GPS Dispatch Panel (bottom-right) */}
                    <GpsDispatchPanel
                        myLocation={myLocation}
                        nearestResource={nearestResource}
                        routeToNearest={routeToNearest}
                        dispatching={dispatching}
                        dispatched={dispatched}
                        onDispatch={() => { setDispatching(true); setTimeout(() => { setDispatching(false); setDispatched(true); }, 1500); }}
                        onClear={clearMyLocation}
                        accuracy={myLocationAccuracy}
                    />

                    {/* Legend */}
                    <div style={{ position: 'absolute', bottom: 20, left: sidebarOpen ? 376 : 16, zIndex: 999, background: 'rgba(8,13,26,0.92)', border: '1px solid var(--border)', borderRadius: 11, padding: '10px 13px', backdropFilter: 'blur(20px)', transition: 'left 0.3s ease' }}>
                        <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 7 }}>Legend</div>
                        {SERVICE_TABS.map(s => (
                            <div key={s.type} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                                <span style={{ fontSize: 10, color: 'var(--text2)' }}>{s.label}</span>
                            </div>
                        ))}
                        {Object.entries(SEV_COLOR).filter(([k]) => k !== 'default').map(([sev, color]) => (
                            <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                                <span style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'capitalize' }}>{sev}</span>
                            </div>
                        ))}
                    </div>

                    {/* Loading indicator */}
                    {(mapLoading || routeLoading) && (
                        <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 1100, background: 'rgba(8,13,26,0.95)', border: '1px solid rgba(0,212,255,0.35)', borderRadius: 99, padding: '5px 16px', fontSize: 11, fontWeight: 700, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 7 }}>
                            <div style={{ width: 10, height: 10, border: '2px solid var(--cyan)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            {routeLoading ? 'Calculating route…' : 'Refreshing…'}
                        </div>
                    )}

                    {/* Hint bar — only when no location */}
                    {!myLocation && !sidebarOpen && (
                        <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: 'rgba(8,13,26,0.9)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 99, padding: '7px 20px', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                            <Crosshair size={11} style={{ color: '#4285f4' }} />
                            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>Click <strong style={{ color: '#4285f4' }}>Locate Me</strong> to find hospitals, police &amp; fire stations near you</span>
                        </div>
                    )}
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
