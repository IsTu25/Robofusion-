from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg
from app.db import get_db
from app.dependencies import get_current_user, require_admin, UserContext
from pydantic import BaseModel
from app.cache import update_zone_actuation
from app.ws_manager import manager

class OverrideRequest(BaseModel):
    duration_minutes: int
    target_status: str
router = APIRouter()

@router.get("/")
async def list_zones(current_user: UserContext = Depends(get_current_user), db: asyncpg.Connection = Depends(get_db)):
    zones = await db.fetch("""
        SELECT id, name, status, is_active, override_until, override_target_status, last_reading_at 
        FROM zones 
        WHERE is_active = true
        ORDER BY id ASC
    """)
    return {"zones": [dict(z) for z in zones]}

@router.delete("/{zone_id}")
async def delete_zone(zone_id: int, admin: UserContext = Depends(require_admin), db: asyncpg.Connection = Depends(get_db)):
    # Check for active incidents
    active = await db.fetchrow(
        "SELECT id FROM incidents WHERE zone_id = $1 AND status IN ('ACTIVE', 'ACKNOWLEDGED')",
        zone_id
    )
    if active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete zone with active incidents"
        )
    
    # Soft delete
    res = await db.execute("UPDATE zones SET is_active = false WHERE id = $1", zone_id)
    if res == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Zone not found")
        
    return {"status": "success", "message": "Zone soft-deleted"}

@router.get("/{zone_id}")
async def get_zone(zone_id: int, admin: UserContext = Depends(require_admin), db: asyncpg.Connection = Depends(get_db)):
    zone = await db.fetchrow("""
        SELECT id, name, status, is_active, override_until, override_target_status, last_reading_at,
               threshold_gas, threshold_fire, threshold_water
        FROM zones WHERE id = $1
    """, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return dict(zone)

class ThresholdsRequest(BaseModel):
    threshold_gas: float
    threshold_fire: float
    threshold_water: float

@router.put("/{zone_id}/thresholds")
async def update_thresholds(zone_id: int, payload: ThresholdsRequest, admin: UserContext = Depends(require_admin), db: asyncpg.Connection = Depends(get_db)):
    res = await db.execute("""
        UPDATE zones 
        SET threshold_gas = $1, threshold_fire = $2, threshold_water = $3
        WHERE id = $4
    """, payload.threshold_gas, payload.threshold_fire, payload.threshold_water, zone_id)
    
    if res == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Zone not found")
        
    return {"status": "success", "message": "Thresholds updated"}

@router.post("/{zone_id}/override")
async def override_zone(zone_id: int, payload: OverrideRequest, admin: UserContext = Depends(require_admin), db: asyncpg.Connection = Depends(get_db)):
    if payload.target_status not in ('SAFE', 'WARNING', 'CRITICAL'):
        raise HTTPException(status_code=400, detail="Invalid target status")
    
    # Get old status for broadcast
    old_zone = await db.fetchrow("SELECT status FROM zones WHERE id = $1", zone_id)
    if not old_zone:
        raise HTTPException(status_code=404, detail="Zone not found")
        
    await db.execute("""
        UPDATE zones 
        SET override_until = now() + interval '1 minute' * $1,
            override_target_status = $2,
            status = $2
        WHERE id = $3
    """, payload.duration_minutes, payload.target_status, zone_id)
    
    # Update Cache
    buzzer = payload.target_status in ('CRITICAL', 'WARNING')
    relay = payload.target_status == 'CRITICAL'
    led_red = payload.target_status == 'CRITICAL'
    led_yellow = payload.target_status == 'WARNING'
    led_green = payload.target_status == 'SAFE'
    update_zone_actuation(zone_id, buzzer, relay, led_red, led_yellow, led_green, override_active=True)
    
    # Broadcast
    if old_zone['status'] != payload.target_status:
        await manager.broadcast({
            "type": "ZONE_STATUS_CHANGED",
            "zone_id": zone_id,
            "old_status": old_zone['status'],
            "new_status": payload.target_status,
            "risk_score": 0.0 # Unknown during override, can pass 0
        })
    
    return {"status": "success", "message": f"Zone overridden to {payload.target_status} for {payload.duration_minutes} minutes"}

@router.delete("/{zone_id}/override")
async def clear_override(zone_id: int, admin: UserContext = Depends(require_admin), db: asyncpg.Connection = Depends(get_db)):
    # Clear override in DB
    await db.execute("""
        UPDATE zones 
        SET override_until = NULL, override_target_status = NULL 
        WHERE id = $1
    """, zone_id)
    
    # We don't recalculate risk immediately here, the next sensor reading will naturally fix the status.
    # However, to be safe, we can set cache override_active to false but leave LEDs as they were
    # until the next reading arrives in < 1s.
    from app.cache import get_zone_actuation
    act = get_zone_actuation(zone_id)
    update_zone_actuation(zone_id, act['buzzer'], act['relay'], act['led_red'], act['led_yellow'], act['led_green'], override_active=False)
    
    return {"status": "success", "message": "Zone override cleared"}
