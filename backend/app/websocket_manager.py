"""
WebSocket Manager for real-time broadcasting.
Broadcasts emergency updates, dispatch events, and resource status changes.
"""

import json
import logging
from typing import Dict, Set, Any, Optional
from fastapi import WebSocket
from datetime import datetime

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections with room-based broadcasting."""

    def __init__(self):
        # Active connections: {client_id: WebSocket}
        self.active_connections: Dict[str, WebSocket] = {}
        # Room subscriptions: {room: Set[client_id]}
        self.rooms: Dict[str, Set[str]] = {}
        self.connection_count = 0

    async def connect(
        self,
        websocket: WebSocket,
        client_id: str,
        room: str = "main"
    ):
        await websocket.accept()
        self.active_connections[client_id] = websocket

        if room not in self.rooms:
            self.rooms[room] = set()
        self.rooms[room].add(client_id)
        self.connection_count += 1

        logger.info(f"Client {client_id} connected to room '{room}'. Total: {self.connection_count}")

        # Send welcome message
        await self.send_personal(client_id, {
            "type": "connection",
            "status": "connected",
            "client_id": client_id,
            "room": room,
            "timestamp": datetime.utcnow().isoformat(),
        })

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        for room in self.rooms.values():
            room.discard(client_id)
        self.connection_count = max(0, self.connection_count - 1)
        logger.info(f"Client {client_id} disconnected. Total: {self.connection_count}")

    async def send_personal(self, client_id: str, message: dict):
        """Send message to a specific client."""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_text(json.dumps(message))
            except Exception as e:
                logger.warning(f"Failed to send to {client_id}: {e}")
                self.disconnect(client_id)

    async def broadcast(self, message: dict, room: str = "main"):
        """Broadcast message to all clients in a room."""
        if room not in self.rooms:
            return

        dead_clients = set()
        for client_id in list(self.rooms.get(room, set())):
            if client_id in self.active_connections:
                try:
                    await self.active_connections[client_id].send_text(json.dumps(message))
                except Exception:
                    dead_clients.add(client_id)

        for client_id in dead_clients:
            self.disconnect(client_id)

    async def broadcast_all(self, message: dict):
        """Broadcast to all connected clients (all rooms)."""
        for room in list(self.rooms.keys()):
            await self.broadcast(message, room)

    async def broadcast_emergency(self, emergency_data: dict, event_type: str = "new_emergency"):
        """Specialized broadcast for emergency events."""
        await self.broadcast_all({
            "type": event_type,
            "data": emergency_data,
            "timestamp": datetime.utcnow().isoformat(),
        })

    async def broadcast_dispatch(self, dispatch_data: dict):
        """Broadcast dispatch event."""
        await self.broadcast_all({
            "type": "dispatch_update",
            "data": dispatch_data,
            "timestamp": datetime.utcnow().isoformat(),
        })

    async def broadcast_resource_update(self, resource_data: dict):
        """Broadcast resource status change."""
        await self.broadcast_all({
            "type": "resource_update",
            "data": resource_data,
            "timestamp": datetime.utcnow().isoformat(),
        })

    def get_stats(self) -> dict:
        return {
            "active_connections": self.connection_count,
            "rooms": {room: len(clients) for room, clients in self.rooms.items()},
        }


# Global WebSocket manager
ws_manager = ConnectionManager()
