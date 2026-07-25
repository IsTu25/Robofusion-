from fastapi import APIRouter, Depends
from app.middleware import verify_zone_api_key, ZoneContext
from app.cache import get_zone_actuation

router = APIRouter()

@router.get("/")
async def get_commands(zone_id: int, zone: ZoneContext = Depends(verify_zone_api_key)):
    # Very fast memory read - no database hit!
    # ensure zone_id from path matches the authenticated zone.id
    if zone.id != zone_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Zone ID mismatch")
        
    return get_zone_actuation(zone.id)
