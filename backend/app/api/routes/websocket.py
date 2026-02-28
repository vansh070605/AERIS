"""
WebSocket API Routes
WS /ws/{client_id} - Real-time emergency feed
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.websocket_manager import ws_manager
import logging

router = APIRouter(tags=["WebSocket"])
logger = logging.getLogger(__name__)


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str,
    room: str = Query(default="main"),
):
    """
    WebSocket endpoint for real-time emergency updates.
    Rooms: 'main' | 'dispatch' | 'admin'
    """
    await ws_manager.connect(websocket, client_id, room)
    try:
        while True:
            # Keep connection alive and handle client messages
            data = await websocket.receive_text()
            logger.debug(f"WS message from {client_id}: {data}")

            # Echo back or handle commands
            if data == "ping":
                await ws_manager.send_personal(client_id, {"type": "pong"})
            elif data == "stats":
                await ws_manager.send_personal(client_id, {
                    "type": "stats",
                    "data": ws_manager.get_stats()
                })
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
        logger.info(f"Client {client_id} disconnected")
