import React, { useRef, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFloodHeatmap, listResources, listShelters, getSimulationRoadBlocks } from '../services/api';
import { Waves, Droplets, Home, Truck, AlertTriangle, Layers } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const CHENNAI_CENTER = [13.0478, 80.2129];
const SEVERITY_COLORS = { low: '#38bdf8', moderate: '#ffc947', severe: '#ff6b35', catastrophic: '#ff2d55' };
const RESOURCE_ICONS = {
    rescue_boat: '🚤', motorized_raft: '🛶', ambulance: '🚑',
    relief_truck: '🚛', pump_unit: '⛽', rescue_team: '🧑‍🚒',
};

export default function MapPage() {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);
    const layersRef = useRef({});
    const [activeLayers, setActiveLayers] = useState({
        heatmap: true, resources: true, shelters: true, roadBlocks: false,
    });

    const { data: heatmap } = useQuery({ queryKey: ['floodHeatmap'], queryFn: () => getFloodHeatmap({}).then(r => r.data), refetchInterval: 30000 });
    const { data: resources } = useQuery({ queryKey: ['resources'], queryFn: () => listResources({}).then(r => r.data), refetchInterval: 15000 });
    const { data: shelters } = useQuery({ queryKey: ['shelters'], queryFn: () => listShelters().then(r => r.data) });
    const { data: roadBlocks } = useQuery({ queryKey: ['roadBlocks'], queryFn: () => getSimulationRoadBlocks().then(r => r.data?.road_blocks || []), enabled: activeLayers.roadBlocks });

    // Initialize map
    useEffect(() => {
        if (mapInstance.current || !mapRef.current) return;
        const map = L.map(mapRef.current, { center: CHENNAI_CENTER, zoom: 12, zoomControl: true });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
        }).addTo(map);
        mapInstance.current = map;
        return () => { map.remove(); mapInstance.current = null; };
    }, []);

    // Flood heatmap layer
    useEffect(() => {
        if (!mapInstance.current || !heatmap) return;
        if (layersRef.current.heatmap) { mapInstance.current.removeLayer(layersRef.current.heatmap); }
        if (!activeLayers.heatmap) return;

        const group = L.layerGroup();
        heatmap.forEach(zone => {
            const wl = zone.water_level_m || 0;
            if (wl < 0.1) return;
            const color = SEVERITY_COLORS[zone.severity] || '#38bdf8';
            const radius = Math.max(600, Math.min(2000, wl * 800));
            const opacity = Math.min(0.6, wl * 0.2);

            L.circle([zone.lat, zone.lon], {
                radius, color, fillColor: color,
                fillOpacity: opacity, weight: 1, opacity: 0.5,
            }).bindPopup(`
                <div style="font-family:system-ui;min-width:180px">
                    <b style="font-size:14px">${zone.zone_name}</b>
                    <hr style="margin:6px 0;border-color:rgba(255,255,255,0.15)"/>
                    <div>💧 Water Level: <b>${wl.toFixed(2)}m</b></div>
                    <div>⚠️ Severity: <b style="color:${color}">${zone.severity}</b></div>
                    <div>📊 Risk Score: <b>${(zone.flood_risk_score * 100).toFixed(0)}%</b></div>
                    <div>👥 Population: <b>${(zone.population || 0).toLocaleString()}</b></div>
                    <div>📏 Elevation: <b>${zone.elevation_m}m</b></div>
                </div>
            `).addTo(group);

            // Zone label
            L.marker([zone.lat, zone.lon], {
                icon: L.divIcon({
                    className: 'flood-label',
                    html: `<div style="background:${color}cc;color:#fff;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;white-space:nowrap;text-align:center">${zone.zone_name}<br/>${wl.toFixed(1)}m</div>`,
                    iconSize: [0, 0],
                }),
            }).addTo(group);
        });
        group.addTo(mapInstance.current);
        layersRef.current.heatmap = group;
    }, [heatmap, activeLayers.heatmap]);

    // Resource markers
    useEffect(() => {
        if (!mapInstance.current || !resources) return;
        if (layersRef.current.resources) { mapInstance.current.removeLayer(layersRef.current.resources); }
        if (!activeLayers.resources) return;

        const group = L.layerGroup();
        resources.forEach(r => {
            const emoji = RESOURCE_ICONS[r.resource_type] || '📍';
            const statusColor = r.status === 'available' ? '#00e5a0' : r.status === 'busy' ? '#ff4060' : '#888';

            L.marker([r.latitude, r.longitude], {
                icon: L.divIcon({
                    className: 'resource-marker',
                    html: `<div style="font-size:18px;text-shadow:0 0 8px ${statusColor};filter:drop-shadow(0 0 4px ${statusColor})">${emoji}</div>`,
                    iconSize: [24, 24], iconAnchor: [12, 12],
                }),
            }).bindPopup(`
                <div style="font-family:system-ui;min-width:160px">
                    <b>${r.name}</b>
                    <hr style="margin:6px 0;border-color:rgba(255,255,255,0.15)"/>
                    <div>Type: ${r.resource_type.replace(/_/g, ' ')}</div>
                    <div>Status: <span style="color:${statusColor};font-weight:700">${r.status}</span></div>
                    <div>Water capable: ${r.can_operate_in_water ? '✅' : '❌'}</div>
                    <div>Max depth: ${r.max_water_depth_m}m</div>
                    ${r.base_station ? `<div>Base: ${r.base_station}</div>` : ''}
                </div>
            `).addTo(group);
        });
        group.addTo(mapInstance.current);
        layersRef.current.resources = group;
    }, [resources, activeLayers.resources]);

    // Shelter markers
    useEffect(() => {
        if (!mapInstance.current || !shelters) return;
        if (layersRef.current.shelters) { mapInstance.current.removeLayer(layersRef.current.shelters); }
        if (!activeLayers.shelters) return;

        const group = L.layerGroup();
        shelters.forEach(s => {
            const pct = s.total_capacity > 0 ? Math.round(s.current_occupancy / s.total_capacity * 100) : 0;
            const color = pct > 80 ? '#ff4060' : pct > 50 ? '#ffc947' : '#00e5a0';

            L.marker([s.latitude, s.longitude], {
                icon: L.divIcon({
                    className: 'shelter-marker',
                    html: `<div style="background:${color}20;border:2px solid ${color};border-radius:8px;padding:3px 6px;font-size:11px;font-weight:700;color:${color};text-align:center">🏠 ${pct}%</div>`,
                    iconSize: [0, 0],
                }),
            }).bindPopup(`
                <div style="font-family:system-ui;min-width:180px">
                    <b>🏠 ${s.name}</b>
                    <hr style="margin:6px 0;border-color:rgba(255,255,255,0.15)"/>
                    <div>Capacity: ${s.current_occupancy} / ${s.total_capacity}</div>
                    <div>Occupancy: <span style="color:${color};font-weight:700">${pct}%</span></div>
                    <div>Elevation: ${s.elevation_m}m</div>
                    <div>${s.has_medical_facility ? '🏥 Medical' : ''} ${s.has_food_supply ? '🍚 Food' : ''} ${s.has_power_backup ? '⚡ Power' : ''}</div>
                </div>
            `).addTo(group);
        });
        group.addTo(mapInstance.current);
        layersRef.current.shelters = group;
    }, [shelters, activeLayers.shelters]);

    // Road blocks
    useEffect(() => {
        if (!mapInstance.current) return;
        if (layersRef.current.roadBlocks) { mapInstance.current.removeLayer(layersRef.current.roadBlocks); }
        if (!activeLayers.roadBlocks || !roadBlocks?.length) return;

        const group = L.layerGroup();
        roadBlocks.forEach(rb => {
            L.circleMarker([rb.lat, rb.lon], {
                radius: 6, color: '#ff2d55', fillColor: '#ff2d55',
                fillOpacity: 0.7, weight: 2,
            }).bindPopup(`
                <div style="font-family:system-ui">
                    <b>🚧 Road Blocked</b>
                    <div>Water depth: ${rb.water_depth_m}m</div>
                    <div>Passable: ${rb.is_passable ? 'Yes (limited)' : 'No'}</div>
                </div>
            `).addTo(group);
        });
        group.addTo(mapInstance.current);
        layersRef.current.roadBlocks = group;
    }, [roadBlocks, activeLayers.roadBlocks]);

    const toggleLayer = (key) => setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <div style={{ height: '100%', position: 'relative' }}>
            <div ref={mapRef} style={{ height: '100%', width: '100%' }} />

            {/* Layer Controls */}
            <div style={{
                position: 'absolute', top: 16, right: 16, zIndex: 1000,
                background: 'rgba(8,13,26,0.9)', borderRadius: 12, padding: '12px 14px',
                border: '1px solid var(--border)', backdropFilter: 'blur(16px)',
                minWidth: 180,
            }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <Layers size={11} style={{ marginRight: 4 }} /> Map Layers
                </div>
                {[
                    { key: 'heatmap', label: 'Flood Heatmap', icon: Droplets, color: '#38bdf8' },
                    { key: 'resources', label: 'Rescue Resources', icon: Truck, color: '#00e5a0' },
                    { key: 'shelters', label: 'Shelters', icon: Home, color: '#a78bfa' },
                    { key: 'roadBlocks', label: 'Blocked Roads', icon: AlertTriangle, color: '#ff4060' },
                ].map(({ key, label, icon: Icon, color }) => (
                    <button key={key} onClick={() => toggleLayer(key)} style={{
                        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                        padding: '6px 8px', borderRadius: 8, border: 'none',
                        background: activeLayers[key] ? `${color}15` : 'transparent',
                        cursor: 'pointer', marginBottom: 2,
                    }}>
                        <div style={{
                            width: 16, height: 16, borderRadius: 4,
                            border: `2px solid ${activeLayers[key] ? color : 'var(--text3)'}`,
                            background: activeLayers[key] ? color : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, color: '#fff',
                        }}>
                            {activeLayers[key] ? '✓' : ''}
                        </div>
                        <Icon size={12} style={{ color: activeLayers[key] ? color : 'var(--text3)' }} />
                        <span style={{ fontSize: 12, color: activeLayers[key] ? 'var(--text1)' : 'var(--text3)', fontWeight: 500 }}>{label}</span>
                    </button>
                ))}
            </div>

            {/* Legend */}
            <div style={{
                position: 'absolute', bottom: 24, left: 16, zIndex: 1000,
                background: 'rgba(8,13,26,0.9)', borderRadius: 10, padding: '10px 14px',
                border: '1px solid var(--border)', backdropFilter: 'blur(16px)',
            }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase' }}>Flood Severity</div>
                {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
                    <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                        <span style={{ fontSize: 11, color: 'var(--text2)', textTransform: 'capitalize' }}>{sev}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
