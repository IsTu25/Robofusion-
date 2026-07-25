from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.zone_status_cache = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        if message.get("type") == "ZONE_STATUS_CHANGED":
            zone_id = message.get("zone_id")
            if zone_id:
                self.zone_status_cache[zone_id] = message.get("new_status")
                
        dead_connections = []
        for connection in self.active_connections:
            try:
                import asyncio
                await asyncio.wait_for(connection.send_json(message), timeout=2.0)
            except Exception as e:
                logger.error(f"Error sending message to websocket: {e}")
                dead_connections.append(connection)
                
        for connection in dead_connections:
            self.disconnect(connection)

manager = ConnectionManager()
