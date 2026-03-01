import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    GoogleMap, useJsApiLoader, Marker, InfoWindow,
    DirectionsRenderer, Circle, StandaloneSearchBox,
} from '@react-google-maps/api';
import { useQuery } from '@tanstack/react-query';
import { getHeatmap, listResources } from '../services/api';
import { Layers, AlertTriangle, Truck, Navigation, X, Clock, Route, ChevronRight, Radio, Search, ShieldAlert, ChevronDown, Zap, Crosshair, MapPin, Send, CheckCircle } from 'lucide-react';

import { ALL_INDIA_CITIES } from '../data/indiaCities';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const LIBRARIES = ['places', 'geometry'];
const DEFAULT_CENTER = { lat: 22.9734, lng: 78.6569 }; // India center

const SEV_COLOR = { low: '#00e5a0', medium: '#ffc947', high: '#ff8c42', critical: '#ff4060', default: '#4f8ef0' };
const RES_COLOR = { ambulance: '#4f8ef0', fire_truck: '#ff8c42', police_unit: '#a78bfa', rescue_team: '#00e5a0', hazmat_unit: '#ffc947' };
const RES_EMOJI = { ambulance: '🚑', fire_truck: '🚒', police_unit: '🚓', rescue_team: '🛟', hazmat_unit: '☢️' };

const SERVICE_TYPES = [
    { type: 'hospital', label: 'Hospitals', icon: '🏥', color: '#ff4060', keyword: 'hospital' },
    { type: 'police', label: 'Police Stations', icon: '🚓', color: '#a78bfa', keyword: 'police station' },
    { type: 'fire_station', label: 'Fire Stations', icon: '🚒', color: '#ff8c42', keyword: 'fire station' },
];

// Major cities — now sourced from ALL_INDIA_CITIES (160+ cities, all states)

const DARK_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#0d1426' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#7890b8' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0d1426' }] },
    { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
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

function emergencyMarkerIcon(sev) {
    const color = SEV_COLOR[sev] || SEV_COLOR.default, s = sev === 'critical' ? 26 : 18;
    const glow = sev === 'critical' ? `<circle cx="${s / 2}" cy="${s / 2}" r="${s / 2 - 1}" fill="${color}33"/>` : '';
    return { url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">${glow}<circle cx="${s / 2}" cy="${s / 2}" r="${s / 2 - 3}" fill="${color}" stroke="${color}aa" stroke-width="2"/></svg>`, scaledSize: { width: s, height: s } };
}
function resourceMarkerIcon(type) {
    const color = (RES_COLOR[type] || '#7890b8').replace('#', '%23'), emoji = encodeURIComponent(RES_EMOJI[type] || '🚨');
    return { url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><circle cx="18" cy="18" r="16" fill="%23111a2e" stroke="${color}" stroke-width="2"/><text x="18" y="24" font-size="16" text-anchor="middle">${emoji}</text></svg>`, scaledSize: { width: 36, height: 36 } };
}
function serviceMarkerIcon(icon, color) {
    const c = color.replace('#', '%23');
    return { url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38"><circle cx="19" cy="19" r="17" fill="%230d1426" stroke="${c}" stroke-width="2"/><text x="19" y="26" font-size="17" text-anchor="middle">${encodeURIComponent(icon)}</text></svg>`, scaledSize: { width: 38, height: 38 } };
}
function searchPinIcon() {
    return { url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="56"><path d="M22 2C13.16 2 6 9.16 6 18c0 11.91 16 36 16 36s16-24.09 16-36C38 9.16 30.84 2 22 2z" fill="%2300d4ff" stroke="%23fff" stroke-width="1.5"/><circle cx="22" cy="18" r="7" fill="%23fff" opacity="0.9"/></svg>`, scaledSize: { width: 44, height: 56 }, anchor: { x: 22, y: 56 } };
}
// Pulsing blue GPS dot — exactly like Google Maps
function gpsLocationIcon() {
    return {
        url: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="%234285f422" stroke="none"/><circle cx="24" cy="24" r="14" fill="%234285f430" stroke="none"/><circle cx="24" cy="24" r="8" fill="%234285f4" stroke="%23fff" stroke-width="2.5"/></svg>`,
        scaledSize: { width: 48, height: 48 },
        anchor: { x: 24, y: 24 },
    };
}

// ── My Location Allocation Panel ─────────────────────────────────────
function MyLocationPanel({ myLocation, nearestResource, routeToNearest, dispatching, dispatched, onDispatch, onClear, accuracy }) {
    if (!myLocation) return null;
    const DistRow = ({ icon, label, value, color }) => (
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid var(--border)', padding: '10px 11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: color || 'var(--cyan)', marginBottom: 3 }}>
                {icon}
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text1)', fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
        </div>
    );
    return (
        <div style={{ position: 'absolute', bottom: 90, right: 16, zIndex: 1000, width: 300, background: 'rgba(8,13,26,0.97)', border: '1px solid rgba(66,133,244,0.4)', borderRadius: 16, backdropFilter: 'blur(24px)', boxShadow: '0 0 32px rgba(66,133,244,0.15), 0 8px 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ background: 'rgba(66,133,244,0.08)', borderBottom: '1px solid rgba(66,133,244,0.2)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(66,133,244,0.2)', border: '1px solid rgba(66,133,244,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={14} style={{ color: '#4285f4' }} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text1)' }}>Your Location Detected</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>Accuracy: ±{Math.round(accuracy || 0)}m · GPS Active</div>
                </div>
                <button onClick={onClear} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 7px', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}><X size={12} /></button>
            </div>

            <div style={{ padding: '14px 14px 4px' }}>
                {/* Coords */}
                <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono', marginBottom: 10, textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '5px 0' }}>
                    {myLocation.lat.toFixed(5)}°N, {myLocation.lng.toFixed(5)}°E
                </div>

                {nearestResource ? (
                    <>
                        {/* Route stats */}
                        {routeToNearest && (
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                <DistRow icon={<Clock size={11} />} label="ETA" value={routeToNearest.duration} />
                                <DistRow icon={<Navigation size={11} />} label="Distance" value={routeToNearest.distance} />
                            </div>
                        )}

                        {/* Nearest unit card */}
                        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, border: '1px solid var(--border)', padding: '10px 12px', marginBottom: 10 }}>
                            <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Nearest Available Unit</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <div style={{ fontSize: 24 }}>{RES_EMOJI[nearestResource.resource_type] || '🚨'}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>{nearestResource.name}</div>
                                    <div style={{ fontSize: 10, color: (RES_COLOR[nearestResource.resource_type] || '#7890b8') }}>{(nearestResource.resource_type || '').replace(/_/g, ' ')}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>ID: {nearestResource.vehicle_id || '—'} · Crew: {nearestResource.crew_count ?? '—'}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#00e5a0', fontFamily: 'monospace' }}>{nearestResource.dist ? `${nearestResource.dist.toFixed(1)} km` : '—'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Dispatch button */}
                        {dispatched ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', borderRadius: 10, background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)', marginBottom: 10 }}>
                                <CheckCircle size={14} style={{ color: 'var(--green)' }} />
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>Unit Dispatched!</span>
                            </div>
                        ) : (
                            <button onClick={onDispatch} disabled={dispatching} style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: dispatching ? 'rgba(66,133,244,0.3)' : 'linear-gradient(135deg, #4285f4, #1a6fe8)', color: '#fff', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10, boxShadow: dispatching ? 'none' : '0 4px 16px rgba(66,133,244,0.35)' }}>
                                {dispatching ? <><div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Dispatching…</> : <><Send size={13} /> Dispatch This Unit to My Location</>}
                            </button>
                        )}
                    </>
                ) : (
                    <div style={{ padding: '10px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 12, marginBottom: 10 }}>No available resources found nearby.</div>
                )}
            </div>
        </div>
    );
}

// ── Services Panel ─────────────────────────────────────────────────────
function ServicesPanel({ searchedLocation, myLocation, services, loading, allIndiaMode, onServiceClick, onClear, activeRoute }) {
    const [collapsed, setCollapsed] = useState(false);
    const isGpsMode = !searchedLocation && !allIndiaMode && myLocation;
    if (!searchedLocation && !allIndiaMode && !myLocation) return null;

    const totalCount = services.length;
    const title = allIndiaMode ? '🇮🇳 All India Emergency Services'
        : isGpsMode ? '📍 Nearby Emergency Services'
            : 'Nearby Emergency Services';
    const subtitle = allIndiaMode
        ? `${totalCount} services · ${ALL_INDIA_CITIES.length} cities · all states`
        : isGpsMode
            ? `Services near your GPS location · ${totalCount} found`
            : searchedLocation?.name || '';

    return (
        <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 1000, width: 320, background: 'rgba(8,13,26,0.97)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: 16, backdropFilter: 'blur(24px)', boxShadow: '0 8px 40px rgba(0,0,0,0.5)', overflow: 'hidden', maxHeight: collapsed ? 58 : 'calc(100vh - 140px)', transition: 'max-height 0.35s ease' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', borderBottom: collapsed ? 'none' : '1px solid var(--border)', background: 'rgba(0,212,255,0.04)', cursor: 'pointer' }} onClick={() => setCollapsed(c => !c)}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ShieldAlert size={14} style={{ color: 'var(--cyan)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subtitle}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {loading && <div style={{ width: 14, height: 14, border: '2px solid var(--cyan)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
                    <button onClick={e => { e.stopPropagation(); onClear(); }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 6px', cursor: 'pointer', color: 'var(--text3)', display: 'flex' }}><X size={11} /></button>
                    <ChevronDown size={13} style={{ color: 'var(--text3)', transform: collapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
            </div>

            {!collapsed && (
                <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
                    {loading ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
                            {allIndiaMode ? `Scanning all ${INDIA_CITIES.length} Indian cities…` : 'Scanning nearby emergency services…'}
                        </div>
                    ) : services.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>No services found.</div>
                    ) : (
                        <>
                            {activeRoute && (
                                <div style={{ margin: '10px 12px 0', background: 'rgba(0,212,255,0.07)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Route size={12} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--cyan)' }}>Route Active</div>
                                        <div style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeRoute.name}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--cyan)', fontFamily: 'monospace' }}>{activeRoute.duration}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{activeRoute.distance}</div>
                                    </div>
                                </div>
                            )}
                            {SERVICE_TYPES.map(svc => {
                                const group = services.filter(s => s.serviceType === svc.type);
                                if (!group.length) return null;
                                return (
                                    <div key={svc.type}>
                                        <div style={{ padding: '10px 16px 5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ fontSize: 13 }}>{svc.icon}</span>
                                            <span style={{ fontSize: 10, fontWeight: 800, color: svc.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{svc.label} ({group.length})</span>
                                        </div>
                                        {group.map((s, i) => (
                                            <div key={s.place_id || i} onClick={() => onServiceClick(s)} style={{ margin: '0 12px 6px', padding: '9px 11px', borderRadius: 10, background: activeRoute?.placeId === s.place_id ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${activeRoute?.placeId === s.place_id ? 'rgba(0,212,255,0.35)' : 'var(--border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, transition: 'all 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                                                onMouseLeave={e => e.currentTarget.style.background = activeRoute?.placeId === s.place_id ? 'rgba(0,212,255,0.08)' : 'rgba(255,255,255,0.03)'}
                                            >
                                                <div style={{ width: 36, height: 36, borderRadius: 9, background: svc.color + '15', border: `1px solid ${svc.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{svc.icon}</div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</div>
                                                    <div style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.city ? `📍 ${s.city}${s.state ? `, ${s.state}` : ''} · ` : ''}{s.vicinity}</div>
                                                    {s.rating && <div style={{ fontSize: 10, color: '#ffc947' }}>{'★'.repeat(Math.round(s.rating))}{'☆'.repeat(5 - Math.round(s.rating))} {s.rating}</div>}
                                                </div>
                                                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                                                    {s.responseTime ? (
                                                        <>
                                                            <div style={{ fontSize: 14, fontWeight: 800, color: s.responseTime.minutes <= 5 ? '#00e5a0' : s.responseTime.minutes <= 15 ? '#ffc947' : s.responseTime.minutes <= 30 ? '#ff8c42' : '#ff4060', fontFamily: 'monospace' }}>{s.responseTime.minutes} min</div>
                                                            <div style={{ fontSize: 10, color: 'var(--text3)' }}>{s.responseTime.distance}</div>
                                                        </>
                                                    ) : <div style={{ fontSize: 10, color: 'var(--text3)' }}>—</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                            <div style={{ height: 10 }} />
                        </>
                    )}
                </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────
export default function MapPage() {
    const [timeWindow, setTimeWindow] = useState(24);
    const [filterType, setFilterType] = useState('');
    const [showRes, setShowRes] = useState(true);
    const [showEm, setShowEm] = useState(true);
    const [selectedEmergency, setSelectedEmergency] = useState(null);
    const [selectedResource, setSelectedResource] = useState(null);
    const [directions, setDirections] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [searchedLocation, setSearchedLocation] = useState(null);
    const [nearbyServices, setNearbyServices] = useState([]);
    const [servicesLoading, setServicesLoading] = useState(false);
    const [activeRoute, setActiveRoute] = useState(null);
    const [selectedService, setSelectedService] = useState(null);
    const [allIndiaMode, setAllIndiaMode] = useState(false);
    // GPS state
    const [myLocation, setMyLocation] = useState(null);       // { lat, lng }
    const [myLocationAccuracy, setMyLocationAccuracy] = useState(0);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [nearestResource, setNearestResource] = useState(null);
    const [routeToNearest, setRouteToNearest] = useState(null); // { duration, distance }
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

    const emergencies = heatmap?.points || [];
    const resources = resData?.items || [];
    const availableResources = resources.filter(r => r.status === 'available');

    // onMapLoad defined after fetchNearbyServices (see below) to avoid TDZ


    // ── Calc response time for a single service ─────────────────────
    const calcResponseTime = useCallback((svc, destLat, destLng) => {
        if (!window.google) return;
        const dirSvc = new window.google.maps.DirectionsService();
        dirSvc.route({
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

    // ── Fetch nearby services for a single location ─────────────────
    const fetchNearbyServices = useCallback((lat, lng, cityName = null) => {
        if (!window.google || !mapRef.current) return;
        const placeSvc = new window.google.maps.places.PlacesService(mapRef.current);
        SERVICE_TYPES.forEach(({ type, keyword }) => {
            placeSvc.nearbySearch({ location: { lat, lng }, radius: 50000, type: type === 'fire_station' ? 'establishment' : type, keyword }, (results, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                    const tagged = results.slice(0, 3).map(r => ({
                        ...r, serviceType: type,
                        lat: r.geometry.location.lat(), lng: r.geometry.location.lng(),
                        responseTime: null, city: cityName,
                    }));
                    setNearbyServices(prev => {
                        const existingIds = new Set(prev.map(x => x.place_id));
                        const newOnes = tagged.filter(t => !existingIds.has(t.place_id));
                        // Calc response times if we have a reference point
                        if (lat && lng) newOnes.forEach(s => calcResponseTime(s, lat, lng));
                        return [...prev, ...newOnes];
                    });
                }
            });
        });
    }, [calcResponseTime]);

    // ── On map load: store ref, then auto-locate user ──────────────────
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
                    map.setZoom(13);
                    // Auto-fetch all nearby hospitals / police / fire
                    setNearbyServices([]);
                    setAllIndiaMode(false);
                    setServicesLoading(true);
                    setTimeout(() => {
                        fetchNearbyServices(lat, lng, 'Your Location');
                        setServicesLoading(false);
                    }, 600);
                },
                () => setGpsLoading(false),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }, 1500);
    }, [fetchNearbyServices]);

    // ── All India mode — sequential queue, prevents state flooding ────
    const fetchAllIndiaServices = useCallback(() => {
        if (!window.google || !mapRef.current) return;
        setServicesLoading(true);
        setNearbyServices([]);
        setActiveRoute(null);
        setDirections(null);
        setSearchedLocation(null);

        mapRef.current.setCenter({ lat: 22.9734, lng: 78.6569 });
        mapRef.current.setZoom(5);

        let idx = 0;
        const processNext = () => {
            if (idx >= ALL_INDIA_CITIES.length || !mapRef.current) {
                setServicesLoading(false);
                return;
            }
            const city = ALL_INDIA_CITIES[idx++];
            const placeSvc = new window.google.maps.places.PlacesService(mapRef.current);
            let pending = SERVICE_TYPES.length;
            const collected = [];
            SERVICE_TYPES.forEach(({ type, keyword }) => {
                placeSvc.nearbySearch(
                    { location: { lat: city.lat, lng: city.lng }, radius: 50000, type: type === 'fire_station' ? 'establishment' : type, keyword },
                    (results, status) => {
                        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                            results.slice(0, 2).forEach(r => collected.push({
                                ...r, serviceType: type,
                                lat: r.geometry.location.lat(), lng: r.geometry.location.lng(),
                                responseTime: null, city: city.name, state: city.state,
                            }));
                        }
                        if (--pending === 0) {
                            setNearbyServices(prev => {
                                const existingIds = new Set(prev.map(x => x.place_id));
                                return [...prev, ...collected.filter(t => !existingIds.has(t.place_id))];
                            });
                            setTimeout(processNext, 350);
                        }
                    }
                );
            });
        };
        processNext();
    }, []);

    const toggleAllIndia = () => {
        if (allIndiaMode) {
            setAllIndiaMode(false);
            setNearbyServices([]);
            setServicesLoading(false);
        } else {
            setAllIndiaMode(true);
            fetchAllIndiaServices();
        }
    };

    // ── Search place ────────────────────────────────────────────────
    const onPlacesChanged = useCallback(() => {
        const places = searchBoxRef.current?.getPlaces();
        if (!places?.length) return;
        const place = places[0];
        const lat = place.geometry.location.lat(), lng = place.geometry.location.lng();
        setSearchedLocation({ lat, lng, name: place.formatted_address || place.name });
        setAllIndiaMode(false);
        setNearbyServices([]);
        setDirections(null);
        setActiveRoute(null);
        setSelectedService(null);
        setServicesLoading(true);
        mapRef.current?.panTo({ lat, lng });
        mapRef.current?.setZoom(12);
        setTimeout(() => {
            fetchNearbyServices(lat, lng);
            setServicesLoading(false);
        }, 500);
    }, [fetchNearbyServices]);

    // ── Click service → show route ──────────────────────────────────
    const handleServiceClick = useCallback((svc) => {
        if (!window.google) return;
        setSelectedService(svc);
        // Use GPS location if available, else searched location
        const dest = myLocation || searchedLocation;
        if (!dest) return;
        const dirSvc = new window.google.maps.DirectionsService();
        dirSvc.route(
            { origin: new window.google.maps.LatLng(svc.lat, svc.lng), destination: new window.google.maps.LatLng(dest.lat, dest.lng), travelMode: window.google.maps.TravelMode.DRIVING, drivingOptions: { departureTime: new Date(), trafficModel: 'bestguess' } },
            (result, status) => {
                if (status === 'OK') {
                    setDirections(result);
                    const leg = result.routes[0]?.legs[0];
                    setActiveRoute({ placeId: svc.place_id, name: svc.name, duration: leg.duration_in_traffic?.text || leg.duration.text, distance: leg.distance.text });
                    const bounds = new window.google.maps.LatLngBounds();
                    result.routes[0].overview_path.forEach(p => bounds.extend(p));
                    mapRef.current?.fitBounds(bounds, { top: 60, right: 340, bottom: 60, left: 60 });
                }
            }
        );
    }, [searchedLocation, myLocation]);

    // ── Route nearest unit to an emergency ─────────────────────────
    const calcRoute = useCallback((emergency) => {
        if (!window.google || !availableResources.length) return;
        const nearest = availableResources.reduce((best, r) => { const d = haversine(emergency.lat, emergency.lon, r.latitude, r.longitude); return !best || d < best.dist ? { ...r, dist: d } : best; }, null);
        if (!nearest) return;
        setRouteLoading(true);
        new window.google.maps.DirectionsService().route({ origin: new window.google.maps.LatLng(nearest.latitude, nearest.longitude), destination: new window.google.maps.LatLng(emergency.lat, emergency.lon), travelMode: window.google.maps.TravelMode.DRIVING, drivingOptions: { departureTime: new Date(), trafficModel: 'bestguess' } }, (result, status) => {
            setRouteLoading(false);
            if (status === 'OK') { setDirections(result); const bounds = new window.google.maps.LatLngBounds(); result.routes[0].overview_path.forEach(p => bounds.extend(p)); mapRef.current?.fitBounds(bounds, { top: 60, right: 340, bottom: 60, left: 60 }); }
        });
    }, [availableResources]);

    const clearAll = () => { setDirections(null); setSearchedLocation(null); setNearbyServices([]); setActiveRoute(null); setSelectedService(null); setAllIndiaMode(false); setServicesLoading(false); };

    // ── GPS / My Location ─────────────────────────────────────────────
    const clearMyLocation = () => {
        if (watchIdRef.current) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
        setMyLocation(null); setNearestResource(null); setRouteToNearest(null); setDispatched(false); setGpsLoading(false);
    };

    const locateMe = useCallback(() => {
        if (!navigator.geolocation) { alert('Geolocation is not supported by your browser.'); return; }
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
                mapRef.current?.setZoom(13);

                // Auto-fetch ALL nearby emergency services (hospitals, police, fire)
                setNearbyServices([]);
                setAllIndiaMode(false);
                setServicesLoading(true);
                setTimeout(() => {
                    fetchNearbyServices(lat, lng, 'Your Location');
                    setServicesLoading(false);
                }, 500);

                // Find nearest AEIRAS resource
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
                            drivingOptions: { departureTime: new Date(), trafficModel: 'bestguess' },
                        }, (result, status) => {
                            if (status === 'OK') {
                                const leg = result.routes[0]?.legs[0];
                                setRouteToNearest({ duration: leg.duration_in_traffic?.text || leg.duration.text, distance: leg.distance.text });
                            }
                        });
                    }
                }
            },
            (err) => { console.error('GPS error:', err); setGpsLoading(false); alert('Could not get your location. Please allow location access.'); },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
    }, [availableResources, fetchNearbyServices]);

    const handleDispatch = useCallback(() => {
        if (!nearestResource) return;
        setDispatching(true);
        // Simulate dispatch API call (would hit backend in production)
        setTimeout(() => { setDispatching(false); setDispatched(true); }, 1500);
    }, [nearestResource]);

    // Clean up watch on unmount
    useEffect(() => () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); }, []);

    if (loadError) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--red)' }}>Google Maps failed to load. Check API key.</div>;
    if (!isLoaded) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', color: 'var(--cyan)', fontSize: 13 }}>Loading Google Maps…</div>;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
            {/* Toolbar */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', height: 54, background: 'rgba(8,13,26,0.92)', borderBottom: '1px solid var(--border)', backdropFilter: 'blur(16px)' }}>
                <Layers size={15} style={{ color: 'var(--cyan)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>Live Map</span>

                {/* Search */}
                <StandaloneSearchBox onLoad={ref => { searchBoxRef.current = ref; }} onPlacesChanged={onPlacesChanged}>
                    <div style={{ position: 'relative' }}>
                        <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--cyan)', pointerEvents: 'none' }} />
                        <input type="text" placeholder="Search any location in India…" style={{ width: 230, padding: '6px 10px 6px 28px', borderRadius: 8, border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.06)', color: 'var(--text1)', fontSize: 11, outline: 'none', fontFamily: 'Inter, sans-serif' }} />
                    </div>
                </StandaloneSearchBox>

                {/* All India button */}
                <button onClick={toggleAllIndia} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', border: `1px solid ${allIndiaMode ? 'rgba(255,196,71,0.6)' : 'var(--border)'}`, background: allIndiaMode ? 'rgba(255,196,71,0.15)' : 'rgba(255,255,255,0.04)', color: allIndiaMode ? '#ffc947' : 'var(--text3)', transition: 'all 0.15s', flexShrink: 0 }}>
                    🇮🇳 All India
                    {servicesLoading && allIndiaMode && <div style={{ width: 10, height: 10, border: '2px solid #ffc947', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                </button>

                {/* Locate Me button */}
                <button onClick={myLocation ? clearMyLocation : locateMe} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', border: `1px solid ${myLocation ? 'rgba(66,133,244,0.6)' : 'var(--border)'}`, background: myLocation ? 'rgba(66,133,244,0.15)' : 'rgba(255,255,255,0.04)', color: myLocation ? '#4285f4' : 'var(--text3)', transition: 'all 0.15s', flexShrink: 0 }}>
                    {gpsLoading
                        ? <><div style={{ width: 11, height: 11, border: '2px solid #4285f4', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Locating…</>
                        : myLocation ? <><Crosshair size={12} /> My Location</> : <><Crosshair size={12} /> Locate Me</>}
                </button>

                {/* Time filters */}
                <div style={{ display: 'flex', gap: 4 }}>
                    {[6, 24, 72].map(h => (
                        <button key={h} onClick={() => setTimeWindow(h)} style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: `1px solid ${timeWindow === h ? 'rgba(0,212,255,0.5)' : 'var(--border)'}`, background: timeWindow === h ? 'rgba(0,212,255,0.12)' : 'transparent', color: timeWindow === h ? 'var(--cyan)' : 'var(--text3)', transition: 'all 0.15s' }}>{h}h</button>
                    ))}
                </div>

                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="form-input" style={{ width: 110, padding: '4px 8px', fontSize: 11 }}>
                    <option value="">All Types</option>
                    {['medical', 'fire', 'accident', 'flood', 'crime'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
                    {[{ label: 'Emergencies', Icon: AlertTriangle, color: 'var(--red)', checked: showEm, set: setShowEm }, { label: 'Resources', Icon: Truck, color: 'var(--cyan)', checked: showRes, set: setShowRes }].map(({ label, Icon, color, checked, set }) => (
                        <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: checked ? 'var(--text1)' : 'var(--text3)', userSelect: 'none' }}>
                            <div style={{ width: 14, height: 14, borderRadius: 4, border: `2px solid ${checked ? color : 'var(--border)'}`, background: checked ? color + '22' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                {checked && <div style={{ width: 6, height: 6, borderRadius: 2, background: color }} />}
                            </div>
                            <input type="checkbox" checked={checked} onChange={e => set(e.target.checked)} style={{ display: 'none' }} />
                            <Icon size={10} style={{ color }} />{label}
                        </label>
                    ))}
                    <span style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'JetBrains Mono', paddingLeft: 8, borderLeft: '1px solid var(--border)' }}>
                        {emergencies.length} incidents · {resources.length} resources
                        {nearbyServices.length > 0 && ` · ${nearbyServices.length} services`}
                    </span>
                </div>
            </div>

            {/* Map */}
            <div style={{ flex: 1, position: 'relative' }}>
                <GoogleMap mapContainerStyle={{ height: '100%', width: '100%' }} center={DEFAULT_CENTER} zoom={5} options={MAP_OPTIONS} onLoad={onMapLoad}>
                    {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true, polylineOptions: { strokeColor: myLocation ? '#4285f4' : '#00d4ff', strokeOpacity: 0.9, strokeWeight: 4 } }} />}

                    {searchedLocation && <Marker position={{ lat: searchedLocation.lat, lng: searchedLocation.lng }} icon={searchPinIcon()} zIndex={200} />}

                    {/* GPS Blue Dot */}
                    {myLocation && (
                        <Marker
                            position={{ lat: myLocation.lat, lng: myLocation.lng }}
                            icon={gpsLocationIcon()}
                            zIndex={300}
                            title="Your Location"
                        />
                    )}

                    {nearbyServices.map((svc, i) => {
                        const cfg = SERVICE_TYPES.find(s => s.type === svc.serviceType);
                        return <Marker key={svc.place_id || i} position={{ lat: svc.lat, lng: svc.lng }} icon={serviceMarkerIcon(cfg.icon, cfg.color)} zIndex={100} onClick={() => { setSelectedService(svc); handleServiceClick(svc); }} />;
                    })}

                    {selectedService && (
                        <InfoWindow position={{ lat: selectedService.lat, lng: selectedService.lng }} onCloseClick={() => setSelectedService(null)}>
                            <div style={{ background: '#0b1221', color: '#f0f4ff', padding: '12px 14px', borderRadius: 10, minWidth: 190, fontFamily: 'Inter, sans-serif' }}>
                                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 5 }}>
                                    {SERVICE_TYPES.find(s => s.type === selectedService.serviceType)?.icon} {selectedService.name}
                                </div>
                                {selectedService.city && <div style={{ fontSize: 10, color: '#ffc947', marginBottom: 4 }}>📍 {selectedService.city}</div>}
                                <div style={{ fontSize: 10, color: '#7890b8', marginBottom: 6 }}>{selectedService.vicinity}</div>
                                {selectedService.responseTime && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '6px 8px' }}>
                                        <span style={{ fontSize: 10, color: '#7890b8' }}>Response Time</span>
                                        <span style={{ fontWeight: 800, fontSize: 14, color: selectedService.responseTime.minutes <= 15 ? '#00e5a0' : '#ffc947', fontFamily: 'monospace' }}>{selectedService.responseTime.minutes} min · {selectedService.responseTime.distance}</span>
                                    </div>
                                )}
                            </div>
                        </InfoWindow>
                    )}

                    {showEm && emergencies.map(em => (
                        <React.Fragment key={em.id}>
                            <Circle center={{ lat: em.lat, lng: em.lon }} radius={em.intensity * 900} options={{ strokeColor: SEV_COLOR[em.severity] || SEV_COLOR.default, strokeOpacity: 0.35, strokeWeight: 1, fillColor: SEV_COLOR[em.severity] || SEV_COLOR.default, fillOpacity: 0.1 }} />
                            <Marker position={{ lat: em.lat, lng: em.lon }} icon={emergencyMarkerIcon(em.severity)} onClick={() => { setSelectedEmergency(em); setSelectedResource(null); }} />
                        </React.Fragment>
                    ))}

                    {showRes && resources.map(r => (
                        <Marker key={`r-${r.id}`} position={{ lat: r.latitude, lng: r.longitude }} icon={resourceMarkerIcon(r.resource_type)} opacity={r.status === 'busy' ? 0.45 : 1} onClick={() => { setSelectedResource(r); setSelectedEmergency(null); }} />
                    ))}

                    {selectedEmergency && (
                        <InfoWindow position={{ lat: selectedEmergency.lat, lng: selectedEmergency.lon }} onCloseClick={() => setSelectedEmergency(null)}>
                            <div style={{ background: '#0b1221', color: '#f0f4ff', padding: '13px 15px', borderRadius: 10, minWidth: 200, fontFamily: 'Inter, sans-serif' }}>
                                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>Emergency #{selectedEmergency.id}</div>
                                {[['Type', selectedEmergency.type || '—'], ['Severity', (selectedEmergency.severity || '?').toUpperCase()], ['People', selectedEmergency.people_affected ?? '—'], ['Status', selectedEmergency.status || '—']].map(([l, v]) => (
                                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                                        <span style={{ color: '#7890b8', fontSize: 10 }}>{l}</span>
                                        <span style={{ color: l === 'Severity' ? SEV_COLOR[selectedEmergency.severity] || '#f0f4ff' : '#f0f4ff', fontWeight: 700, fontSize: 10, fontFamily: 'monospace' }}>{v}</span>
                                    </div>
                                ))}
                                <button onClick={() => { calcRoute(selectedEmergency); setSelectedEmergency(null); }} disabled={routeLoading || !availableResources.length} style={{ marginTop: 10, width: '100%', padding: '7px 0', borderRadius: 7, background: 'rgba(0,212,255,0.18)', border: '1px solid rgba(0,212,255,0.4)', color: '#00d4ff', fontWeight: 700, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: availableResources.length ? 1 : 0.4 }}>
                                    <Navigation size={12} />{availableResources.length ? 'Route Nearest Unit' : 'No units available'}
                                </button>
                            </div>
                        </InfoWindow>
                    )}

                    {selectedResource && (
                        <InfoWindow position={{ lat: selectedResource.latitude, lng: selectedResource.longitude }} onCloseClick={() => setSelectedResource(null)}>
                            <div style={{ background: '#0b1221', color: '#f0f4ff', padding: '13px 15px', borderRadius: 10, minWidth: 190, fontFamily: 'Inter, sans-serif' }}>
                                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>{RES_EMOJI[selectedResource.resource_type] || '🚨'} {selectedResource.name}</div>
                                {[['Type', (selectedResource.resource_type || '').replace(/_/g, ' ')], ['Status', selectedResource.status || '—'], ['Vehicle', selectedResource.vehicle_id || '—'], ['Crew', selectedResource.crew_count ?? '—']].map(([l, v]) => (
                                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                                        <span style={{ color: '#7890b8', fontSize: 10 }}>{l}</span>
                                        <span style={{ color: l === 'Status' ? (selectedResource.status === 'available' ? '#00e5a0' : selectedResource.status === 'busy' ? '#ff8c42' : '#ffc947') : '#f0f4ff', fontWeight: 700, fontSize: 10, fontFamily: 'monospace' }}>{v}</span>
                                    </div>
                                ))}
                            </div>
                        </InfoWindow>
                    )}
                </GoogleMap>

                <ServicesPanel searchedLocation={searchedLocation} myLocation={myLocation} services={nearbyServices} loading={servicesLoading} allIndiaMode={allIndiaMode} onServiceClick={handleServiceClick} onClear={clearAll} activeRoute={activeRoute} />

                {/* My Location Allocation Panel */}
                <MyLocationPanel
                    myLocation={myLocation}
                    nearestResource={nearestResource}
                    routeToNearest={routeToNearest}
                    dispatching={dispatching}
                    dispatched={dispatched}
                    onDispatch={handleDispatch}
                    onClear={clearMyLocation}
                    accuracy={myLocationAccuracy}
                />

                {/* Legend */}
                <div style={{ position: 'absolute', bottom: 20, left: 16, zIndex: 1000, background: 'rgba(8,13,26,0.92)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', backdropFilter: 'blur(20px)', minWidth: 160 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Legend</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 5 }}>Severity</div>
                    {Object.entries(SEV_COLOR).filter(([k]) => k !== 'default').map(([sev, color]) => (
                        <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}`, flexShrink: 0 }} />
                            <span style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'capitalize' }}>{sev}</span>
                        </div>
                    ))}
                    <div style={{ height: 1, background: 'var(--border)', margin: '7px 0' }} />
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 5 }}>Services</div>
                    {SERVICE_TYPES.map(s => (
                        <div key={s.type} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                            <span style={{ fontSize: 12 }}>{s.icon}</span>
                            <span style={{ fontSize: 10, color: 'var(--text2)' }}>{s.label}</span>
                        </div>
                    ))}
                    <div style={{ height: 1, background: 'var(--border)', margin: '7px 0' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 20, height: 3, background: '#00d4ff', borderRadius: 2 }} />
                        <span style={{ fontSize: 10, color: 'var(--text2)' }}>Route</span>
                    </div>
                </div>

                {/* Bottom hint */}
                {!searchedLocation && !allIndiaMode && !myLocation && (
                    <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(8,13,26,0.88)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 99, padding: '6px 18px', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                        <Search size={10} style={{ color: 'var(--cyan)' }} />
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>Search a location · 🇮🇳 All India · or <Crosshair size={10} style={{ display: 'inline', color: '#4285f4', verticalAlign: 'middle' }} /> Locate Me for GPS</span>
                    </div>
                )}

                {(mapLoading || routeLoading) && (
                    <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 1100, background: 'rgba(8,13,26,0.95)', border: '1px solid rgba(0,212,255,0.35)', borderRadius: 99, padding: '5px 16px', fontSize: 11, fontWeight: 700, color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 11, height: 11, border: '2px solid var(--cyan)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        {routeLoading ? 'Calculating route…' : 'Refreshing data…'}
                    </div>
                )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes em-pulse { 0%,100%{transform:scale(1);opacity:1;} 50%{transform:scale(1.35);opacity:0.6;} }`}</style>
        </div>
    );
}
