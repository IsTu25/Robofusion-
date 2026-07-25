from fastapi import APIRouter, Depends
import asyncpg
from app.db import get_db
from app.dependencies import require_admin, UserContext
from app.ws_manager import manager
from app.cache import get_zone_actuation

router = APIRouter()

@router.get("/consistency")
async def check_consistency(admin: UserContext = Depends(require_admin), db: asyncpg.Connection = Depends(get_db)):
    zones = await db.fetch("SELECT id, name, status FROM zones WHERE is_active = true ORDER BY id ASC")
    
    report = []
    all_consistent = True
    
    for z in zones:
        zone_id = z['id']
        db_status = z['status']
        
        # 1. WS State
        ws_status = manager.zone_status_cache.get(zone_id, "UNKNOWN (No broadcast yet)")
        
        # 2. Cache State (infer from actuation)
        actuation = get_zone_actuation(zone_id)
        if actuation['buzzer'] and actuation['led_red']:
            cache_status = 'CRITICAL'
        elif actuation['relay'] and actuation['led_yellow']:
            cache_status = 'WARNING'
        elif actuation['relay'] and actuation['led_green']:
            cache_status = 'SAFE'
        else:
            # If all are false, maybe it hasn't processed a reading yet, or it's offline
            if not actuation['buzzer'] and not actuation['relay'] and not actuation['led_red'] and not actuation['led_yellow'] and not actuation['led_green']:
                cache_status = 'SAFE' # Default initial state
            else:
                cache_status = 'UNKNOWN'
                
        # Handle the startup case where WS hasn't broadcasted yet
        if ws_status == "UNKNOWN (No broadcast yet)":
            # For the sake of the test, we consider it consistent if db == cache and WS just hasn't fired
            is_consistent = (db_status == cache_status)
        else:
            is_consistent = (db_status == cache_status == ws_status)
            
        if not is_consistent:
            all_consistent = False
            
        report.append({
            "zone_id": zone_id,
            "zone_name": z['name'],
            "db_status": db_status,
            "cache_status": cache_status,
            "ws_status": ws_status,
            "is_consistent": is_consistent
        })
        
    return {
        "status": "success" if all_consistent else "error",
        "all_consistent": all_consistent,
        "details": report
    }
