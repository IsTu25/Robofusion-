from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from app.db import get_db
import asyncpg

api_key_header = APIKeyHeader(name="X-Zone-API-Key", auto_error=True)

class ZoneContext:
    def __init__(self, id: int, name: str):
        self.id = id
        self.name = name

async def verify_zone_api_key(api_key: str = Security(api_key_header), db: asyncpg.Connection = Depends(get_db)) -> ZoneContext:
    zone = await db.fetchrow(
        "SELECT id, name FROM zones WHERE api_key = $1 AND is_active = true",
        api_key
    )
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or inactive API Key"
        )
    return ZoneContext(id=zone['id'], name=zone['name'])
