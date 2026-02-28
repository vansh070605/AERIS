import { useEffect, useRef } from 'react';
import { useEmergencyStore, useResourceStore, useUIStore } from '../store';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export function useWebSocket(clientId = `client_${Date.now()}`) {
    const wsRef = useRef(null);
    const { addEmergency, updateEmergency } = useEmergencyStore();
    const { updateResource } = useResourceStore();
    const { setWsConnected, addNotification } = useUIStore();
    const reconnectTimer = useRef(null);

    const connect = () => {
        try {
            const ws = new WebSocket(`${WS_URL}/ws/${clientId}?room=main`);
            wsRef.current = ws;

            ws.onopen = () => {
                setWsConnected(true);
                console.log('[WS] Connected');
                if (reconnectTimer.current) {
                    clearInterval(reconnectTimer.current);
                    reconnectTimer.current = null;
                }
            };

            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    handleMessage(msg);
                } catch (e) {
                    console.warn('[WS] Parse error:', e);
                }
            };

            ws.onclose = () => {
                setWsConnected(false);
                console.log('[WS] Disconnected — reconnecting...');
                if (!reconnectTimer.current) {
                    reconnectTimer.current = setTimeout(connect, 3000);
                }
            };

            ws.onerror = (err) => {
                console.warn('[WS] Error:', err);
                ws.close();
            };
        } catch (e) {
            console.error('[WS] Connection failed:', e);
        }
    };

    const handleMessage = (msg) => {
        switch (msg.type) {
            case 'new_emergency':
                addEmergency(msg.data);
                addNotification({
                    type: 'emergency',
                    severity: msg.data.severity,
                    message: `New ${msg.data.type} emergency | Severity: ${msg.data.severity?.toUpperCase()}`,
                    id: msg.data.id,
                });
                break;

            case 'dispatch_update':
                if (msg.data.emergency_id) {
                    updateEmergency(msg.data.emergency_id, { status: 'dispatched' });
                }
                addNotification({
                    type: 'dispatch',
                    message: `Emergency #${msg.data.emergency_id} dispatched to ${msg.data.resource?.name}`,
                });
                break;

            case 'resource_update':
                if (msg.data.id) {
                    updateResource(msg.data.id, msg.data);
                }
                break;

            default:
                break;
        }
    };

    useEffect(() => {
        connect();

        // Heartbeat
        const heartbeat = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send('ping');
            }
        }, 30000);

        return () => {
            clearInterval(heartbeat);
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            wsRef.current?.close();
        };
    }, []);

    return {
        send: (msg) => wsRef.current?.send(JSON.stringify(msg)),
        connected: wsRef.current?.readyState === WebSocket.OPEN,
    };
}
