from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from app.db import init_db_pool, close_db_pool
from app.routes import auth, zones, readings, commands, incidents, debug, nl_report
from app.dependencies import require_admin
from app.background import auto_resolve_incidents
from app.ws_manager import manager
from app.ml_predictor import load_model

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db_pool()
    load_model()
    task = asyncio.create_task(auto_resolve_incidents())
    yield
    # Shutdown
    task.cancel()
    await close_db_pool()

app = FastAPI(title="Sentinel Core API", lifespan=lifespan)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(zones.router, prefix="/api/zones", tags=["zones"])
app.include_router(readings.router, prefix="/api/zones/{zone_id}/readings", tags=["readings"])
app.include_router(commands.router, prefix="/api/zones/{zone_id}/commands", tags=["commands"])
app.include_router(incidents.router, prefix="/api/incidents", tags=["incidents"])
app.include_router(debug.router, prefix="/api/debug", tags=["debug"])
app.include_router(nl_report.router, prefix="/api/nl-report", tags=["nl-report"])

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    import logging
    logger = logging.getLogger("ws_endpoint")
    await manager.connect(websocket)
    logger.info(f"WS connected, active={len(manager.active_connections)}")
    try:
        while True:
            # We don't expect messages from the client in this broadcaster,
            # but we need to keep the connection open and listen for disconnects.
            await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info("WS client disconnected normally")
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WS unexpected error: {type(e).__name__}: {e}")
        manager.disconnect(websocket)




@app.get("/health")
async def health_check():
    return {"status": "ok"}

# Example protected endpoint
@app.get("/api/admin-only", dependencies=[Depends(require_admin)])
async def admin_only_test():
    return {"message": "You are an admin"}
