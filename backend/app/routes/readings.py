from fastapi import APIRouter, Depends, HTTPException
import asyncpg
from app.db import get_db
from app.middleware import verify_zone_api_key, ZoneContext
from app.schemas import BatchReadingPayload
from app.risk_engine import process_reading

router = APIRouter()

@router.post("/")
async def ingest_readings(
    zone_id: int,
    payload: BatchReadingPayload, 
    zone: ZoneContext = Depends(verify_zone_api_key),
    db: asyncpg.Connection = Depends(get_db)
):
    if zone_id != zone.id:
        raise HTTPException(status_code=403, detail="API key does not match zone_id in path")

    # Process each reading in the batch sequentially
    for reading in payload.readings:
        await process_reading(zone.id, reading, db)
    
    # Fetch the latest actuation state from cache to return to the ESP32
    from app.cache import get_zone_actuation
    actuation = get_zone_actuation(zone.id)
    
    return {
        "status": "success", 
        "processed": len(payload.readings),
        "actuation": actuation
    }
