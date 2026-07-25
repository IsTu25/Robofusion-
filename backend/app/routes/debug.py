from fastapi import APIRouter, Depends
import asyncpg
from app.db import get_db
from app.ws_manager import manager
router = APIRouter()
@router.get("/ws-id")
async def get_ws_id():
    import sys
    # Find all imported modules that might have 'manager'
    res = {}
    if 'app.ws_manager' in sys.modules:
        res['app.ws_manager'] = id(sys.modules['app.ws_manager'].manager)
    if 'app.main' in sys.modules:
        res['main_active'] = len(sys.modules['app.ws_manager'].manager.active_connections)
    return res
@router.get("/consistency")
async def get_consistency(db: asyncpg.Connection = Depends(get_db)):
    from app.ws_manager import manager
    
    zones = await db.fetch("SELECT id, status, last_reading_at FROM zones")
    
    res = []
    for z in zones:
        zone_id = z['id']
        db_status = z['status']
        mem_status = manager.zone_status_cache.get(zone_id, "UNKNOWN")
        
        res.append({
            "zone_id": zone_id,
            "db_status": db_status,
            "memory_status": mem_status,
            "last_reading_at": z['last_reading_at']
        })
    return {"zones": res}
